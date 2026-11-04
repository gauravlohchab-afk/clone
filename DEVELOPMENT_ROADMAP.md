# Development roadmap

Each phase ends with its tests green, FEATURE_TRACKER.md updated and a working build.

| Phase | Scope | Exit criteria | Status |
|---|---|---|---|
| 0 | Architecture, brand, design system, planning | Docs, tokens, logo | Done (provisional brand) |
| 1 | Monorepo, shared packages, API foundation, auth, profiles, settings, web auth/onboarding/profile/settings | Integration suite green against a real replica set | In progress — code complete for web + API; integration run pending; mobile is Phase 1b |
| 1b | Expo app: auth, onboarding, profile, settings; secure token store; deep links | Runs on iOS simulator + Android emulator; Maestro smoke flow | Not started |
| 2 | Follows/requests, blocks/mutes, posts (text metadata + media refs), comments, likes, saves, collections, hashtags, mentions, feed v1 ranking, explore, search | Privacy matrix tests (public/private/blocked) pass | Not started |
| 3 | Media pipeline (S3 presign, multipart, sharp, video transcode, thumbnails, CloudFront signed URLs), create-post editor, stories (+ expiry jobs), highlights, reels player | Upload/process/serve E2E against real AWS | Blocked on AWS |
| 4 | Socket.IO gateway, conversations, messages, requests, receipts, typing, presence, notifications, push tokens + Expo push | Authorization tests on every socket event | Not started |
| 5 | Reports, moderation queue, actions with reasons, appeals, admin app with RBAC and audit logs, copyright workflow | Admin cannot act without permission; all actions audited | Not started |
| 6 | Playwright (desktop/tablet/mobile web), mobile E2E, security testing (OWASP ASVS L2 checklist), load tests, Sentry, backups, CI/CD, staging | Critical bugs zero, p95 targets met | Not started |
| 7 | Closed beta, feedback, legal review of policies, store submissions | Legal sign-off, store approval | Not started |
| 8 | Creator monetisation, ads, communities, advanced discovery | — | Not started |

## Feed ranking v1 (Phase 2 design)
Candidates: followed accounts (last 72 h) + interest-matched recommendations. Score = `w_follow·affinity + w_recency·e^(−age/τ) + w_eng·log(1+engagement velocity) + w_interest·interest overlap − w_neg·negative feedback`. Weights live in config, each ranking run logs feature values for offline evaluation, and the ranker is a pure function so it can be A/B tested and unit tested.
