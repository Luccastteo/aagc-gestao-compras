# AAGC — Análise Arquitetural Completa

> Escopo desta auditoria: estado atual do monorepo `aagc-gestao-compras` (pnpm/turbo) com `apps/web` (Next), `apps/api` (Nest/Fastify + Prisma), `apps/worker` (BullMQ) e `apps/desktop` (Tauri).
>
> Critério: avaliação **crítica** como se fosse um SaaS multi-tenant rumo a produção (segurança, confiabilidade, escalabilidade, operabilidade e evolução).

## 1. Visão Geral do Sistema

### Stack e apps
- **`apps/web`**: Next.js (App Router) + React + Tailwind, estado/requests com **TanStack Query**, consumo da API via Axios.
- **`apps/api`**: NestJS com adapter **Fastify**, autenticação via JWT (`jsonwebtoken`), validação via `class-validator`, persistência via **Prisma** em **Postgres**, integrações de segurança via `@fastify/helmet` e `@fastify/rate-limit`, Redis via `ioredis`.
- **`apps/worker`**: BullMQ + Redis, executando jobs agendados e gravando efeitos no Postgres via Prisma.
- **`apps/desktop`**: Tauri (webview) que abre o SaaS web e armazena tokens no **keyring** do SO (Credential Manager/Keychain/etc).

### Padrão arquitetural
- **Monorepo** com `pnpm-workspace.yaml` e **Turbo** (`turbo.json`) para orquestrar `dev/build/start`.
- Arquitetura API em módulos Nest (Auth/Items/PO/Kanban/Audit/Suppliers/Notifications).
- Banco multi-tenant modelado por **`organizationId` em praticamente todas as entidades** e **FKs** com cascata.
- Worker separado da API, mas **compartilha DB e Redis** como infraestrutura comum.

### Fluxo geral (request → api → db → worker → logs)
1. **Web** chama API via Axios (`NEXT_PUBLIC_API_URL`), envia `Authorization: Bearer <JWT>`.
2. **API** valida JWT no `AuthGuard` (global) e injeta `request.user` (inclui `organizationId`).
3. Serviços usam Prisma e **filtram por `organizationId`** em listagens e operações por ID (via `findFirst({ where: { id, organizationId } })` em pontos críticos).
4. **Worker** roda jobs recorrentes (BullMQ repeat) por organização, grava:
   - `inventory_alerts` e `purchase_suggestions` via *upsert*
   - `audit_logs` e `comms_logs` (follow-up simulado)
5. **Auditoria** (`audit_logs`) registra ações e snapshots (`before/after` serializados).

## 2. Onde está o "Agente de IA"

### Existe IA de fato?
- **LLM**: **não** há qualquer integração com modelo de linguagem.
- **RAG** (busca + contexto): **não** há pipeline de embeddings, vetores, documentos, nem indexação semântica.
- **Aprendizado/otimização**: **não** há modelos de previsão (demanda/lead time), nem heurísticas calibradas por histórico.

### O que hoje é chamado de “agente”
O “agente” é essencialmente:
- **Automação baseada em regras** (determinística) sobre estoque (mín/máx, saldo, custo unitário).
- **Jobs recorrentes** (BullMQ) que:
  - identificam itens críticos
  - geram/atualizam alertas e sugestões persistidas
  - criam follow-ups (simulados) para POs “parados”

**Conclusão objetiva**: hoje é **automação baseada em regras + scheduler + persistência**. Não é IA (no sentido de LLM/RAG/decisão inteligente). Pode ser descrito como **motor de regras** / **orquestração**.

## 3. Como o agente funciona internamente

### Componentes
- **API**:
  - Endpoint `GET /items/analyze` (restrito a MANAGER/OWNER) recalcula alertas/sugestões via Prisma transaction.
  - Endpoint `POST /purchase-orders/from-suggestions` converte sugestões OPEN em POs DRAFT (agrupadas por fornecedor).
- **Worker**:
  - Fila `inventory_daily_check`: job repeat por org (DEV: a cada 60s; PROD: cron 8h) que faz *upsert* de `InventoryAlert` e `PurchaseSuggestion`.
  - Fila `po_followup`: job repeat por org (DEV: a cada 60s; PROD: cron a cada 4h) que procura POs `SENT` sem update > 24h e cria `CommsLog` SIMULATED (idempotente por janela de 24h).
- **Auditoria**:
  - API e Worker gravam `AuditLog` com `action/entity/entityId/before/after`.

