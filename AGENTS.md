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

- **Prisma migrations**: Always run `pnpm db:migrate` before `pnpm db:seed`. If the schema has drifted from migrations, use `pnpm -C apps/api prisma migrate dev` to create new migrations.
- **Web `.env` API URL**: Ensure `apps/web/.env` has `NEXT_PUBLIC_API_URL=http://localhost:3001` (the API default port).
- **CORS origins**: The API `.env` must include port **3002** in `CORS_ORIGINS` (e.g. `http://localhost:3002,http://localhost:3000`) since the web dev server runs on port 3002.
- **API lint**: Uses `@typescript-eslint` via `.eslintrc.cjs`. Run `pnpm -C apps/api lint`.
- **Web lint**: Uses `eslint` directly (Next.js 16 removed `next lint`). Run `pnpm -C apps/web lint`.
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
