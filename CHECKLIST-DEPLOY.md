# ✅ Checklist de Publicação - AAGC SaaS

**Versão**: 1.0  
**Data**: 2026-02-05

Este checklist garante que todos os aspectos críticos foram verificados antes do deploy em produção.

---

## 🔐 1. SEGURANÇA (CRÍTICO)

### Autenticação & Autorização
- [ ] JWT_SECRET gerado com 64+ caracteres aleatórios (use `openssl rand -base64 64`)
- [ ] JWT_EXPIRES_IN configurado (recomendado: 7d)
- [ ] Senhas padrão alteradas ou usuários demo desabilitados
- [ ] RBAC testado (Viewer não pode aprovar, Operador não pode receber, etc.)
- [ ] Tokens salvos apenas em httpOnly cookies ou localStorage com cuidado

### CORS & Headers
- [ ] `CORS_ORIGINS` configurado para domínio específico (ex: `https://app.aagc.com`)
- [ ] `CORS_ORIGINS` **NÃO** contém `*` (wildcard)
- [ ] Helmet ativo com CSP configurado
- [ ] `crossOriginResourcePolicy` configurado

### Rate Limiting
- [ ] Rate limit ativo (verificar logs: `⚡ Rate limit: ...`)
- [ ] `RATE_LIMIT_MAX` = 60 req/min (produção)
- [ ] Redis funcionando para rate limit distribuído

### API Documentation
- [ ] Swagger **desabilitado** em produção (`ENABLE_SWAGGER=false`)
- [ ] OU protegido por autenticação se necessário
- [ ] Docs alternativas (Postman/Insomnia) disponíveis para devs

### Logs & Monitoring
- [ ] Logs **não** expõem senhas, tokens ou informações sensíveis
- [ ] Emails mascarados em logs (ex: `u***r@example.com`)
- [ ] Structured logging configurado (JSON format)
- [ ] Log level configurado (INFO em prod, DEBUG apenas em dev)

---

## 🗄️ 2. BANCO DE DADOS (CRÍTICO)

### Migrations
- [ ] Todas as migrations rodadas com sucesso (`pnpm prisma migrate deploy`)
- [ ] Prisma Client gerado (`pnpm prisma generate`)
- [ ] Seed **NÃO** rodado em produção (apenas dev/stage)
- [ ] Backup inicial do banco criado

### Conexão
- [ ] `DATABASE_URL` correto e apontando para banco de produção
- [ ] Pool de conexões configurado (default: 10)
- [ ] SSL ativo se banco remoto
- [ ] Credenciais fortes (20+ caracteres)

### Índices & Performance
- [ ] Índices principais criados:
  - [ ] `Item.organizationId`
  - [ ] `PurchaseOrder.organizationId`
  - [ ] `Supplier.organizationId`
  - [ ] `User.email` (unique)
  - [ ] `User.organizationId`
- [ ] Queries lentas identificadas e otimizadas

### Backups
- [ ] Estratégia de backup definida (daily/hourly)
- [ ] Restore testado ao menos uma vez
- [ ] Backup versionado (manter últimos 7 dias)

---

## ⚙️ 3. INFRAESTRUTURA

### Docker & Containers
- [ ] Docker Compose para produção testado
- [ ] Containers com restart policy (`restart: unless-stopped`)
- [ ] Health checks configurados em todos os serviços
- [ ] Logs de containers acessíveis (`docker logs -f`)
- [ ] Volumes persistentes para Postgres e Redis

