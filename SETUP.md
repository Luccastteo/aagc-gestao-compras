# AAGC SaaS - Guia de Instalação e Execução

## Requisitos

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Docker** e **Docker Compose**
- **Rust** (para desktop Tauri) - opcional

## Instalação Rápida

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir containers (Postgres + Redis)
pnpm docker:up

# 3. Gerar Prisma Client
pnpm db:generate

# 4. Aplicar migrations
pnpm db:migrate

# 5. Popular banco com dados de demonstração
pnpm db:seed

# 6. Iniciar todos os serviços (API + Web + Worker)
pnpm dev
```

## URLs de Acesso

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Web | http://localhost:3002 | Frontend Next.js |
| API | http://localhost:3001 | Backend NestJS |
| Prisma Studio | http://localhost:5555 | Visualizar banco |

## Contas de Demonstração

| Role | Email | Senha |
|------|-------|-------|
| Owner | owner@demo.com | demo123 |
| Manager | manager@demo.com | demo123 |
| Operator | operator@demo.com | demo123 |
| Viewer | viewer@demo.com | demo123 |

## Comandos Detalhados

### Docker

```bash
# Subir containers
pnpm docker:up

# Parar containers
pnpm docker:down

# Ver logs dos containers
docker-compose logs -f
```

### Banco de Dados

```bash
# Gerar Prisma Client
pnpm db:generate

# Aplicar migrations (produção)
pnpm db:migrate

# Criar nova migration (desenvolvimento)
pnpm db:migrate:dev

# Popular banco com dados demo
pnpm db:seed

# Abrir Prisma Studio (visualizar dados)
pnpm db:studio
```

### Desenvolvimento

```bash
# Iniciar todos os serviços (recomendado)
pnpm dev

# Iniciar apenas API
pnpm -C apps/api dev

# Iniciar apenas Web
pnpm -C apps/web dev

# Iniciar apenas Worker
pnpm -C apps/worker dev
```

### Desktop (Tauri)

```bash
# Pré-requisitos: Rust instalado (https://rustup.rs)

# Desenvolvimento
pnpm desktop:dev

# Build para Windows
pnpm desktop:build
```

### Testes

```bash
# Rodar todos os testes
pnpm test

# Testes da API
pnpm test:api

# Testes do Web (E2E)
pnpm test:web

# Testes E2E completos
pnpm test:e2e

# Teste de isolamento multi-tenant
cd apps/api && pnpm jest tenant-isolation.spec.ts
```

## Variáveis de Ambiente

### apps/api/.env

```env
# Banco de dados
DATABASE_URL="postgresql://aagc:aagc_dev_password@localhost:5432/aagc_db"

# JWT
JWT_SECRET="sua-chave-secreta-super-segura-32-chars"

# Redis
REDIS_URL="redis://localhost:6379"

# OpenAI (opcional - para IA)
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4-turbo-preview"

# SMTP (opcional - para emails reais)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""

# Twilio (opcional - para WhatsApp/SMS reais)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_FROM=""
TWILIO_SMS_FROM=""

# Frontend
FRONTEND_URL="http://localhost:3002"
CORS_ORIGINS="http://localhost:3002"
```

### apps/web/.env

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### apps/worker/.env

```env
DATABASE_URL="postgresql://aagc:aagc_dev_password@localhost:5432/aagc_db"
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
AUTO_PO_ENABLED="true"
ML_DATA_COLLECTION_ENABLED="true"
```

## Fluxo de Compras (MVP)

1. **Login** - Acesse http://localhost:3002/login com uma conta demo
2. **Dashboard** - Visualize resumo do sistema
3. **Estoque** - Veja itens e clique em "Analisar Estoque" para gerar alertas
4. **Sugestões** - O sistema cria sugestões automáticas para itens críticos
5. **Gerar Pedido** - Na página de Pedidos, use "Gerar de Sugestões"
6. **Aprovar** - Manager/Owner aprova o pedido (status: DRAFT → APPROVED)
7. **Enviar** - Manager/Owner envia ao fornecedor (status: APPROVED → SENT)
8. **Receber** - Ao receber, o estoque é atualizado automaticamente (status: SENT → DELIVERED)
9. **Kanban** - Acompanhe visualmente o progresso dos pedidos
10. **Auditoria** - Todas as ações são registradas com before/after

## Jobs do Worker (Agente)

O worker executa jobs automaticamente:

| Job | Intervalo DEV | Intervalo PROD | Descrição |
|-----|---------------|----------------|-----------|
| inventory_daily_check | 60s | 08:00 diário | Detecta itens críticos, cria alertas e sugestões |
| po_followup | 60s | a cada 4h | Faz follow-up de POs sem update há 24h |
| auto_po_generation | 60s | a cada 6h | Gera POs automaticamente para itens críticos |
| ml_data_collection | 60s | 02:00 diário | Coleta dados para ML |

## Arquitetura

```
aagc-saas/
├── apps/
│   ├── api/          # NestJS + Fastify + Prisma
│   ├── web/          # Next.js + React + TailwindCSS
│   ├── worker/       # BullMQ jobs
│   └── desktop/      # Tauri (thin client)
├── docker-compose.yml
└── package.json
```

## Segurança

- **Multi-tenant**: Todas as queries filtram por organizationId
- **RBAC**: Roles (OWNER, MANAGER, OPERATOR, VIEWER) aplicadas via guards
- **Rate Limiting**: 60 req/min por org+IP
- **Helmet**: Headers de segurança
- **CORS**: Apenas origens permitidas
- **Validação**: DTOs com class-validator (API) + Zod (Web)
- **Auditoria**: Logs com before/after para todas as mutações
- **Tokens**: Armazenamento seguro via OS Keychain (Desktop)

## Troubleshooting

### Erro de conexão com banco
```bash
# Verifique se os containers estão rodando
docker ps

# Reinicie os containers
pnpm docker:down && pnpm docker:up
```

### Erro de Prisma
```bash
# Regenere o client
pnpm db:generate

# Reaplique migrations
pnpm db:migrate
```

### Erro no Worker
```bash
# Verifique se Redis está rodando
docker ps | grep redis

# Verifique logs do worker
cd apps/worker && pnpm dev
```

### Desktop não abre
```bash
# Certifique-se que Rust está instalado
rustc --version

# Instale dependências do Tauri
# Windows: Visual Studio Build Tools
# Linux: build-essential, libwebkit2gtk-4.1-dev
# macOS: Xcode Command Line Tools
```

## Produção

Para deploy em produção:

1. Configure variáveis de ambiente de produção
2. Build das aplicações: `pnpm build`
3. Use Docker Compose de produção: `docker-compose -f docker-compose.prod.yml up -d`
4. Configure reverse proxy (Nginx/Traefik)
5. Configure SSL/TLS
6. Configure monitoramento (Sentry, etc)

---

**AAGC SaaS** - Gestão Inteligente de Compras  
Multi-tenant | Seguro | Escalável
