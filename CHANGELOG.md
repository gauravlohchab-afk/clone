# Changelog

## 0.1.0 — 2026-11-04 (unreleased)
### Added
- pnpm monorepo with `config`, `types`, `validation`, `shared`, `ui` packages.
- Brand identity: original mark, wordmark, app icon, tokens, light/dark themes with tested contrast.
- API: Express 5 modular monolith with structured logging, security headers, CORS allowlist, rate limiting, error envelope.
- Auth: registration with age gate, email verification, login by email/username, lockout, refresh rotation with reuse detection, web cookie + CSRF, sessions, login activity, password reset/change, TOTP 2FA with recovery codes, Google ID-token sign-in (needs client IDs).
- Accounts: usernames with availability and suggestions, profiles, interests, onboarding completion, settings, deactivation, scheduled deletion with purge, data export.
- Web: landing, signup, login (+2FA), forgot/reset password, email verification, onboarding, profile, settings (profile, privacy, security, preferences, account), draft legal pages.
- Docs: planning, architecture, brand, schema, API, tracker, roadmap, security, environment, deployment.
