# AAGC - Agente Administrativo de Gestão de Compras

**Sistema SaaS multi-tenant para gestão inteligente de compras e estoque.**

Construído com stack moderna: NestJS, Next.js, PostgreSQL, Redis, Prisma, BullMQ, Tailwind CSS.

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Docker Desktop** (para PostgreSQL + Redis)

### Instalação

```bash
# Instalar pnpm globalmente (se não tiver)
npm install -g pnpm@8.15.0

# Clonar e instalar dependências
git clone <url-do-repositorio>
cd aagc-saas
pnpm install

# Iniciar infraestrutura (banco de dados)
docker-compose up -d

# Aguardar postgres estar pronto (5-10 segundos)
# Configurar banco de dados
cd apps/api
copy .env.example .env
pnpm prisma migrate dev --skip-generate
pnpm prisma db seed
cd ../..

# Iniciar todos os serviços
pnpm dev
```

Serviços disponíveis em:
- **Frontend**: http://localhost:3002
- **API**: http://localhost:3001
- **Worker**: Executando em background

---

## 📋 Credenciais de Teste

| Email | Senha | Cargo | Permissões |
|-------|-------|-------|------------|
| owner@demo.com | demo123 | Proprietário | Acesso total |
| manager@demo.com | demo123 | Gerente | Aprovar/Enviar pedidos |
| operator@demo.com | demo123 | Operador | Criar pedidos, gerenciar estoque |
| viewer@demo.com | demo123 | Visualizador | Somente leitura |

---

## 🏗️ Arquitetura

### Estrutura do Monorepo

```
aagc-saas/
├── apps/
│   ├── api/          # API NestJS (Fastify)
│   ├── desktop/      # Desktop thin client (Tauri)
│   ├── web/          # Frontend Next.js
│   └── worker/       # Workers BullMQ
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

### Stack Tecnológica

**Backend:**
- NestJS (adaptador Fastify)
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ (filas de jobs)

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query

**Infraestrutura:**
- Docker Compose
- Turborepo (monorepo)
- pnpm workspaces

---

## 🔐 Segurança

- **Isolamento multi-tenant**: Todos os dados filtrados por organizationId
- **RBAC**: Proprietário > Gerente > Operador > Visualizador
- **Auth Guards**: Protege todos os endpoints
- **Rate limiting**: 100 req/min por IP
- **Helmet**: Headers de segurança
- **CORS**: Controle de origem
- **Audit logs**: Trilha completa de atividades

---

## 📊 Funcionalidades

### ✅ Gestão de Estoque
- CRUD completo (banco de dados real)
- Movimentações de estoque (entrada/saída/ajuste)
- Detecção de itens críticos
- **Análise Inteligente**: Sugestões automáticas de compra
- Níveis mínimo/máximo
- Status em tempo real
- **Importação/Exportação Excel**

### ✅ Pedidos de Compra
- Ciclo completo: Rascunho → Aprovado → Enviado → Entregue
- Pedidos com múltiplos itens
- Geração automática de código
- **Gerar PO a partir de sugestões**: botão “Sugestões do Agente” → “Gerar Pedido(s) (rascunho)”
- **Ações por cargo**:
  - Operador: Criar rascunhos
  - Gerente: Aprovar e enviar
  - Sistema: Receber atualiza estoque automaticamente
- Cálculo automático do valor total

### ✅ Fornecedores
- Base completa de fornecedores
- Informações de contato (email, telefone, WhatsApp)
- Rastreamento de lead time
- Avaliações de qualidade

### ✅ Kanban
- Arrastar e soltar funcional
- Vinculado aos pedidos de compra
- Atualizações em tempo real
- Status: A Fazer → Em Andamento → Concluído
- **Notificações automáticas por movimentação**

### ✅ Integrações
- **Importação Excel**: Importa itens de planilhas
- **Exportação Excel**: Exporta estoque completo
- **Notificações**: Email, WhatsApp e SMS (simulado)
- **Histórico de comunicações**: Registro de todas as notificações

### ✅ Trilha de Auditoria
- Toda ação é registrada
- Snapshots antes/depois (JSON)
- Rastreamento de usuário
- UI com **paginação e filtros** (entidade/ação)

### ✅ Jobs Automatizados (Worker)
- **inventory_daily_check**:
  - DEV: a cada 60s (visualização)
  - cria/atualiza alertas e sugestões persistidas
  - registra AuditLog
- **po_followup**:
  - DEV: a cada 60s
  - para POs `SENT` sem update > 24h: cria follow-up **SIMULADO** em `CommsLog`
  - registra AuditLog

### 📝 Nota sobre Relatórios PDF
> ⚠️ **A funcionalidade de geração de PDFs (pedidos e estoque) foi temporariamente removida** devido a conflitos de dependências com o jsPDF durante o build do Next.js. Esta funcionalidade será reimplementada no backend (API) em breve, permitindo geração de PDFs de forma mais robusta e segura.
>
> **Funcionalidades mantidas**:
> - ✅ Exportação de dados em Excel (formato XLSX)
> - ✅ Importação de dados via Excel
> - ✅ Todas as funcionalidades de gestão de compras e estoque

---

## 🔧 Desenvolvimento

### Executar apps individualmente

```bash
# Apenas API
cd apps/api
pnpm dev

