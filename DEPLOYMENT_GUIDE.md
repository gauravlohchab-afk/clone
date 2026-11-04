# Deployment guide

> Not production-ready: Atlas, Redis, SMTP, AWS, Sentry, a domain and legal review are all outstanding (see docs/PLANNING.md §11). This guide describes the target setup.

## Target topology
- **Web**: static build (`pnpm --filter @vyro/web build` → `apps/web/dist`) on S3 + CloudFront (or any static host) with SPA fallback to `index.html`, security headers (CSP, HSTS) at the CDN.
- **API**: container or Node 22 runtime (AWS ECS Fargate / App Runner, Fly.io, Render) — `pnpm --filter @vyro/api build` then `node apps/api/dist/server.js`. At least 2 instances behind a load balancer; set `TRUST_PROXY` to the number of proxies.
- **Workers** (Phase 3+): same image, `node dist/worker.js`, scaled separately.
- **Data**: MongoDB Atlas M10+ in the primary region, Redis with TLS, S3 + CloudFront for media.
- Same-site cookies: host web and API on sibling subdomains (`app.<domain>`, `api.<domain>`) and set `COOKIE_DOMAIN` only if needed, or serve the API under `/api` on the web origin via the CDN.

## Release steps
1. CI green (`.github/workflows/ci.yml`: typecheck, unit, integration with in-memory MongoDB, web build).
2. Build artefacts; run DB index sync in a release job (`autoIndex` is off in production).
3. Deploy API with rolling update; health check `/health`, readiness `/ready`.
4. Deploy web; invalidate `index.html` only (assets are content-hashed).
5. Smoke test signup → verify → onboarding → profile on staging before promoting.

## Backups and recovery
Atlas continuous backup with PITR; quarterly restore drill. S3 versioning + replication (Phase 3). Secrets in a managed store with access logging.
