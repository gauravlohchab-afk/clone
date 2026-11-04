# Environment setup

## Prerequisites
- Node.js ≥ 22.12 (`.nvmrc`), pnpm 10 (`corepack enable`)
- MongoDB 7+ **running as a replica set** (transactions). Local: `mongod --replSet rs0 --dbpath ./data` then `mongosh --eval "rs.initiate()"`, or a free Atlas cluster.
- Redis 7 (optional locally; required in production)

## First run
```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # fill in the values below
cp apps/web/.env.example apps/web/.env      # optional
pnpm dev                                     # API on :4000, web on :5173 (proxying /api)
```
In development, emails (verification, reset) are printed in the API log when `SMTP_URL` is empty — open the link from there.

## Tests
```bash
pnpm test:unit                                 # all unit tests, no services needed
pnpm --filter @vyro/api test:integration       # starts an in-memory MongoDB replica set
MONGODB_URI_TEST="mongodb://127.0.0.1:27017/vyro_test?replicaSet=rs0" pnpm --filter @vyro/api test:integration
```

## API variables (`apps/api/.env`)
| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | – | development / test / production |
| `PORT` | – | default 4000 |
| `APP_URL` | prod | Web origin used in email links |
| `API_URL` | – | Public API URL |
| `CORS_ORIGINS` | prod | Comma-separated allowed origins |
| `TRUST_PROXY` | prod | Number of proxy hops in front of the API (for correct client IPs) |
| `MONGODB_URI` | ✓ | Atlas SRV string or local replica set URI |
| `REDIS_URL` | prod | Rate limits, queues, socket adapter |
| `JWT_ACCESS_SECRET` | ✓ | ≥ 32 chars random; rotate by deploying a new value (signs everyone out of access tokens only) |
| `ACCESS_TOKEN_TTL_SECONDS` | – | default 900 |
| `REFRESH_TOKEN_TTL_DAYS` | – | default 30 |
| `MFA_ENCRYPTION_KEY` | ✓ | 32-byte hex key for TOTP secrets; **never rotate without re-encryption** |
| `COOKIE_SECURE` | – | defaults to true in production (must be true) |
| `COOKIE_DOMAIN` | – | e.g. `.example.com` when web and API are on sibling subdomains |
| `GOOGLE_CLIENT_IDS` | Google auth | Comma-separated web/iOS/Android OAuth client IDs |
| `SMTP_URL` | prod | e.g. `smtps://USER:PASS@email-smtp.<region>.amazonaws.com:465` |
| `MAIL_FROM` | prod | Verified sender |
| `SENTRY_DSN` | Phase 6 | |
| `LOG_LEVEL` | – | default info |
| `BRAND_NAME` | – | Overrides the provisional name in emails |

Phase 3 will add: `AWS_REGION`, `S3_MEDIA_BUCKET`, `CLOUDFRONT_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY` (secret manager), `MEDIACONVERT_ENDPOINT`. Phase 4: `EXPO_ACCESS_TOKEN`.

## Web variables (`apps/web/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Empty for same-origin (dev proxy or reverse proxy); otherwise the API origin |
| `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE` | Brand overrides |
| `VITE_GOOGLE_CLIENT_ID` | Google web client ID (public value) |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"         # MFA_ENCRYPTION_KEY
```
Never commit `.env` files or paste secrets into source. In deployed environments, inject them from the platform's secret manager (AWS Secrets Manager / SSM, or the host's encrypted env store).
