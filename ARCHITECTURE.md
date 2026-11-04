# Architecture

## Shape

```
          ┌──────────── clients ────────────┐
          │ web (Vite/React)  mobile (Expo) │  admin (Vite/React, Phase 5)
          └───────────────┬─────────────────┘
                          │ HTTPS REST /api/v1  ·  Socket.IO (Phase 4)
                ┌─────────▼──────────┐
                │   apps/api         │  Express 5 modular monolith
                │   modules/*        │
                └──┬───────┬──────┬──┘
                   │       │      │
            MongoDB Atlas  Redis  S3 + CloudFront (Phase 3)
                           │
                     BullMQ workers (same codebase, separate process)
```

**Why a modular monolith:** one deployable, one database, transactional consistency, and simple local development. Module boundaries (each module owns its models and exposes services) make it possible to extract a service later (likely candidates: media processing, messaging gateway, feed ranking) without rewriting callers.

## Workspace

| Package | Responsibility |
|---|---|
| `packages/config` | Brand config (provisional name), product limits, interest catalogue, reserved usernames, server env schema |
| `packages/types` | DTOs and API contracts shared by every client and the API |
| `packages/validation` | Zod schemas used by both the API (authoritative) and forms (UX) |
| `packages/shared` | Platform-neutral API client with refresh handling, formatting, age helpers |
| `packages/ui` | Design tokens, Tailwind theme, logo assets, contrast checks |
| `apps/api` | REST API, auth, business logic |
| `apps/web` | Responsive web app |
| `apps/mobile` | Expo app (Phase 1b) |
| `apps/admin` | Admin and moderation console (Phase 5) |

Workspace packages ship TypeScript source; Vite and tsx consume it directly and `tsup` bundles it into the API build.

## API modules

| Module | Phase | Status |
|---|---|---|
| auth (sessions, tokens, 2FA, Google, login activity) | 1 | Implemented |
| users (account, onboarding, deactivation, deletion, export) | 1 | Implemented |
| profiles | 1 | Implemented (follow-aware visibility in Phase 2) |
| settings | 1 | Implemented |
| follows, follow requests, blocks, restricts, mutes | 2 | Not started |
| posts, comments, likes, hashtags, collections, feed, search, explore | 2 | Not started |
| media, stories, highlights, reels | 3 | Not started |
| conversations, messages, notifications, push | 4 | Not started |
| reports, moderation, admin, audit | 5 | Not started |

Each module: `*.model.ts` (Mongoose schema + indexes), `*.service.ts` (business rules, no Express), `*.controller.ts`/`*.routes.ts` (HTTP only), tests in `apps/api/test`.

## Request pipeline

`requestId → pino-http → helmet → CORS allowlist → JSON (100 kB cap) → cookies → global rate limit → route rate limits → Zod validation → authenticate (JWT + live session + account status) → handler → error envelope`.

Express 5 forwards async errors, so handlers throw `AppError`s and the error handler maps them (plus Zod, Mongo duplicate key, body parser errors) to the envelope. Unknown errors are logged with the request id and return a generic 500.

## Authentication model

- Passwords: argon2id (19 MiB, t=2). Unknown accounts still spend a hash to avoid timing enumeration.
- Access token: HS256 JWT, 15 min, audience `access`, claims `sub`, `sid`, `role`. Every request also checks the session is live and the account is not suspended, so logout/reset/suspension take effect immediately. Roles are always read from the database.
- Refresh token: 256-bit random, stored as SHA-256, rotated on every use. Replaying a retired token revokes the session (10 s grace for concurrent tabs returns 409 instead).
- Web: refresh token only in an httpOnly `SameSite=Strict` cookie on `/api/v1/auth`; CSRF double-submit header for cookie-authenticated endpoints. Native: refresh token in the response body, stored in the platform keychain.
- 2FA: TOTP (encrypted at rest with AES-256-GCM), replay protection by time step, 10 single-use recovery codes. MFA bridge token has its own audience and a 5-minute life.
- Lockout: 5 failures lock the account for 15 minutes, doubling up to 24 hours; rate limits per IP and per IP+identifier (Redis-backed when configured).
- Google: ID token verified against configured client IDs. Linking an existing unverified password account removes that password (account pre-hijacking defence).

## Scaling path

1. Horizontal API instances behind a load balancer (stateless; Redis-backed rate limits).
2. Redis cache for hot reads (profiles, session checks) and Socket.IO Redis adapter.
3. BullMQ workers scaled independently for media and fan-out.
4. Feed: start with fan-out-on-read + ranking; move high-follower accounts to hybrid fan-out when needed.
5. Atlas: indexes reviewed per phase; sharding keys considered only when a collection outgrows a replica set.
