# VYRO (provisional name)

**Your world. Your energy.** An original social platform for creating, connecting and discovering — web, iOS and Android on one backend.

> Status: Phase 1 (accounts) in progress. Not production-ready. See [FEATURE_TRACKER.md](FEATURE_TRACKER.md) for an honest per-feature status and [docs/PLANNING.md](docs/PLANNING.md) for the plan and the external services still needed.

## Repository
```
apps/api        Express 5 + TypeScript API (modular monolith)
apps/web        React 19 + Vite + Tailwind 4 web app
apps/mobile     Expo app (Phase 1b, not started)
apps/admin      Admin console (Phase 5, not started)
packages/       config · types · validation · shared · ui
infrastructure/ aws · deployment · monitoring (planned)
docs/           planning
```

## Quick start
```bash
corepack enable && pnpm install
cp apps/api/.env.example apps/api/.env    # needs a MongoDB replica set URI and two generated secrets
pnpm dev
```
Web: http://localhost:5173 · API: http://localhost:4000/health. Full details: [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md).

## Scripts
| Command | What it does |
|---|---|
| `pnpm dev` | API + web in watch mode |
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm test:unit` | Unit and component tests (no services) |
| `pnpm --filter @vyro/api test:integration` | API flows against a real MongoDB replica set |
| `pnpm build` | Production builds |

## Documentation
[Architecture](ARCHITECTURE.md) · [Brand](BRAND_GUIDELINES.md) · [Database](DATABASE_SCHEMA.md) · [API](API_DOCUMENTATION.md) · [Roadmap](DEVELOPMENT_ROADMAP.md) · [Security](SECURITY_CHECKLIST.md) · [Environment](ENVIRONMENT_SETUP.md) · [Deployment](DEPLOYMENT_GUIDE.md) · [Changelog](CHANGELOG.md)
