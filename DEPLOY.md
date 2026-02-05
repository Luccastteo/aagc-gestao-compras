# 🚀 Runbook de Deploy - AAGC SaaS

**Versão**: 1.0  
**Última Atualização**: 2026-02-05

---

## 📋 Pré-requisitos

### Desenvolvimento Local
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker e Docker Compose
- Git

### Produção
- Servidor com Docker e Docker Compose
- Domínio configurado (ex: `app.aagc.com`, `api.aagc.com`)
- Certificado SSL (Let's Encrypt via Certbot ou similar)
- PostgreSQL (pode ser container)
- Redis (pode ser container)

---

## 🏗️ Arquitetura de Deploy

```
┌─────────────────┐
│   Load Balancer │  (Nginx/Traefik/CloudFlare)
│   + SSL/TLS     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ WEB  │  │ API  │
│:3000 │  │:3001 │
└──────┘  └───┬──┘
              │
         ┌────┴────┐
         │         │
    ┌────▼───┐ ┌──▼────┐ ┌────────┐
    │Postgres│ │ Redis │ │ Worker │
    │:5432   │ │:6379  │ │ (Queue)│
    └────────┘ └───────┘ └────────┘
```

---

## 📦 Deploy com Docker Compose (Recomendado)

### 1. Preparar Variáveis de Ambiente

#### `.env.production` (root)
```bash
# Ambiente
NODE_ENV=production

# Domínios
FRONTEND_URL=https://app.aagc.com
API_URL=https://api.aagc.com

# Banco de Dados
DATABASE_URL=postgresql://aagc_user:SENHA_SEGURA@postgres:5432/aagc_prod?schema=public

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=GERE_UM_SECRET_SEGURO_DE_64_CARACTERES_AQUI
JWT_EXPIRES_IN=7d

# Rate Limit (produção)
RATE_LIMIT_MAX=60
RATE_LIMIT_TTL=60

# CORS (importante!)
CORS_ORIGINS=https://app.aagc.com

# Swagger (desabilitado em prod)
ENABLE_SWAGGER=false

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@aagc.com

# OpenAI (opcional)
OPENAI_API_KEY=sk-...
```

**⚠️ IMPORTANTE**: Gere secrets fortes!
```bash
# Gerar JWT_SECRET
openssl rand -base64 64

# Ou
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### 2. Docker Compose para Produção

Crie `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:latest
    container_name: aagc-postgres-prod
    environment:
      POSTGRES_USER: aagc_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: aagc_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aagc_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: aagc-redis-prod
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: aagc-api-prod
    env_file:
      - .env.production
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    container_name: aagc-worker-prod
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${API_URL}
    container_name: aagc-web-prod
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Dockerfiles

#### `apps/api/Dockerfile`
```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm build

FROM base AS production
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

#### `apps/worker/Dockerfile`
```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/worker
RUN pnpm build

FROM base AS production
WORKDIR /app
COPY --from=build /app/apps/worker/dist ./dist
COPY --from=build /app/apps/worker/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

#### `apps/web/Dockerfile`
```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/web
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm build

FROM base AS production
WORKDIR /app
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/apps/web/node_modules ./node_modules
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/package.json ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

### 4. Procedure de Deploy

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/aagc-saas.git
cd aagc-saas

# 2. Crie .env.production com variáveis corretas
cp .env.example .env.production
nano .env.production  # Edite as variáveis

# 3. Build das imagens
docker-compose -f docker-compose.prod.yml build

# 4. Rodar migrations (primeira vez)
docker-compose -f docker-compose.prod.yml run --rm api sh -c "cd /app && pnpm prisma migrate deploy"

# 5. Subir os serviços
docker-compose -f docker-compose.prod.yml up -d

# 6. Verificar logs
docker-compose -f docker-compose.prod.yml logs -f

# 7. Verificar health
curl http://localhost:3001/health
curl http://localhost:3001/health/ready

# 8. Acessar aplicação
# Web: http://localhost:3000
# API: http://localhost:3001
# Docs: http://localhost:3001/api/docs (se ENABLE_SWAGGER=true)
```

### 5. Criar Primeiro Usuário Admin

```bash
# Acessar container da API
docker exec -it aagc-api-prod sh

# Rodar seed (cria org demo + usuários demo)
cd /app && pnpm prisma db seed

# Ou criar manualmente via Prisma Studio
pnpm prisma studio
```

**Usuários Demo Criados**:
- `owner@demo.com` / `demo123` (OWNER)
- `manager@demo.com` / `demo123` (MANAGER)
- `operator@demo.com` / `demo123` (OPERATOR)
- `viewer@demo.com` / `demo123` (VIEWER)

**⚠️ IMPORTANTE**: Altere as senhas ou crie novos usuários em produção!

---

## 🌐 Deploy em Cloud (Alternativas)

### Vercel (Web) + Render (API + Worker)

**Web (Vercel)**:
1. Conecte repositório ao Vercel
2. Configure build command: `cd apps/web && pnpm build`
3. Configure variáveis de ambiente: `NEXT_PUBLIC_API_URL`

**API (Render)**:
1. Crie Web Service no Render
2. Build command: `cd apps/api && pnpm install && pnpm build && pnpm prisma generate`
3. Start command: `cd apps/api && pnpm start`
4. Adicione PostgreSQL e Redis add-ons

**Worker (Render)**:
1. Crie Background Worker no Render
2. Build command: `cd apps/worker && pnpm install && pnpm build`
3. Start command: `cd apps/worker && node dist/index.js`

### Fly.io (Full Stack)

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Deploy API
cd apps/api
fly launch --no-deploy
fly secrets set DATABASE_URL=... JWT_SECRET=... REDIS_URL=...
fly deploy

# Deploy Worker
cd apps/worker
fly launch --no-deploy
fly secrets set DATABASE_URL=... REDIS_URL=...
fly deploy

# Deploy Web
cd apps/web
fly launch --no-deploy
fly secrets set NEXT_PUBLIC_API_URL=https://sua-api.fly.dev
fly deploy
```

---

## 🔒 Checklist de Segurança Pré-Deploy

- [ ] **JWT_SECRET** gerado com 64+ caracteres aleatórios
- [ ] **CORS_ORIGINS** configurado para domínio correto
- [ ] **ENABLE_SWAGGER** = `false` em produção
- [ ] **Rate Limit** ativo (60 req/min default)
- [ ] **Helmet** ativo (CSP configurado)
- [ ] **Senhas do banco** fortes (20+ caracteres)
- [ ] **Senhas dos usuários demo** alteradas ou desabilitadas
- [ ] **Logs** não expõem PII (emails, senhas, tokens)
- [ ] **Health endpoints** respondendo (`/health`, `/health/ready`)
- [ ] **Migrations** rodadas com sucesso
- [ ] **Backups** do banco configurados

---

## 🔍 Monitoring e Observability

### Health Checks

```bash
# Liveness (processo vivo?)
curl https://api.aagc.com/health
# Resposta esperada:
# {"status":"ok","timestamp":"...","uptime":123.45,"environment":"production"}

# Readiness (pronto para receber requests?)
curl https://api.aagc.com/health/ready
# Resposta esperada:
# {"status":"ready","timestamp":"...","checks":{"database":true,"redis":true}}
```

### Logs

```bash
# Logs da API
docker logs -f aagc-api-prod

# Logs do Worker
docker logs -f aagc-worker-prod

# Logs do Web
docker logs -f aagc-web-prod
```

### Métricas Recomendadas

- Taxa de requisições por segundo (RPS)
- Latência P50, P95, P99
- Taxa de erro HTTP (4xx, 5xx)
- Uso de CPU e memória
- Tamanho da fila do Worker (BullMQ)
- Conexões ativas no PostgreSQL

**Ferramentas Sugeridas**:
- **Logs**: Datadog, LogDNA, Better Stack
- **Métricas**: Prometheus + Grafana
- **APM**: Sentry, New Relic
- **Uptime**: UptimeRobot, Pingdom

---

## 🆘 Troubleshooting

### API não inicia

```bash
# Verificar logs
docker logs aagc-api-prod

# Problemas comuns:
# 1. DATABASE_URL incorreto
# 2. Migrations não rodadas
# 3. REDIS_URL inacessível
```

### Worker não processa jobs

```bash
# Verificar conexão com Redis
docker exec -it aagc-redis-prod redis-cli ping
# Deve retornar: PONG

# Verificar logs do worker
docker logs aagc-worker-prod
```

### Web não conecta na API

```bash
# Verificar variável NEXT_PUBLIC_API_URL
docker inspect aagc-web-prod | grep NEXT_PUBLIC_API_URL

# Verificar CORS na API
curl -H "Origin: https://app.aagc.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.aagc.com/items
```

### Banco de dados lento

```bash
# Verificar queries lentas
docker exec -it aagc-postgres-prod psql -U aagc_user -d aagc_prod
> SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# Adicionar índices conforme necessário
```

---

## 📈 Rollback

### Rollback com Docker

```bash
# 1. Parar serviços atuais
docker-compose -f docker-compose.prod.yml down

# 2. Checkout da versão anterior
git checkout v1.0.0

# 3. Rebuild e subir
docker-compose -f docker-compose.prod.yml up -d --build
```

### Rollback de Migrations

```bash
# Prisma não tem rollback automático
# Opção 1: Restaurar backup do banco
pg_restore -U aagc_user -d aagc_prod backup.sql

# Opção 2: Criar migration manual de reversão
```

---

## 📞 Suporte

- **Email**: suporte@aagc.com
- **Docs**: https://docs.aagc.com
- **Status Page**: https://status.aagc.com

---

**Última Revisão**: 2026-02-05  
**Autor**: Tech Team AAGC
