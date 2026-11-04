# Security checklist

✅ done and tested · 🟡 done, not yet verified by an executed test · ⬜ not yet · ⛔ blocked on external service

## Authentication and sessions
- ✅ argon2id password hashing (OWASP parameters); constant-time behaviour for unknown accounts
- ✅ Password policy (10+ chars, letter + digit); max length 128
- ✅ Short-lived access JWT (15 min, HS256, issuer + audience pinned, algorithm allowlist)
- ✅ MFA bridge token cannot be used as an access token
- 🟡 Refresh token rotation with reuse detection and session revocation
- 🟡 Session check on every request (revocation is immediate); roles loaded from DB, never trusted from token alone
- ✅ httpOnly, SameSite=Strict, path-scoped refresh cookie; Secure enforced in production
- ✅ CSRF double-submit for cookie-authenticated endpoints
- 🟡 Account lockout with exponential back-off; ✅ IP and IP+identifier rate limits
- 🟡 TOTP 2FA, encrypted secret (AES-256-GCM), replay protection, hashed single-use recovery codes
- 🟡 Email verification and password reset tokens: 256-bit, hashed, single-use, expiring; reset revokes all sessions
- ✅ No account enumeration on forgot-password / resend-verification
- 🟡 Google sign-in: audience-checked ID token, verified email required, pre-hijack defence on linking
- ⬜ Breached-password check (HIBP k-anonymity) · ⬜ new-device login email alerts · ⬜ WebAuthn/passkeys

## Input, output, transport
- ✅ Zod validation on every body/query; unknown fields stripped; 100 kB JSON cap
- ✅ Control characters stripped from free text; website URLs restricted to http(s)
- ✅ React escapes output; user links rendered with `rel="noopener noreferrer nofollow ugc"`
- ✅ Helmet headers (API CSP `default-src 'none'`, nosniff, frame-ancestors none); `x-powered-by` off
- ✅ CORS allowlist with credentials
- ⬜ Web app CSP (set at the CDN/hosting layer in Phase 6) · ⬜ HSTS preload (needs domain)

## Authorization and privacy
- 🟡 Users can only read/revoke their own sessions, settings and exports
- 🟡 Public profile hides email/DOB; private accounts hide content from non-approved viewers
- 🟡 Deactivated/deleting accounts hidden from public reads
- ⬜ Block enforcement across every read path (Phase 2) · ⬜ conversation membership checks on every message op (Phase 4)
- ⬜ Admin RBAC + audit log (Phase 5)

## Media (Phase 3)
- ⬜ Presigned uploads only; no AWS credentials on clients · ⬜ MIME + magic-byte validation, size limits · ⬜ EXIF GPS stripping · ⬜ private media through signed CloudFront URLs · ⬜ malware scanning decision

## Abuse
- ✅ Rate limits per route · ⬜ spam heuristics on posts/comments/DMs · ⬜ CAPTCHA/turnstile on registration if abuse appears · ⬜ hidden-word filtering enforcement

## Operations
- ✅ Secrets only from environment, validated at boot; production refuses insecure cookie config, missing SMTP or Redis
- ✅ `.env` files git-ignored; logs redact auth headers, cookies, passwords, tokens, codes
- ✅ Structured logging with request ids
- ⛔ Sentry error monitoring (DSN) · ⛔ Atlas backups (cluster) · ⬜ dependency scanning (Dependabot/`pnpm audit` in CI) · ⬜ penetration test before launch

## Compliance (requires legal review — no compliance is claimed)
- 🟡 Data export, account deletion with grace period, retention TTLs
- ⬜ GDPR/UK GDPR, CCPA/CPRA, India DPDP, LGPD assessments · ⬜ age-assurance requirements per region · ⬜ DMCA/copyright agent registration