### Passo a passo do fluxo principal (estoque → análise → sugestão → pedido → aprovação → envio → recebimento)
1. **Estoque**: `Item` contém `saldo`, `minimo`, `maximo`, `custoUnitario`, `leadTimeDays`, `supplierId?`.
2. **Análise**:
   - Critério “crítico”: `saldo <= minimo`.
   - Calcula `suggestedQty = max(1, maximo - saldo)` e `estimatedTotal = suggestedQty * custoUnitario`.
   - *Upsert* (por chave única `organizationId + itemId + status`) de:
     - `InventoryAlert` status `OPEN` (e fecha `CLOSED` quando deixa de ser crítico)
     - `PurchaseSuggestion` status `OPEN` (e marca `IGNORED` quando deixa de ser crítico)
3. **Sugestões**: ficam persistidas em `purchase_suggestions` com `snapshot` textual (JSON em string).
4. **Geração de PO** (`/purchase-orders/from-suggestions`):
   - Seleciona sugestões `OPEN` (opcionalmente por `supplierId` e/ou `suggestionIds`).
   - Valida que cada sugestão tem `supplierId` (o schema exige `supplierId` no PO).
   - Agrupa por `supplierId` e cria 1 PO DRAFT por fornecedor.
   - Cria linhas `PurchaseOrderItem` e soma `valorTotal`.
   - Marca sugestões como `USED` e vincula ao PO.
5. **Aprovação/Envio/Recebimento**:
   - Transições são endpoints dedicados (`approve/send/receive`) com RBAC por role.
   - Recebimento tende a atualizar estoque (não detalhado aqui; depende da implementação do service).
6. **Follow-up** (Worker):
   - Para POs `SENT` desatualizados > 24h: cria `CommsLog` (WhatsApp simulado), registra `AuditLog`.

## 4. Análise por Seção do Projeto

### apps/web
**Responsabilidade**
- UI do SaaS (área privada em `/app`) e superfícies públicas/SEO (robots/sitemap/metadata).

**Qualidade do front**
- Padrão simples e funcional: TanStack Query para fetch/cache; páginas predominantemente **Client Components**.
- Existe **acoplamento** entre formato de resposta da API e UI (ex.: migração para paginação quebrou `.filter()`), indicando falta de tipagem/contratos compartilhados.

**Performance**
- Ponto positivo: paginação server-side na API reduz carga.
- Ponto fraco: pages internas são client-heavy; ausência de métricas e de budget de bundle.
- Fontes via `next/font/google` (Inter) → depende de rede (pior para Core Web Vitals em ambientes restritos).

**SEO**
- Implementações presentes: `robots.ts`, `sitemap.ts`, metadata global e `noindex` para `/app`.
- `next.config.js` está mínimo (não há headers/caching/security/perf avançados).
- Seções de marketing reais (pricing/features/docs/blog) podem estar incompletas (o sitemap lista rotas, mas conteúdo/qualidade variam).

**Acessibilidade**
- Não há evidência de “pente fino” sistemático (ex.: focus management em modais, navegação por teclado, reduced motion).
- Ausência de testes automatizados de a11y (ex.: axe em DEV) e checklist de verificação no fluxo real.

**Segurança**
- Tokens no **localStorage** (web) aumentam superfície de XSS (roubo de token).
- A navegação privada valida `userId/user` em localStorage (não valida sessão no mount), podendo gerar estados inconsistentes.
- Melhor prática em SaaS: cookies `HttpOnly` + CSRF (ou estratégia equivalente) para reduzir exfiltração por XSS.

### apps/api
**Arquitetura Nest**
- Estrutura modular clássica Nest; guards globais (`APP_GUARD`) para Auth e Roles.
- Fastify configurado com `bodyLimit` alto (20MB) por importação Excel.

**Segurança**
Pontos fortes:
- Guard global garante que endpoints não marcados como `@Public()` exigem autenticação.
- RBAC por decorator `@Roles(...)` em rotas mutáveis.
- Multi-tenant: uso consistente de `organizationId` em queries por ID em módulos críticos; testes E2E cobrindo vazamento.

Pontos críticos:
- **JWT secret com fallback inseguro**: `JWT_SECRET || 'default-secret-change-in-production'`. Em produção, isso é inaceitável; deve falhar fast se não configurado.
- **Reset/Change password ainda contém validação fraca no service** (`min 6`), apesar de existir validador forte em DTOs. Isso indica **inconsistência** e risco de bypass por caminhos alternativos/refactors futuros.
- **Logs sensíveis**: controller/service logam eventos (email de login, resetUrl em DEV). Sem política de logs/scrubbing.
- **CSP/Helmet e RateLimit com `as any`** no bootstrap. Isso é débito técnico e pode esconder que a configuração real não está como esperado.

