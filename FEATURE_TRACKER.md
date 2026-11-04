# Feature tracker

Statuses: NOT STARTED · IN PROGRESS · IMPLEMENTED · TESTED · BLOCKED. A column is TESTED only when automated tests covering it have passed. Last updated: 2026-11-04.

**Test evidence (2026-11-04):** packages 44 unit tests pass · API 21 unit/HTTP tests pass · web 5 component tests pass · mobile 7 Jest tests pass and iOS + Android bundles export with `expo export` · API integration suite (31 tests across auth and profiles) written but **not yet executed** because the build sandbox cannot download a MongoDB binary. Rows that depend on that suite are IMPLEMENTED, not TESTED.

## Phase 0 — Foundations
| Feature | Frontend | Backend | Database | Integration | Tests | Remaining issues |
|---|---|---|---|---|---|---|
| Monorepo (pnpm workspaces, shared TS config) | IMPLEMENTED | IMPLEMENTED | – | IMPLEMENTED | TESTED | No GitHub repository yet; no lint config |
| Brand config (provisional name) | IMPLEMENTED | IMPLEMENTED | – | IMPLEMENTED | TESTED | Name/domain/trademark unverified; mobile bundle id `app.vyro.dev` is a placeholder until you own one |
| Design tokens, light/dark themes | IMPLEMENTED | – | – | IMPLEMENTED | TESTED | WCAG AA contrast unit-tested; RN theme pending mobile |
| Logo, app icon, wordmark | IMPLEMENTED | – | – | – | – | 1024 px icon, adaptive icon and splash PNGs generated; needs designer review |
| Component library (web) | IMPLEMENTED | – | – | – | IN PROGRESS | Button/Field/Alert/Toggle/Select/Avatar; no Storybook |
| Planning docs | – | – | – | – | – | See docs/PLANNING.md |

