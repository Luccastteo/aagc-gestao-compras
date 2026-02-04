# 🚀 AAGC SaaS - Runbook Completo

> **Setup inicial em ~10 minutos** | Multi-tenant Purchase Management SaaS

---

## 📋 Pré-requisitos

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **Docker** + Docker Compose (para Postgres + Redis)
- **Git**
- *Opcional*: **Rust** + **Tauri CLI** (apenas para build desktop)

---

## ⚡ Quick Start (Setup Completo)

### 1️⃣ Clonar e Instalar Dependências

```bash
# Clone o repositório
git clone <seu-repo-url> aagc-saas
cd aagc-saas

# Instalar todas as dependências do monorepo
pnpm install
```

### 2️⃣ Configurar Variáveis de Ambiente

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env

# Worker
cp apps/worker/.env.example apps/worker/.env

# Desktop (opcional - apenas se for rodar/buildar desktop)
cp apps/desktop/.env.example apps/desktop/.env
```

**⚠️ IMPORTANTE**: Edite `apps/api/.env` e configure:
- `JWT_SECRET` (troque para valor seguro em produção)
- `DATABASE_URL` (se não usar Docker padrão)
- `REDIS_URL` (se não usar Docker padrão)
- `RATE_LIMIT_MAX` e `RATE_LIMIT_TTL` (opcional - já tem defaults)
- `PASSWORD_MIN_LENGTH` (opcional - padrão é 10)

### 3️⃣ Subir Infraestrutura (Postgres + Redis)

```bash
docker compose up -d
```

**Validar**:
```bash
docker compose ps
# Deve mostrar postgres e redis como "Up"
```

### 4️⃣ Migrar e Popular Banco de Dados

```bash
# Aplicar migrations
pnpm db:migrate

# Popular com dados demo
pnpm db:seed
```

**Seed cria**:
- Organização "ACME Demo Corp" (slug: `demo-corp`)
- Usuários:
  - `owner@demo.com` / `demo123` (OWNER)
  - `manager@demo.com` / `demo123` (MANAGER)
  - `operator@demo.com` / `demo123` (OPERATOR)
  - `viewer@demo.com` / `demo123` (VIEWER)
- 50+ Items de estoque
- 10+ Fornecedores
- Pedidos de exemplo
- Logs de auditoria

### 5️⃣ Rodar Aplicações em DEV

```bash
# Web + API + Worker (exceto Desktop)
pnpm dev
```

**Aguarde até ver**:
```
@aagc/web:dev:   - Local:        http://localhost:3000
@aagc/api:dev: 🚀 API running on http://localhost:3001
@aagc/worker:dev: ✅ Worker ready and listening for jobs
```

**Acessar**:
- **Web (SaaS)**: http://localhost:3000
- **API**: http://localhost:3001
- **Docs (Swagger)**: http://localhost:3001/api/docs

**Login**: use `manager@demo.com` / `demo123` para ter permissões completas

---

## 🖥️ Desktop (Opcional - Thin Client Tauri)

### Pré-requisitos
- Rust toolchain instalado ([rustup.rs](https://rustup.rs))
- Tauri CLI: `cargo install tauri-cli`

### Rodar Desktop em DEV

```bash
# Opção 1: Apenas Vite (development UI)
pnpm desktop:dev