**Multi-tenant**
- Modelagem: todas entidades chave têm `organizationId`, com índices e uniques compostos.
- Implementação: serviços usam `findFirst({ where: { id, organizationId } })` e asserts para IDs relacionados.
- Há um `TenantSafeRepository`, mas **não é o único padrão usado** (serviços ainda têm lógica local). Isso cria risco de regressão: novos endpoints podem “esquecer” `organizationId`.

**Validação**
- DTOs com `class-validator` e pipe global com `whitelist/forbidNonWhitelisted/transform`.
- Bom baseline, mas faltam contratos compartilhados e respostas padronizadas (ex.: `PaginatedResponse<T>` no front).

**Endpoints e riscos**
- `AuditService.findAll` aceita `params: any` e usa `limit` sem clamp → pode permitir `limit` muito alto e degradar o DB.
- Ausência de versionamento de API e de políticas claras de erros (`ProblemDetails` / códigos consistentes).

### apps/worker
**Jobs**
- `inventory_daily_check`: upsert de alertas/sugestões e audit log.
- `po_followup`: follow-up simulado em POs `SENT` parados; idempotência por janela (consulta `CommsLog` recente).

**Idempotência**
- Boa no `po_followup` (evita duplicar follow-up nas últimas 24h).
- No `inventory_daily_check`, idempotência é estrutural via *upsert* por chave única.

**Escalabilidade**
- O worker agenda repeat **para cada organização** lendo `organization.findMany()` na inicialização.
  - Em dezenas/milhares de tenants isso pode virar gargalo (tempo de start, cardinalidade de repeat jobs).
  - Recomenda-se separar “scheduler” de “worker executor” ou usar um padrão de *sharding* / *partition* por org.

**Confiabilidade**
- Falta:
  - backoff/retry explícito por job
  - circuit breaker para Postgres/Redis
  - DLQ (dead letter queue) e observabilidade (métricas, tracing)

### apps/desktop (Tauri)
**Papel**
- Thin client “shell” que abre o SaaS web e adiciona **armazenamento seguro de tokens** via keyring.

**É thin client real?**
- Parcialmente.
  - O runtime abre URL configurável por `AAGC_START_URL` (bom).
  - Porém o `tauri.conf.json` ainda está no modelo de app Vite (`devUrl: http://localhost:1420`, `beforeDevCommand: pnpm dev`), e o redirecionamento é feito via `window.eval`.
  - Isso funciona, mas é frágil e pode quebrar com mudanças no webview/tauri.

**Riscos**
- `csp: null` no Tauri → desabilita CSP no desktop (aumenta impacto de XSS dentro do webview).
- `eval` para redirecionamento é um cheiro arquitetural (mesmo que o conteúdo seja controlado).
- Atualizações/telemetria/assinatura de releases não estão definidas (requisitos comuns em desktop corporativo).

### Banco (Prisma/Postgres)
**Modelagem**
- Multi-tenant por `Organization` com `User`, `Item`, `Supplier`, `PurchaseOrder`, `Kanban`, `AuditLog`, `CommsLog`, `InventoryAlert`, `PurchaseSuggestion`.
- Boas constraints:
  - unique composto `organizationId + sku` e `organizationId + codigo` evita colisões cross-tenant.
  - `@@index` em `organizationId` amplamente presente.

**Índices**
- Existe migration com índices voltados a paginação e filtros (`organizationId + createdAt/status/campos`).
- Não há `pg_trgm` habilitado por padrão (mas há comentário opcional).

**Gargalos potenciais**
- `AuditLog.before/after` e snapshots em string `@db.Text` (não `jsonb`) → consultas por campos internos são inviáveis; storage pode crescer rapidamente.
- Falta política de retenção/particionamento para logs (essencial em produção).
- `Movement` não tem `organizationId` direto (depende do Item). Isso é ok, mas complica queries multi-tenant diretas em movimentos.

## 5. Segurança (classificação)

### Autenticação e sessão
- **Status: Médio**
  - JWT ok para stateless, mas:
    - secret default inseguro
    - refresh token não tem revogação real
    - tokens no localStorage no web (XSS impacta tudo)

### RBAC (roles)
- **Status: Bom**
  - Guard global + decorator por rota é um padrão sólido.
  - Pontos faltantes: matriz de permissões formal + testes e2e por role para rotas sensíveis.

