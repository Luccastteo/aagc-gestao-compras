# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

AAGC (Agente Administrativo de Gestao de Compras) is a multi-tenant SaaS procurement/inventory management platform. It is a **pnpm + Turborepo monorepo** with three main runtime services: API (NestJS), Web (Next.js), and Worker (BullMQ). See `README.md` and `SETUP.md` for full docs.

### Services

| Service | Port | Start command |
|---------|------|---------------|
| PostgreSQL (pgvector) | 5432 | `docker compose up -d postgres` |
| Redis | 6379 | `docker compose up -d redis` |
| API | 3001 | `pnpm -C apps/api dev` |
| Web | 3002 | `pnpm -C apps/web dev` |
| Worker | (background) | `pnpm -C apps/worker dev` |

Start all three app services at once (excluding desktop): `pnpm dev`

### Important gotchas

- **Prisma schema drift**: The Prisma schema includes `refreshTokenHash` on the User model, but the checked-in migrations do not cover it. Run `pnpm -C apps/api prisma migrate dev --name add_refresh_token_hash --skip-generate` if the column is missing (seed will fail with `P2022` otherwise). After the first run, `pnpm db:migrate` is sufficient.
- **Web `.env` API URL**: The `.env.example` in `apps/web` sets `NEXT_PUBLIC_API_URL=http://localhost:3003`, which is **wrong**. The API runs on port **3001**. Create `apps/web/.env` with `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- **CORS origins**: The API `.env` must include port **3002** in `CORS_ORIGINS` (e.g. `http://localhost:3002,http://localhost:3000`) since the web dev server runs on port 3002.
- **API lint**: The API app has no ESLint config file — `pnpm -C apps/api lint` will fail. This is a pre-existing issue.
- **Web lint**: Next.js 16 removed the `next lint` CLI subcommand — `pnpm -C apps/web lint` will fail. This is a pre-existing issue.
- **Docker in Cloud Agent**: Docker must be started manually (`sudo dockerd &>/tmp/dockerd.log &`) before `docker compose up -d`. Socket permissions may need `sudo chmod 666 /var/run/docker.sock`.

### Standard commands

Refer to `SETUP.md` for the full list. Key shortcuts from root `package.json`:

- `pnpm db:generate` — generate Prisma client
- `pnpm db:migrate` — apply migrations (deploy)
- `pnpm db:seed` — seed demo data (4 users with RBAC roles)
- `pnpm test:api` — run API tests (Jest)
- `pnpm test:web` — run web E2E tests (Playwright, requires browsers installed)

### Test credentials

| Email | Password | Role |
|-------|----------|------|
| owner@demo.com | demo123 | OWNER |
| manager@demo.com | demo123 | MANAGER |
| operator@demo.com | demo123 | OPERATOR |
| viewer@demo.com | demo123 | VIEWER |