# Opção 2: Tauri completo (requer Rust)
pnpm -C apps/desktop tauri dev
```

### Build para Windows

```bash
pnpm desktop:build
```

**Output**: `apps/desktop/src-tauri/target/release/bundle/`

---

## 🧪 Testar Implementações

### ✅ Multi-tenant Isolation (E2E)

```bash
cd apps/api
pnpm test
```

**Valida**: 8 testes de isolamento (org A não acessa dados de org B)

### ✅ Rate Limiting (Manual)

```bash
# Teste de rate limit (120 req em 1min)
for i in {1..130}; do curl http://localhost:3001/health; done
# Após ~120 requisições, deve retornar 429 (Too Many Requests)
```

### ✅ Senha Forte (Manual - Web)

1. Acesse http://localhost:3000/login
2. Faça login com `manager@demo.com` / `demo123`
3. Vá em **Configurações** → **Alterar Senha**
4. Tente senha fraca (ex: `senha123`) → deve mostrar requisitos não atendidos
5. Use senha forte (ex: `S3nh@Fort3!`) → deve aceitar

**Requisitos de senha**:
- Mínimo 10 caracteres
- 1 maiúscula + 1 minúscula + 1 número + 1 símbolo
- Não pode ser senha comum (ex: `password`, `123456`, `demo123`)

### ✅ Paginação Server-Side (Manual - API/Swagger)

Acesse http://localhost:3001/api/docs

**Testar**:
- `GET /items?page=1&pageSize=10&search=parafuso`
- `GET /suppliers?page=1&pageSize=5&sortBy=nome&sortOrder=asc`
- `GET /purchase-orders?page=1&pageSize=20`

**Response esperado**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### ✅ Índices Postgres (Verificar)

```bash
cd apps/api
pnpm prisma studio
# Ou conecte ao Postgres e rode:
# SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;
```

### ✅ Suppliers CRUD Completo (Manual - Web)

1. Acesse http://localhost:3000/app/suppliers
2. Clique **Novo Fornecedor** → crie um fornecedor de teste
3. Clique **Editar** em qualquer fornecedor → altere dados → salve
4. Clique **Excluir** em fornecedor de teste → confirme

### ✅ Logs/Audit com Filtros (Manual - Web)

1. Acesse http://localhost:3000/app/audit
2. Filtre por:
   - **Entity**: `Item`
   - **Action**: `CREATE`
   - **Limit**: `10`
3. Navegue paginação (Prev/Next)
4. Clique em log expandido → veja `before`/`after` JSON

### ✅ Worker Jobs (Automático - DEV)

Jobs rodam automaticamente a cada 60s em DEV:
- **inventory_daily_check**: detecta itens críticos, cria alertas/sugestões
- **po_followup**: gera follow-ups para POs SENT > 24h

**Verificar logs**:
```bash
# Verifique o terminal do worker (pnpm dev output)
# Ou consulte banco:
# SELECT * FROM audit_logs WHERE action IN ('JOB_INVENTORY_DAILY_CHECK', 'JOB_PO_FOLLOWUP') ORDER BY "createdAt" DESC LIMIT 10;
```

---

## 📦 Build para Produção

```bash
# Build todos os apps (web + api + worker)
pnpm build

# Testar build localmente
pnpm start
```

---

## 🔒 Segurança - Checklist

| Item | Status | Como Validar |
|------|--------|--------------|
| Multi-tenant 100% | ✅ | `pnpm -C apps/api test` (8 testes) |
| Rate limit Redis | ✅ | Fazer 130 requests `/health` em 1min |
| CSP/Helmet | ✅ | Abrir DevTools → Network → ver headers `Content-Security-Policy` |
| Senha forte | ✅ | Tentar mudar senha com `senha123` (deve falhar) |
| RBAC | ✅ | Login como `viewer@demo.com` → tentar criar item (403) |
| CORS | ✅ | Fazer request de origin diferente → bloqueado |

---

## ⚡ Performance - Checklist

| Item | Status | Como Validar |
|------|--------|--------------|
| Paginação server-side | ✅ | `/items?page=1&pageSize=10` retorna apenas 10 |
| Índices Postgres | ✅ | `EXPLAIN ANALYZE` queries → usar indexes |
| React Query caching | ✅ | Abrir DevTools → React Query Devtools |
| Lazy loading | ✅ | Next.js lazy-load automático |

---

## 🎨 UI/UX - Checklist

| Funcionalidade | Status | Como Testar |
|----------------|--------|-------------|
| Estoque (CRUD) | ✅ | Criar/Editar/Excluir itens |
| Suppliers (CRUD) | ✅ | Criar/Editar/Excluir fornecedores |
| Analisar Estoque | ✅ | Botão "Analisar" → gera alertas/sugestões |
| Gerar PO (sugestões) | ✅ | Botão "Gerar PO a partir de sugestões" |
| Aprovar/Enviar/Receber PO | ✅ | Botões em cada PO |
| Kanban drag & drop | ✅ | Arrastar cards entre colunas |
| Logs paginados | ✅ | Filtrar + paginar logs |
| Import/Export Excel | ✅ | Download template → importar |

---

## 🧭 Estrutura de URLs

### Públicas (não requerem autenticação)
- `/` - Landing page
- `/login` - Login
- `/forgot-password` - Recuperação de senha
- `/reset-password?token=...` - Reset de senha

### Privadas (requerem autenticação)
- `/app` - Dashboard
- `/app/inventory` - Estoque
- `/app/suppliers` - Fornecedores
- `/app/purchase-orders` - Pedidos de Compra
- `/app/kanban` - Quadro Kanban
- `/app/audit` - Trilha de Auditoria
- `/app/integrations` - Integrações (testes de notificações)
- `/app/settings` - Configurações do usuário

---

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Roda web + api + worker
pnpm desktop:dev      # Roda desktop (Vite apenas)

# Base de Dados
pnpm db:migrate       # Aplica migrations
pnpm db:seed          # Popula dados demo
pnpm db:generate      # Gera Prisma client
pnpm db:studio        # Abre Prisma Studio (GUI)

# Build
pnpm build            # Build all apps
pnpm desktop:build    # Build desktop (Windows)

# Testes
pnpm -C apps/api test      # Testes E2E de isolamento multi-tenant
pnpm -C apps/worker test   # Testes do Auto PO

# Limpeza
pnpm clean            # Remove node_modules + dist
docker compose down -v # Remove containers + volumes
```

