# API documentation

Base URL: `{API_URL}/api/v1`. JSON request and response bodies. Authenticated routes need `Authorization: Bearer <accessToken>`. Clients send `X-Client-Platform: web|ios|android` (or `platform` in auth bodies).

**Errors** — every failure returns:
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Some fields need attention", "details": [{ "path": "email", "message": "Enter a valid email address" }], "requestId": "…" } }
```
Codes: `VALIDATION_FAILED 400`, `UNAUTHENTICATED 401`, `TOKEN_EXPIRED 401`, `SESSION_REVOKED 401`, `INVALID_CREDENTIALS 401`, `MFA_INVALID 401`, `FORBIDDEN 403`, `EMAIL_NOT_VERIFIED 403`, `ACCOUNT_SUSPENDED 403`, `CSRF_FAILED 403`, `NOT_FOUND 404`, `CONFLICT 409`, `RATE_LIMITED 429`, `ACCOUNT_LOCKED 429`, `NOT_CONFIGURED 503`, `INTERNAL 500`.

**Pagination** — `?limit=1..50&cursor=<opaque>` → `{ items, nextCursor }`.

**Rate limits** — `RateLimit` / `RateLimit-Policy` headers (draft-8). Global 600/min/IP; per-route limits below.

## Health
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/ready` | Mongo/Redis readiness and which integrations are configured |

## Auth — `/auth`
| Method | Path | Auth | Body / query | Result |
|---|---|---|---|---|
| POST | `/register` | – | `email, password, dateOfBirth, acceptTerms: true, platform?, deviceName?` | 201 `AuthSuccess`; verification email sent. 10/h/IP |
| POST | `/login` | – | `identifier` (email or username), `password` | `AuthSuccess` or `{ status: "mfa_required", mfaToken }`. 10/15 min per IP+identifier |
| POST | `/login/mfa` | – | `mfaToken, code` (TOTP or recovery code) | `AuthSuccess` |
| POST | `/google` | – | `idToken, dateOfBirth?` | `LoginResult`; 503 `NOT_CONFIGURED` until client IDs are set |
| POST | `/refresh` | cookie or body | `refreshToken?` (native) | Rotated `AuthSuccess`; 409 if a concurrent refresh just happened |
| POST | `/logout` | optional | `refreshToken?` | 204 |
| POST | `/logout-all` | ✓ | – | 204 |
| POST | `/verify-email` | – | `token` | `{ verified: true }` |
| POST | `/resend-verification` | – | `email` | 202 (no account enumeration) |
| POST | `/forgot-password` | – | `email` | 202 (no account enumeration) |
| POST | `/reset-password` | – | `token, password` | Revokes all sessions |
| POST | `/password` | ✓ | `currentPassword?, newPassword` | Revokes other sessions |
| GET | `/username-availability` | optional | `?username=` | `{ username, available, reason, suggestions[] }` |
| GET | `/sessions` | ✓ | – | `{ items: SessionDto[] }` |
| DELETE | `/sessions/:id` | ✓ | – | 204 |
| GET | `/login-activity` | ✓ | `limit, cursor` | `Page<LoginActivityDto>` |
| POST | `/mfa/setup` | ✓ | – | `{ secret, otpauthUrl }` |
| POST | `/mfa/enable` | ✓ | `code` | `{ recoveryCodes[] }` (shown once) |
| POST | `/mfa/disable` | ✓ | `code, password?` | `{ enabled: false }` |
| POST | `/mfa/recovery-codes` | ✓ | `code` | New `{ recoveryCodes[] }` |

`AuthSuccess = { status: "authenticated", accessToken, accessTokenExpiresAt, refreshToken?, user: MeDto }`. Web responses omit `refreshToken` and set cookies `vyro_rt` (httpOnly, SameSite=Strict, Path=/api/v1/auth) and `vyro_csrf` (readable). Cookie-authenticated `/refresh` and `/logout` require header `X-CSRF-Token` equal to `vyro_csrf`.

## Me — `/me` (all authenticated)
| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/` | – | `MeDto` |
| PUT | `/username` | `username` | `MeDto`; requires verified email; creates the profile on first claim (private by default under 18) |
| PATCH | `/profile` | any of `displayName, bio, website, location, category, accountType, isPrivate` | `ProfileDto` |
| PUT | `/interests` | `interests[]` (1–10 from catalogue) | `ProfileDto` |
| POST | `/onboarding/complete` | – | `MeDto` |
| GET | `/settings` | – | `SettingsDto` |
| PATCH | `/settings` | partial `SettingsDto` (nested partials merge) | `SettingsDto` |
| POST | `/deactivate` | `password?` / `code?` | Hides profile, signs out everywhere; logging in reactivates |
| POST | `/deletion` | `password?` / `code?` | 202 `{ deletionScheduledFor }` (30 days) |
| DELETE | `/deletion` | – | Cancels a scheduled deletion |
| GET | `/export` | – | JSON download of account data (5/h) |

## Users — `/users`
| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/:username` | optional | `PublicProfileDto` (with `viewer.isSelf`, `viewer.canViewContent`); 404 for hidden accounts |

## Planned
Phase 2: `/follows`, `/posts`, `/comments`, `/feed`, `/explore`, `/search`, `/hashtags`, `/collections`. Phase 3: `/media/uploads`, `/stories`, `/reels`, `/highlights`. Phase 4: `/conversations`, `/messages`, `/notifications`, `/push-tokens`, Socket.IO namespace `/rt`. Phase 5: `/reports`, `/admin/*`.
