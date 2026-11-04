# Changelog

## 0.1.0 — 2026-11-04 (unreleased)
### Verified
- First CI run on GitHub: all 31 API integration tests pass against an in-memory MongoDB replica set, alongside 77 unit/component tests.

### Added
- Social graph (Phase 2a): follow and unfollow, follow requests for private accounts with an inbox, remove follower, followers/following lists, mutuals, suggested accounts in onboarding, and block, restrict and mute with settings lists. API, web and mobile.
- Mobile app (Expo SDK 57): welcome, signup, login with 2FA, forgot/reset password, email verification and profile deep links, onboarding, profile with pull-to-refresh and sharing, settings (edit profile, privacy, security with 2FA and sessions, preferences, account). Refresh token kept in the Keychain/Keystore.
- App icon, adaptive icon and splash PNGs generated from the mark.
- One React version (19.2.3) across web and mobile; shared `mergeSettings` helper.
- pnpm monorepo with `config`, `types`, `validation`, `shared`, `ui` packages.
- Brand identity: original mark, wordmark, app icon, tokens, light/dark themes with tested contrast.
- API: Express 5 modular monolith with structured logging, security headers, CORS allowlist, rate limiting, error envelope.
- Auth: registration with age gate, email verification, login by email/username, lockout, refresh rotation with reuse detection, web cookie + CSRF, sessions, login activity, password reset/change, TOTP 2FA with recovery codes, Google ID-token sign-in (needs client IDs).
- Accounts: usernames with availability and suggestions, profiles, interests, onboarding completion, settings, deactivation, scheduled deletion with purge, data export.
- Web: landing, signup, login (+2FA), forgot/reset password, email verification, onboarding, profile, settings (profile, privacy, security, preferences, account), draft legal pages.
- Docs: planning, architecture, brand, schema, API, tracker, roadmap, security, environment, deployment.