---

## 🐛 Troubleshooting

### Porta em uso (3000/3001/1420)

**Windows**:
```bash
.\kill-ports.bat
```

**Linux/Mac**:
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Prisma "DLL rename error" (Windows + OneDrive)

Adicione `--skip-generate` ao migrate:
```bash
pnpm -C apps/api prisma migrate dev --skip-generate
pnpm db:generate  # Gera client separadamente
```

### Redis não conecta

```bash
docker compose ps
# Se redis não estiver up:
docker compose up -d redis
```

### Build falha com "Module not found"

```bash
pnpm install  # Re-instala deps
pnpm db:generate  # Regenera Prisma client
```

---

## 📊 Dados de Teste

### Usuários Demo

| Email | Senha | Role | Permissões |
|-------|-------|------|------------|
| `owner@demo.com` | `demo123` | OWNER | Todas |
| `manager@demo.com` | `demo123` | MANAGER | Gerenciar (exceto delete org/users) |
| `operator@demo.com` | `demo123` | OPERATOR | Operar (CRUD itens/POs) |
| `viewer@demo.com` | `demo123` | VIEWER | Apenas visualização |

### Fluxo Completo (Teste End-to-End)

1. **Login** como `manager@demo.com`
2. **Estoque** → "Analisar Estoque" → veja alertas/sugestões
3. **Pedidos** → "Gerar PO a partir de sugestões" → cria DRAFT
4. **Aprovar** PO (DRAFT → APPROVED)
5. **Enviar** PO (APPROVED → SENT) - gera log de comunicação simulada
6. **Kanban** → veja card criado automaticamente
7. **Arrastar** card para "Em Progresso"
8. **Receber** PO (SENT → DELIVERED) - atualiza estoque
9. **Audit** → filtre por `PurchaseOrder` + `RECEIVE` → veja before/after

---

## 🔐 Segurança - Configurações

### Variáveis Críticas (.env)

```env
# JWT (NUNCA commitar chave real)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Rate Limiting
RATE_LIMIT_TTL=60        # segundos
RATE_LIMIT_MAX=120       # DEV: 120, PROD: 60

# Password Policy
PASSWORD_MIN_LENGTH=10   # Sempre requer: A-Z, a-z, 0-9, !@#$%

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:1420  # separados por vírgula
```

### Headers de Segurança

A API aplica automaticamente:
- **Helmet**: CSP, HSTS, XSS Protection
- **CORS**: apenas origens permitidas
- **Rate Limit**: 60-120 req/min por orgId:IP (Redis-backed)

### Multi-Tenancy

- **TODAS** as queries filtram por `organizationId`
- **Testes E2E** garantem isolamento (8 cenários)
- **Helpers**: `TenantSafeRepository` para operações seguras

---

## 📈 Performance - Otimizações

### Server-Side Pagination

**Endpoints**:
- `/items?page=1&pageSize=20&search=parafuso&sortBy=sku&sortOrder=asc`
- `/suppliers?page=1&pageSize=10`
- `/purchase-orders?page=1&pageSize=15`

**Frontend**: automaticamente usa TanStack Query para caching

### Índices Postgres

Índices criados para queries comuns:
- `organizationId + createdAt` (ordenação temporal)
- `organizationId + sku/nome/codigo` (busca)
- `organizationId + status` (filtros)

**Ver índices**:
```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('items', 'suppliers', 'purchase_orders', 'audit_logs')
ORDER BY tablename, indexname;
```

---

## 🤖 Worker Jobs (Background)

### Jobs Automatizados

| Job | Intervalo | Descrição |
|-----|-----------|-----------|
| `inventory_daily_check` | 60s (DEV) / 24h (PROD) | Detecta itens críticos, cria alertas/sugestões |
| `po_followup` | 60s (DEV) / 24h (PROD) | Follow-up POs SENT > 24h |
| `auto_po_generation` | 60s (DEV) / 6h (PROD) | **NOVO!** Gera POs AUTO DRAFT automaticamente |

**Logs**: `/app/audit` → filtrar por `JOB_INVENTORY_DAILY_CHECK`, `JOB_PO_FOLLOWUP` ou `AUTO_PO_*`