### Networking
- [ ] Portas expostas apenas as necessárias (3000, 3001)
- [ ] Firewall configurado (permitir apenas 80, 443, SSH)
- [ ] Load balancer configurado (se aplicável)
- [ ] SSL/TLS ativo (Let's Encrypt ou similar)

### DNS
- [ ] `app.aagc.com` → Frontend (porta 3000)
- [ ] `api.aagc.com` → API (porta 3001)
- [ ] Propagação de DNS verificada (use `nslookup`)

---

## 🚀 4. APLICAÇÃO

### Build
- [ ] `pnpm build` executa sem erros
- [ ] `apps/api` compilado com sucesso
- [ ] `apps/web` compilado com sucesso
- [ ] `apps/worker` compilado com sucesso

### Variáveis de Ambiente
- [ ] Todas as variáveis obrigatórias configuradas:
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL`
  - [ ] `REDIS_URL`
  - [ ] `JWT_SECRET`
  - [ ] `CORS_ORIGINS`
  - [ ] `FRONTEND_URL`
  - [ ] `API_URL`
- [ ] Variáveis opcionais configuradas se necessário:
  - [ ] `SMTP_*` (email)
  - [ ] `OPENAI_API_KEY` (AI features)
  - [ ] `SENTRY_DSN` (monitoring)

### Health Checks
- [ ] `/health` responde com status 200
- [ ] `/health/ready` responde com `status: "ready"`
- [ ] Checks verificam:
  - [ ] Conexão com banco
  - [ ] Conexão com Redis (opcional)

### Funcionalidades Críticas
- [ ] Login funciona
- [ ] Criação de itens funciona
- [ ] Criação de fornecedores funciona
- [ ] Criação de pedidos funciona
- [ ] Aprovação de pedidos funciona (gerente)
- [ ] Recebimento de pedidos atualiza estoque
- [ ] Multi-tenant: Org A não vê dados de Org B
- [ ] RBAC: Viewer não pode criar pedidos

---

## 📊 5. MONITORING & OBSERVABILITY

### Logging
- [ ] Logs centralizados (Datadog/LogDNA/Better Stack)
- [ ] Log retention policy definida (30 dias)
- [ ] Alertas configurados para erros 5xx
- [ ] Dashboard de logs acessível

### Métricas
- [ ] APM configurado (Sentry/New Relic/opcional)
- [ ] Métricas básicas coletadas:
  - [ ] RPS (requests per second)
  - [ ] Latência (P50, P95, P99)
  - [ ] Taxa de erro (4xx, 5xx)
  - [ ] Uso de CPU/Memória
- [ ] Alertas configurados para:
  - [ ] CPU > 80%
  - [ ] Memória > 90%
  - [ ] Taxa de erro > 5%

### Uptime Monitoring
- [ ] Uptime monitor configurado (UptimeRobot/Pingdom)
- [ ] Endpoints monitorados:
  - [ ] `https://app.aagc.com` (HTTP 200)
  - [ ] `https://api.aagc.com/health` (HTTP 200)
- [ ] Notificações de downtime configuradas (email/SMS)

---

## 👥 6. PRIMEIRO USO (ONBOARDING)

### Criação de Usuário Admin
- [ ] Primeira organização criada manualmente
- [ ] Primeiro usuário OWNER criado
- [ ] Credenciais compartilhadas de forma segura (1Password/LastPass)
- [ ] Login testado com novo usuário

### Dados Iniciais (Opcional)
- [ ] Fornecedores principais cadastrados
- [ ] Itens principais cadastrados
- [ ] Níveis mínimo/máximo configurados

---

## 📝 7. DOCUMENTAÇÃO

### Documentação Técnica
- [ ] `README.md` atualizado com instruções de deploy
- [ ] `DEPLOY.md` completo e testado
- [ ] `ARCHITECTURE.md` disponível (opcional)
- [ ] Variáveis de ambiente documentadas

### Runbooks
- [ ] Runbook de deploy criado e testado
- [ ] Runbook de rollback criado
- [ ] Runbook de backup & restore criado
- [ ] Runbook de troubleshooting criado

### Contatos de Suporte
- [ ] Email de suporte definido
- [ ] On-call rotation definida (se aplicável)
- [ ] Escalation path definido

---

## 🧪 8. TESTES

### Testes Automatizados
- [ ] Testes unitários rodando (`pnpm test`)
- [ ] Testes E2E API passando (8/8 ou mais)
- [ ] Testes E2E Web configurados (pode ter falhas, mas infraestrutura pronta)
- [ ] CI/CD configurado (GitHub Actions/GitLab CI)

### Smoke Test Manual
Execute este fluxo crítico após deploy:

1. [ ] **Login**
   - Acesse `https://app.aagc.com`
   - Login com `manager@demo.com / demo123` (ou usuário real)
   - Verifica: Dashboard carrega

2. [ ] **Criar Item**
   - Navegue para "Estoque"
   - Clique em "Novo Item"
   - Preencha e clique em "Criar"
   - Verifica: Modal fecha, item aparece na lista

3. [ ] **Criar Fornecedor**
   - Navegue para "Fornecedores"
   - Clique em "Novo Fornecedor"
   - Preencha e clique em "Criar"
   - Verifica: Modal fecha, fornecedor aparece na lista

4. [ ] **Criar Pedido**
   - Navegue para "Pedidos de Compra"
   - Clique em "Sugestões do Agente"
   - Clique em "Gerar Pedido(s)"
   - Verifica: Pedido criado como DRAFT

5. [ ] **Aprovar Pedido** (como MANAGER)
   - Clique em "Aprovar" no pedido
   - Verifica: Status muda para APPROVED

6. [ ] **Enviar Pedido**
   - Clique em "Enviar"
   - Verifica: Status muda para SENT

7. [ ] **Receber Pedido**
   - Clique em "Receber"
   - Verifica: Status muda para DELIVERED
   - Verifique estoque: Quantidades atualizadas

8. [ ] **Auditoria**
   - Navegue para "Auditoria"
   - Verifica: Todas as ações acima foram registradas

### Load Test (Opcional)
- [ ] Load test executado (ex: Apache Bench, k6)
- [ ] Sistema suporta 100 RPS
- [ ] Latência < 500ms para 95% dos requests

---

## 🔄 9. ROLLBACK PLAN

### Preparação
- [ ] Tag de versão criada no Git (`git tag v1.0.0`)
- [ ] Backup do banco criado antes do deploy
- [ ] Docker images versionadas

### Procedimento de Rollback
Documente os passos para reverter:

```bash
# 1. Parar serviços atuais
docker-compose -f docker-compose.prod.yml down

# 2. Checkout versão anterior
git checkout v1.0.0

# 3. Restore banco (se migrations incompatíveis)
pg_restore -U aagc_user -d aagc_prod backup.sql

# 4. Rebuild e subir
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Verificar health
curl https://api.aagc.com/health
```

---

## 🎉 10. PÓS-DEPLOY

### Comunicação
- [ ] Equipe notificada sobre deploy
- [ ] Stakeholders informados sobre nova versão
- [ ] Release notes publicadas (se aplicável)

### Monitoring Inicial (Primeiras 24h)
- [ ] Monitorar logs de erro
- [ ] Monitorar latência
- [ ] Monitorar uso de recursos (CPU/RAM)
- [ ] Verificar taxa de erro < 1%

### Feedback
- [ ] Canal de feedback ativo (email/Slack)
- [ ] Primeiros usuários contatados para feedback
- [ ] Issues prioritárias identificadas e agendadas

---

## 📞 11. CONTATOS DE EMERGÊNCIA

Preencha com informações reais:

| Papel | Nome | Email | Telefone |
|-------|------|-------|----------|
| Tech Lead | __________ | __________ | __________ |
| DevOps | __________ | __________ | __________ |
| DBA | __________ | __________ | __________ |
| On-Call | __________ | __________ | __________ |

### Serviços Críticos

| Serviço | URL/Acesso | Credenciais |
|---------|------------|-------------|
| Postgres | __________ | 1Password/LastPass |
| Redis | __________ | 1Password/LastPass |
| AWS/Cloud | __________ | 1Password/LastPass |
| Domain/DNS | __________ | 1Password/LastPass |

---

## ✅ APROVAÇÃO FINAL

- [ ] Tech Lead aprova deploy
- [ ] QA aprova (se aplicável)
- [ ] Product Owner aprova (se aplicável)

**Assinatura**: ___________________________  
**Data**: ___________________________  
**Versão Deployada**: ___________________________

---

## 📊 RISCOS E MITIGAÇÕES

### Riscos Identificados

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Downtime durante deploy | 🔴 ALTO | 🟡 BAIXO | Deploy em horário de baixo tráfego, rollback preparado |
| Regressão em funcionalidade | 🟠 MÉDIO | 🟡 BAIXO | Smoke test manual, testes automatizados |
| Performance degradada | 🟠 MÉDIO | 🟡 BAIXO | Load test prévio, monitoring ativo |
| Perda de dados | 🔴 ALTO | 🟢 MUITO BAIXO | Backup antes de migrations, restore testado |
| Segurança comprometida | 🔴 ALTO | 🟢 MUITO BAIXO | Checklist de segurança completo, CORS restrito |

### Contingências

- **Se API não iniciar**: Rollback para versão anterior
- **Se banco ficar lento**: Aumentar pool de conexões, adicionar índices
- **Se Redis cair**: Sistema continua funcionando (rate limit desabilitado gracefully)
- **Se Worker travar**: Reiniciar container, verificar Redis

---

**✅ Todos os itens acima devem ser verificados antes de deploy em produção!**

**Boa sorte com o deploy! 🚀**