## Phase 1 — Accounts
| Feature | Frontend | Backend | Database | Integration | Tests | Remaining issues |
|---|---|---|---|---|---|---|
| Email registration | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Validation + UI tested; DB flow awaiting integration run |
| Minimum age (13) / under-18 private default | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Regional age rules need legal review |
| Email verification | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Real delivery BLOCKED on SMTP/SES (dev logs emails) |
| Login (email or username) | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | UI tested; DB flow awaiting integration run |
| Logout / logout all devices | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | |
| Google sign-in | NOT STARTED | IMPLEMENTED | IMPLEMENTED | BLOCKED | IN PROGRESS | Needs Google OAuth client IDs; web button not added until then; not-configured path TESTED |
| Forgot / reset password | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | |
| Change / set password | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | |
| Password hashing (argon2id) | – | TESTED | – | – | TESTED | |
| Access + refresh tokens, rotation, reuse detection | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | JWT layer TESTED; rotation awaiting integration run |
| Secure cookies + CSRF | IMPLEMENTED | TESTED | – | IMPLEMENTED | TESTED | Cookie flags asserted in integration suite (not yet run) |
| Rate limiting / brute-force lockout | – | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Rate limiter TESTED; lockout awaiting integration run; Redis store in prod |
| Device / session management | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | No geo-IP device naming yet |
| Login activity | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | |
| Two-factor (TOTP + recovery codes) | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | TOTP/recovery crypto TESTED; flow awaiting integration run; UI login step TESTED |
| Username availability + unique usernames | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Schema rules TESTED; no username-change cooldown yet |
| Account deactivation | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | |
| Account deletion (30-day grace) | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | IN PROGRESS | `purgeDueAccounts` exists; scheduled BullMQ job not yet wired |
| Data export (JSON) | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Media archive arrives with Phase 3 |
| Account recovery | IMPLEMENTED | IMPLEMENTED | – | IMPLEMENTED | IN PROGRESS | Via reset email + 2FA recovery codes; no support-assisted recovery |
| Onboarding: welcome, register, verify, username, display name, bio, interests | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | |
| Onboarding: profile picture | NOT STARTED | NOT STARTED | – | BLOCKED | NOT STARTED | Needs media storage (AWS, Phase 3) |
| Onboarding: suggested accounts, feed init | NOT STARTED | NOT STARTED | – | NOT STARTED | NOT STARTED | Phase 2 (needs follows + posts) |
| Profile view (public/private) | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Follower-aware visibility in Phase 2 |
| Edit profile (name, bio, website, location, type, category) | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Schema TESTED |
| Creator / professional accounts | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Insights/tools later |
| Profile sharing | IMPLEMENTED | – | – | IMPLEMENTED | NOT STARTED | Web Share API / clipboard |
| Settings: privacy, interactions, hidden words, theme, language, region, notifications | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IN PROGRESS | Only English UI; enforcement of interaction rules arrives with the features they govern |
| Legal pages (terms, privacy, guidelines) | IMPLEMENTED | – | – | – | – | DRAFTS ONLY — not legally reviewed |
| Mobile app shell (Expo SDK 57, Expo Router, secure token store) | IMPLEMENTED | – | – | IMPLEMENTED | IN PROGRESS | Bundles build for iOS and Android; not yet run on a simulator or device (none in the build sandbox) |
| Mobile auth (welcome, signup, login + 2FA, forgot/reset password) | IMPLEMENTED | – | – | IMPLEMENTED | IN PROGRESS | Login + 2FA screen TESTED with Jest; Google button waits for client IDs |
| Mobile onboarding (verify, username, about, interests) | IMPLEMENTED | – | – | IMPLEMENTED | NOT STARTED | Photo step BLOCKED on media storage |
| Mobile profile + pull-to-refresh + share | IMPLEMENTED | – | – | IMPLEMENTED | NOT STARTED | |
| Mobile settings (edit profile, privacy, security, preferences, account) | IMPLEMENTED | – | – | IMPLEMENTED | NOT STARTED | 2FA setup uses otpauth link + copyable key; data export shares JSON via the system share sheet |
| Mobile deep links (`vyro://verify-email`, `reset-password`, `u/<username>`) | IMPLEMENTED | – | – | IN PROGRESS | NOT STARTED | Emails link to the web app today; https universal/app links BLOCKED on a domain |
| Push notifications | NOT STARTED | NOT STARTED | NOT STARTED | BLOCKED | NOT STARTED | Phase 4; needs EAS project + APNs/FCM |
| Admin app | NOT STARTED | NOT STARTED | – | – | NOT STARTED | Phase 5 |

## Later phases
| Feature | Frontend | Backend | Database | Integration | Tests | Remaining issues |
|---|---|---|---|---|---|---|
| Follow / unfollow / requests / lists / mutuals | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | Phase 2 |
| Block / restrict / mute | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | Phase 2 |
| Posts, comments, likes, saves, collections, hashtags, mentions | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | Phase 2 |
| Feed ranking, explore, search | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | Phase 2 |
| Media uploads (S3 presigned), processing, CDN | NOT STARTED | NOT STARTED | NOT STARTED | BLOCKED | NOT STARTED | AWS account required |
| Stories, highlights, reels | NOT STARTED | NOT STARTED | NOT STARTED | BLOCKED | NOT STARTED | Phase 3, depends on media |
| Messaging (DM, groups, realtime) | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | Phase 4 |
| Notifications + push | NOT STARTED | NOT STARTED | NOT STARTED | BLOCKED | NOT STARTED | Push needs APNs/FCM via Expo |
| Reports, moderation, appeals, admin RBAC, audit logs | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED | Phase 5 |
| Error monitoring (Sentry) | NOT STARTED | NOT STARTED | – | BLOCKED | NOT STARTED | DSN required; structured logging (pino) IMPLEMENTED |
| Deployment | – | – | – | BLOCKED | – | Hosting, Atlas, Redis, domain |