### 🆕 Auto PO Generation (Geração Automática de Pedidos)

O sistema agora gera **automaticamente** pedidos de compra em modo DRAFT quando detecta itens críticos.

**Características**:
- **Agressivo**: Executa a cada 60s em DEV, 6h em PROD
- **Determinístico**: Mesma entrada = mesma saída
- **Idempotente**: Não duplica POs na mesma janela de tempo
- **Seguro**: Apenas cria DRAFT, nunca aprova automaticamente

**Regras de resolução de fornecedor**:
1. Fornecedor preferencial do item (`item.supplierId`)
2. Fornecedor padrão da org (`supplier.isDefault = true`)
3. Histórico de POs anteriores para o SKU
4. Item ignorado se sem fornecedor

**Como validar**:
1. Certifique-se de ter itens com `saldo <= minimo`
2. Aguarde a execução do job (60s em DEV)
3. Vá em `/app/purchase-orders` → veja POs com badge **AUTO**
4. Consulte audit logs por `AUTO_PO_CREATED`, `AUTO_PO_UPDATED`

**Configuração** (apps/worker/.env):
```env
AUTO_PO_ENABLED=true          # Habilitar/desabilitar
AUTO_PO_WINDOW_HOURS=6        # Janela de dedupe
AUTO_PO_DEV_INTERVAL_SEC=60   # Intervalo em DEV
```

**Documentação completa**: Veja [AUTO-PO-GUIDE.md](./AUTO-PO-GUIDE.md)

**Testar job**:
```bash
pnpm -C apps/worker test:auto-po
```

### Configurar SMTP/WhatsApp (Produção)

**SMTP** (para emails reais):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-app-password
SMTP_FROM=noreply@aagc.com
```

**Twilio** (WhatsApp/SMS):
```env
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_SMS_FROM=+1234567890
```

---

## 🎯 Critérios de Aceite (Validação Final)

- [ ] `pnpm dev` sobe web + api + worker sem erros
- [ ] Login funciona e gera JWT válido
- [ ] CRUD de Itens/Fornecedores/Pedidos funcional
- [ ] Analisar Estoque gera alertas/sugestões persistidas
- [ ] Gerar PO a partir de sugestões cria DRAFT real
- [ ] Aprovar → Enviar → Receber fluxo completo
- [ ] Kanban drag & drop atualiza status/posição no banco
- [ ] Logs/Audit mostram before/after JSON + paginação
- [ ] Worker jobs rodam automaticamente (verificar logs)
- [ ] Testes E2E passam: `pnpm -C apps/api test` (8/8)
- [ ] Senha fraca (<10 chars) é rejeitada
- [ ] Rate limit bloqueia após threshold (429)
- [ ] Usuário de org B NÃO acessa dados de org A
- [ ] **AUTO PO**: POs AUTO DRAFT são criadas automaticamente para itens críticos
- [ ] **AUTO PO**: Badge "AUTO" aparece em POs automáticas na UI
- [ ] **AUTO PO**: Audit logs registram `AUTO_PO_CREATED`/`AUTO_PO_UPDATED`
- [ ] **AUTO PO**: Idempotência: executar job 2x não duplica POs
- [ ] **AUTO PO**: Testes passam: `pnpm -C apps/worker test:auto-po`

---

## 📚 Próximos Passos (Deploy Produção)

1. **Database**: migre para Postgres gerenciado (AWS RDS, DigitalOcean, Supabase)
2. **Redis**: use Redis gerenciado (AWS ElastiCache, Upstash)
3. **Web**: deploy em Vercel/Netlify (Next.js)
4. **API + Worker**: deploy em Railway/Fly.io/Render (containers)
5. **Desktop**: distribuir `.exe` via releases GitHub ou site próprio
6. **Configurar**:
   - DNS + HTTPS
   - SMTP/Twilio real
   - Sentry/Logging
   - Backups automáticos

---

## 🆘 Suporte

**Logs importantes**:
- API: logs estruturados no stdout (JSON em PROD)
- Worker: `apps/worker` output
- Audit: tabela `audit_logs` (todas mutações)
- Comms: tabela `comms_logs` (emails/WhatsApp simulados)

**Debug checklist**:
1. Docker containers rodando? (`docker compose ps`)
2. Migrations aplicadas? (`pnpm db:migrate`)
3. Seeds populados? (`pnpm db:seed`)
4. Variáveis `.env` corretas?
5. Portas liberadas? (3000/3001/5432/6379)

---

## 📄 Licença & Contato

- **Licença**: Proprietário / MIT (definir)
- **Versão**: 1.0.0
- **Última atualização**: 2026-02-04