### Isolamento multi-tenant
- **Status: Bom (com risco de regressão)**
  - Há testes e2e cobrindo vazamentos em entidades críticas.
  - Risco: padrão não totalmente centralizado (repo helper existe, mas não é obrigatório).

### Rate limit
- **Status: Médio**
  - Redis-backed existe.
  - Risco arquitetural: `keyGenerator` usa `req.user?.organizationId`, mas o rate-limit é plugin Fastify registrado no bootstrap; em muitos setups, ele roda **antes** do guard Nest preencher `request.user`. Resultado prático: rate limit pode ficar **apenas por IP**, não por org.

### CSP / Helmet
- **Status: Médio → Crítico no desktop**
  - API: CSP em prod permite `unsafe-inline`, o que reduz proteção contra XSS.
  - Desktop: CSP nulo (`csp: null`) é **crítico** para um webview que carrega conteúdo web autenticado.

### Dados sensíveis e logs
- **Status: Médio**
  - `AuditLog` armazena snapshots completos (potencial PII/segredos dependendo do payload).
  - Logs em console sem sanitização/correlação.

## 6. Performance
- **Paginação**: implementada no backend para `items/suppliers/purchase-orders` e refletida no front (ponto positivo).
- **Índices**: adicionados para padrões de query (bom baseline).
- **Cache**:
  - Front: TanStack Query (cache client).
  - API: não há cache (Redis usado para rate limit e filas).
- **Jobs vs requests**:
  - Cálculo de sugestões/alertas existe tanto via API (`/items/analyze`) quanto worker (duplicação de lógica).
- **Core Web Vitals**: não há budget/medição automatizada; fontes externas e pages client-heavy podem prejudicar.

## 7. Escalabilidade
- **Horizontal scale**:
  - API é praticamente stateless (ok), mas sem rate limit realmente “por org” pode sofrer abuso por tenant.
- **Filas e Redis**:
  - BullMQ escala bem, porém o modelo “repeat job por org” pode explodir cardinalidade.
- **Cloud readiness**:
  - Docker para infra (Postgres/Redis) existe.
  - Falta: observabilidade, config por ambiente, secrets management, migrações em pipeline, readiness/liveness endpoints consistentes, CI/CD.

## 8. Integração com n8n

### É possível?
Sim, tecnicamente é viável e faz sentido para “orquestração” (aprovações, comunicação, integrações ERP/WhatsApp/Email).

### Arquitetura recomendada
**Evite polling** pesado no DB. Prefira eventos:
- **Outbox pattern** no Postgres:
  - tabela `integration_outbox` (orgId, eventType, payload jsonb, createdAt, processedAt)
  - API escreve eventos transacionais junto com a mudança de estado (ex.: PO aprovado).
  - Worker/dispatcher publica para webhooks do n8n.
- Alternativa: publicar eventos em **Redis Streams** ou uma fila dedicada (BullMQ) “integration_events”.

### Webhook vs polling
- **Webhook** (recomendado): n8n recebe evento em tempo real.
- **Polling**: apenas para compatibilidade, com endpoints “delta” e paginação por cursor.

### Triggers sugeridos (exemplos reais)
- `purchase_order.created`
- `purchase_order.status_changed` (DRAFT→APPROVED→SENT→DELIVERED)
- `inventory.alert.opened` / `inventory.alert.closed`
- `purchase_suggestion.opened` / `purchase_suggestion.used`
- `comms.sent` / `comms.failed`

### Endpoints/filas para suportar n8n (mínimo)
- **API**:
  - `POST /integrations/webhooks/:provider` (receber callbacks)
  - `GET /integrations/events?since=...` (fallback polling)
  - `POST /integrations/n8n/test` (health/test)
- **Worker**:
  - fila `integration_dispatch` com retry/backoff
  - assinatura HMAC para webhooks (segurança)

### Payload de exemplo (status_changed)
```json
{
  "event": "purchase_order.status_changed",
  "organizationId": "org_uuid",
  "occurredAt": "2026-02-04T12:34:56.000Z",
  "data": {
    "purchaseOrderId": "po_uuid",
    "code": "PO-2026-001",
    "from": "DRAFT",
    "to": "APPROVED",
    "total": 1234.56,
    "supplier": { "id": "sup_uuid", "name": "Fornecedor X" }
  }
}
```

## 9. O sistema atende o objetivo original?
Pergunta: **“Isso já é um agente de IA que compra automaticamente?”**

