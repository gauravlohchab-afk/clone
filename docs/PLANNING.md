# VYRO — Phase 0 planning deliverables

Status date: 2026-11-04. This document answers the twelve planning items from the master brief. Detailed references live in the root documents linked below.

## 1. Repository analysis

- No existing VYRO repository was found among the GitHub repositories available to this workspace, and no local project was connected. The work therefore started as a **greenfield monorepo**; nothing was overwritten.
- Build environment: Node 22.23, pnpm 10.28, Git 2.43, Redis 7.0 available locally. No Docker daemon.
- MongoDB: the official MongoDB download host is blocked from the build sandbox, so integration tests (which need a real replica set) could not be executed there. They run anywhere `mongodb-memory-server` can download a binary (developer machines, GitHub Actions) or against `MONGODB_URI_TEST`.
- Dependency policy: latest stable releases within major versions that have been in wide use for months (TypeScript 5.9, Vite 7, React 19, React Router 7, Express 5, Mongoose 8, Zod 4, Vitest 3). Brand-new majors released in the last weeks (TypeScript 7, Vite 8, Mongoose 9, Vitest 5) were deliberately not adopted yet.

## 2. Product architecture

A **modular monolith**: one Express API with strict module boundaries, one MongoDB database, Redis for rate limits, caches and queues, S3 + CloudFront for media. Clients (web, iOS, Android, admin) share types, validation and the API client through workspace packages. See [ARCHITECTURE.md](../ARCHITECTURE.md).

## 3. Brand identity proposal

Original mark (a V cut from two planes with a coral "spark"), Space Grotesk + Inter, Electric Lime / Vivid Violet / Coral on Ink and Paper, dark-first with an accessible light theme. All brand strings are configurable because the name is provisional. See [BRAND_GUIDELINES.md](../BRAND_GUIDELINES.md).

## 4. Web application structure

`apps/web` — Vite + React 19 + Tailwind 4 + React Router 7 + Zustand + React Hook Form/Zod + Framer Motion + Lucide.

```
src/
  components/   Button, Field, Alert, Avatar, Logo, AppShell (left rail / bottom bar), Guards
  pages/        Landing, Signup, Login, ForgotPassword, ResetPassword, VerifyEmail, Profile, Legal, NotFound
  pages/onboarding/  multi-step onboarding
  pages/settings/    EditProfile, Privacy, Security, Preferences, Account
  stores/       auth (Zustand), theme
  lib/          api client instance, brand, form error mapping, settings hook
```
Access tokens live in memory; the refresh token is an httpOnly, SameSite=Strict cookie scoped to `/api/v1/auth`, with a double-submit CSRF token.

## 5. Mobile application structure (planned, Phase 1b)

`apps/mobile` — Expo (SDK current stable) + Expo Router + NativeWind + Zustand, sharing `@vyro/types`, `@vyro/validation`, `@vyro/shared` (API client with `TokenStore` backed by `expo-secure-store`) and `@vyro/ui` tokens.

```
app/(auth)/        welcome, signup, login, forgot-password, mfa
app/(onboarding)/  verify, username, about, interests
app/(tabs)/        home, explore, create, reels, profile
app/settings/...   mirrors web settings
app/[username].tsx deep-linkable profiles
lib/ api.ts, secure-token-store.ts, push.ts
```
Universal links / App Links require a real domain (BLOCKED until the domain is secured).

## 6. Backend structure

`apps/api/src/modules/<module>/` with `*.model.ts`, `*.service.ts`, `*.controller.ts` (or inline handlers for small modules), `*.routes.ts`; validation schemas in `@vyro/validation`; DTO types in `@vyro/types`; tests under `apps/api/test/{unit,integration}`. Implemented now: `auth`, `users`, `profiles`, `settings`. Planned modules are listed in ARCHITECTURE.md with their phase.

## 7. Database schema

See [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md): implemented collections (users, profiles, settings, sessions, auth tokens, login events) and the designed schemas for every later collection with indexes, uniqueness and retention.

## 8. API architecture

REST under `/api/v1`, JSON only, cursor pagination, a single error envelope `{ error: { code, message, details?, requestId } }`, Socket.IO (Phase 4) authenticated with the same access token. See [API_DOCUMENTATION.md](../API_DOCUMENTATION.md).

## 9. AWS storage architecture (Phase 3, BLOCKED on AWS account)

- Private S3 bucket `vyro-media-<env>` (Block Public Access on, SSE-S3 or SSE-KMS, versioning on, lifecycle rule aborting incomplete multipart uploads after 1 day and expiring `tmp/` after 1 day).
- Upload flow: client asks the API for an upload intent → API validates type/size quota and returns a presigned PUT (images ≤ 20 MB) or multipart upload (video ≤ 1 GB) for `tmp/<userId>/<uuid>` → client uploads directly to S3 with progress → client confirms → BullMQ job verifies magic bytes, strips EXIF location, generates sizes (sharp) / transcodes to HLS + MP4 fallback and poster frames (AWS MediaConvert or ffmpeg workers) → moves to `media/<mediaId>/...` → Media document marked `ready`.
- Delivery: CloudFront with Origin Access Control in front of the bucket. Public content via cacheable URLs; private-account and DM media via **CloudFront signed URLs/cookies** issued by the API after an authorization check.
- Deletion: Media doc marked `deleted`, S3 objects removed by a job, CloudFront invalidation only when needed.
- Credentials: the API uses an IAM role (no static keys in production); clients never see AWS credentials.

## 10. Development roadmap

See [DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md).

## 11. External service requirements

| Service | Purpose | Needed for | Status |
|---|---|---|---|
| MongoDB Atlas (M10+ replica set) | Primary database | Any deployed environment | BLOCKED — account/cluster not provided |
| Redis (Upstash, ElastiCache or Redis Cloud) | Rate limits, cache, BullMQ queues, Socket.IO adapter | Production (required), dev optional | BLOCKED for deployed envs |
| AWS S3 + CloudFront + IAM (+ MediaConvert) | Media storage, CDN, video transcoding | Phase 3 | BLOCKED |
| Email delivery (AWS SES or similar SMTP) | Verification, password reset, security alerts | Production (required) | BLOCKED |
| Google Cloud OAuth clients (web, iOS, Android) | Google sign-in | Google auth | BLOCKED — code ready, needs client IDs |
| Sentry | Error and performance monitoring | Phase 6 | BLOCKED — DSN not provided |
| Expo / EAS, Apple Developer, Google Play Console | Mobile builds, push (APNs/FCM), store release | Mobile phases | BLOCKED |
| Domain + DNS + TLS | Web hosting, cookies, universal links, email sender domain | Deployment | BLOCKED — name is provisional |
| GIF provider (licensed) | Story GIF stickers | Phase 3 | Not started; requires licence |
| Legal counsel | Terms, privacy policy, regional compliance | Launch | Drafts only |

## 12. Environment variables

See [ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md) for the full table. Secrets are read from the environment (local `.env`, or the deployment secret manager) and are validated at startup by `@vyro/config`; the API refuses to start in production without secure cookies, SMTP and Redis.