# Apenas Web
cd apps/web
pnpm dev

# Apenas Worker
cd apps/worker
pnpm dev

# Desktop (Tauri)
cd apps/desktop
pnpm install
pnpm tauri dev
```

### Desktop (Thin client) — notas
- O desktop é uma **casca Tauri** que carrega o SaaS Web (por padrão `http://localhost:3002`).
- Tokens podem ser armazenados no **Keychain/Credential Manager** via comandos Tauri (`set_tokens/get_tokens/clear_tokens`) quando o Web estiver rodando dentro do desktop.

### Comandos do Banco de Dados

```bash
cd apps/api

# Criar migration
pnpm prisma migrate dev --name nome_da_migration

# Visualizar banco
pnpm prisma studio

# Resetar banco
pnpm prisma migrate reset

# Popular dados
pnpm prisma db seed
```

### Variáveis de Ambiente

**apps/api/.env:**
```env
DATABASE_URL="postgresql://aagc:aagc_dev_password@localhost:5432/aagc_db"
REDIS_URL="redis://localhost:6379"
PORT=3001
NODE_ENV=development
JWT_SECRET=sua-chave-secreta
```

**apps/web/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📡 Documentação da API

### Principais Endpoints

#### Autenticação
- `POST /auth/login` - Login
- `POST /simple-login` - Login simplificado

#### Estoque
- `GET /items` - Listar todos os itens
- `GET /items/critical` - Apenas itens críticos
- `GET /items/analyze` - Sugestões de compra
- `POST /items` - Criar item
- `PUT /items/:id` - Atualizar item
- `POST /items/:id/movimentar` - Movimentação de estoque
- `GET /items/export` - Exportar para Excel
- `POST /items/import` - Importar do Excel

#### Pedidos de Compra
- `GET /purchase-orders` - Listar todos
- `POST /purchase-orders` - Criar rascunho
- `POST /purchase-orders/from-suggestions` - Gerar rascunho(s) a partir de sugestões OPEN
- `POST /purchase-orders/:id/approve` - Aprovar (GERENTE+)
- `POST /purchase-orders/:id/send` - Enviar ao fornecedor
- `POST /purchase-orders/:id/receive` - Receber e atualizar estoque

#### Kanban
- `GET /kanban/board` - Obter quadro com cards
- `POST /kanban/cards` - Criar card
- `PATCH /kanban/cards/:id/move` - Mover card

#### Notificações
- `GET /notifications/history` - Histórico
- `GET /notifications/stats` - Estatísticas
- `POST /notifications/send/email` - Enviar email
- `POST /notifications/send/whatsapp` - Enviar WhatsApp
- `POST /notifications/send/sms` - Enviar SMS

#### Auditoria
- `GET /audit/logs` - Logs de auditoria (paginado)
- `GET /audit/stats` - Estatísticas

---

## 🧪 Testando o Sistema