**Resposta: parcialmente (como automação), não (como IA).**

### O que já existe
- Motor de regras para estoque crítico (mín/máx) gerando alertas e sugestões persistidas.
- Conversão de sugestões em PO DRAFT (semi-automático).
- Scheduler (BullMQ) e follow-up (simulado) para POs parados.

### O que falta para “comprar automaticamente” com segurança
- Aprovação automática com políticas (limite por valor, fornecedor preferencial, risco, SLA).
- Integrações reais de envio (email/whatsapp) e recebimento/EDI/ERP.
- Detecção de exceções (preço fora do histórico, ruptura, fornecedor sem contato).
- Observabilidade e trilha de auditoria “enterprise” (imutabilidade, retenção, compliance).

### O que falta para virar IA real (LLM/RAG/decisão inteligente)
- LLM para:
  - interpretar contexto/observações
  - gerar mensagens e justificativas de compra
  - suportar “assistente” conversacional interno
- RAG:
  - base de conhecimento (contratos, histórico, política de compras)
  - busca semântica de fornecedores/itens
- Modelos/heurísticas avançadas:
  - previsão de demanda (sazonalidade)
  - estimação de lead time por fornecedor
  - otimização de lote (EOQ) e custo total

## 10. Lacunas críticas (produção/enterprise)

### Segurança (críticas)
- JWT secret com fallback default (deveria falhar se ausente).
- Tokens no localStorage (web) + desktop com CSP nulo.
- Rate limit “por org” possivelmente não efetivo (ordem de execução do plugin vs guard).

### Operabilidade
- Sem métricas/tracing (OpenTelemetry), sem Sentry/alerts, sem dashboards.
- Logs de console sem correlação (requestId/traceId).
- Sem políticas de retenção/cleanup para `audit_logs`, `comms_logs`, `snapshots`.

### Confiabilidade
- Jobs sem retry/backoff explícito; sem DLQ; sem monitoramento (Bull Board).
- Scheduler por org escala mal para muitos tenants.

### Produto/Processo
- “Integrações” ainda parecem superficiais (n8n/ERP/WhatsApp empresarial).
- Políticas e governança do “agente” não estão formalizadas (quem autoriza, limites, exceções).

## 11. Roadmap recomendado

### Curto prazo (MVP real, 2–4 semanas)
- **Segurança**:
  - Remover secret default e exigir `JWT_SECRET`.
  - Migrar tokens web para **cookies HttpOnly** (e CSRF).
  - Revisar Helmet/CSP (API e principalmente Desktop) e remover `csp: null` no Tauri.
  - Corrigir inconsistência de senha forte também no `AuthService` (não só DTO).
- **Operabilidade**:
  - Health endpoints, logs estruturados, requestId.
  - BullMQ dashboard em DEV/ops.
- **Contratos**:
  - Tipos compartilhados (ou OpenAPI client) para evitar que paginação quebre o front.

### Médio prazo (SaaS robusto, 1–3 meses)
- **Eventos/Integrações**:
  - Outbox + dispatcher (n8n/webhooks).
- **Escala**:
  - Separar scheduler (repeat) do executor; particionar por org; limites por plano.
- **Dados**:
  - `audit_logs` em `jsonb` (ou armazenar diffs) + retenção/particionamento.
- **Segurança avançada**:
  - rotação de JWT keys, revogação de refresh token, device sessions.

### Longo prazo (IA + automação inteligente, 3–9 meses)
- **Camada de “Decision Intelligence”**:
  - modelos de demanda, lead time e risco
  - simulação/what-if e explicabilidade
- **LLM/RAG**:
  - chat interno (com permissões/tenant isolation)
  - geração de mensagens e análise de exceções
  - políticas de compras consultáveis via RAG

## 12. Nota final do sistema (0–10)

| Dimensão | Nota | Observação |
|---|---:|---|
| Arquitetura | 7.0 | Monorepo coerente, módulos claros; faltam contratos/observabilidade e alguns acoplamentos. |
| Segurança | 5.5 | Multi-tenant ok, mas JWT secret default + token em localStorage + CSP nulo no desktop são riscos grandes. |
| Performance | 7.0 | Paginação e índices melhoram bastante; faltam budgets, cache server-side e medição contínua. |
| Escalabilidade | 6.0 | API stateless, filas existem; scheduler por org e ausência de observabilidade limitam. |
| “Agente de IA real” | 2.0 | Hoje é automação determinística (regras + jobs). IA/LLM/RAG não existe ainda. |