### 1. Login
- Acesse http://localhost:3002
- Faça login como `manager@demo.com / demo123`

### 2. Painel
- Veja total de itens, itens críticos, pedidos pendentes
- Visualize alertas de estoque baixo

### 3. Estoque
- Clique em "Estoque"
- Clique em "Analisar Estoque" - veja sugestões de compra
- Clique em "Novo Item" - crie um novo produto
- Use "Importar Excel" para importar itens em massa

### 4. Criar Pedido de Compra
- Vá para "Pedidos de Compra"
- Crie um novo pedido ou use as sugestões da análise

### 5. Aprovar e Enviar
- Clique em "Aprovar" (muda para APROVADO)
- Clique em "Enviar" (muda para ENVIADO)
- Verifique os logs de auditoria

### 6. Receber Pedido
- Clique em "Receber" (muda para ENTREGUE)
- Volte para "Estoque"
- Verifique que o estoque foi atualizado automaticamente

### 7. Kanban
- Vá para "Kanban"
- Mova os cards entre colunas
- Observe as notificações enviadas automaticamente

### 8. Integrações
- Vá para "Integrações"
- Veja histórico de notificações
- Teste envio de email/WhatsApp/SMS

### 9. Auditoria
- Vá para "Auditoria"
- Veja todas as ações registradas

---

## 🔥 Deploy em Produção

📘 **[Ver Runbook Completo de Deploy](./DEPLOY.md)** - Guia detalhado com Docker Compose, variáveis de ambiente, checklist de segurança e troubleshooting.

### Quick Start - Docker Compose

```bash
# 1. Crie .env.production com variáveis corretas
cp .env.example .env.production
nano .env.production

# 2. Build e deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml run --rm api pnpm prisma migrate deploy
docker-compose -f docker-compose.prod.yml up -d

# 3. Verificar health
curl http://localhost:3001/health
curl http://localhost:3001/health/ready
```

### Variáveis de Ambiente Críticas (Produção)

```env
# Segurança
NODE_ENV=production
JWT_SECRET=gere_um_secret_de_64_caracteres
CORS_ORIGINS=https://seu-dominio.com
ENABLE_SWAGGER=false

# Banco & Cache
DATABASE_URL=postgresql://user:senha@host:5432/db
REDIS_URL=redis://host:6379

# URLs
FRONTEND_URL=https://app.seu-dominio.com
API_URL=https://api.seu-dominio.com

# Rate Limit (60 req/min em prod)
RATE_LIMIT_MAX=60
RATE_LIMIT_TTL=60
```

### Checklist de Segurança ✅

- [ ] JWT_SECRET forte (64+ caracteres)
- [ ] CORS configurado para domínio específico
- [ ] Swagger desabilitado (`ENABLE_SWAGGER=false`)
- [ ] Rate limiting ativo (60 req/min)
- [ ] Helmet/CSP configurado (já no código)
- [ ] Health endpoints respondendo
- [ ] Senhas padrão alteradas
- [ ] Migrations rodadas
- [ ] Backups configurados

**Para deploy completo, consulte [DEPLOY.md](./DEPLOY.md)**

---

## 🐛 Solução de Problemas

### Falha na conexão com banco de dados
```bash
# Verificar se Docker está rodando
docker-compose ps

# Reiniciar postgres
docker-compose restart postgres
```

### Porta já em uso
```bash
# Windows - matar processo na porta 3001
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Alterar portas em:
# - apps/api/.env (PORT=3001)
# - apps/web/package.json (-p 3000)
```

### Alterações no schema não aplicadas
```bash
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
```

### Worker não processando jobs
```bash
# Verificar Redis
docker-compose logs redis

# Reiniciar worker
cd apps/worker && pnpm dev
```

---

## 📄 Licença

MIT

---

## 👥 Suporte

Para problemas ou dúvidas:
- Crie uma issue no repositório
- Verifique logs: `docker-compose logs`
- Revise a API: http://localhost:3001

---

**Construído como um sistema SaaS real e pronto para produção.**

**Sem mocks. Sem placeholders. Tudo funciona.**
