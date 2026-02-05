# 📝 Logs Estruturados - Recomendações

**Status**: ⚠️ Não implementado (Logs atuais funcionam, mas não são JSON structured)  
**Prioridade**: 🟡 BAIXA (não bloqueante para deploy)

---

## Estado Atual

Os logs atuais são gerados pelo Fastify e incluem:
- `console.log()` em diversos pontos do código
- Logs do Fastify adapter (requests/responses)
- Logs do NestJS (inicialização, erros)

**Formato Atual**: Texto plano, não estruturado

```
[Nest] 12345  - 01/01/2026, 12:00:00 PM     LOG [NestApplication] Nest application successfully started +10ms
```

---

## Problemas Identificados

1. ❌ **Não é JSON**: Difícil de parsear automaticamente
2. ❌ **Falta contexto**: Sem `requestId`, `userId`, `organizationId`
3. ❌ **PII exposto**: Emails, dados sensíveis podem aparecer em logs
4. ❌ **Sem níveis estruturados**: Difícil filtrar por severity

---

## Recomendações para Implementação Futura

### 1. Biblioteca: Winston ou Pino

**Pino** (recomendado para Fastify):
```typescript
// main.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
      // NÃO incluir body (pode conter senhas)
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'secret'],
    censor: '[REDACTED]',
  },
});
```

### 2. Contexto de Request

Adicionar middleware para injetar contexto:
```typescript
app.use((req, res, next) => {
  req.log = logger.child({
    requestId: req.id || uuidv4(),
    userId: req.user?.id,
    organizationId: req.user?.organizationId,
    ip: req.ip,
  });
  next();
});
```

### 3. Sanitização de PII

**Evitar logs de**:
- ❌ Senhas (`password`, `newPassword`)
- ❌ Tokens (`authorization`, `accessToken`, `refreshToken`)
- ❌ Emails completos (mascarar: `u***@example.com`)
- ❌ CPF/CNPJ completos
- ❌ Snapshots de auditoria com dados sensíveis

**Exemplo de sanitização**:
```typescript
function sanitizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function sanitizeLog(data: any): any {
  const sanitized = { ...data };
  
  if (sanitized.email) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }
  
  if (sanitized.password) {
    sanitized.password = '[REDACTED]';
  }
  
  if (sanitized.token || sanitized.accessToken) {
    sanitized.token = '[REDACTED]';
    sanitized.accessToken = '[REDACTED]';
  }
  
  return sanitized;
}
```

### 4. Níveis de Log Estruturados

```typescript
// Erro (500)
logger.error({
  msg: 'Failed to create item',
  error: err.message,
  stack: err.stack,
  userId: req.user.id,
  organizationId: req.user.organizationId,
});

// Warning (validação falhou)
logger.warn({
  msg: 'Validation failed',
  errors: validationErrors,
  userId: req.user.id,
});

// Info (operação bem-sucedida)
logger.info({
  msg: 'Item created successfully',
  itemId: newItem.id,
  userId: req.user.id,
});

// Debug (desenvolvimento)
logger.debug({
  msg: 'Query executed',
  query: sanitizeQuery(query),
});
```

### 5. Configuração por Ambiente

```env
# Development
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Production
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## Exemplo de Log Estruturado (JSON)

**Antes (texto)**:
```
[Nest] 12345 - 01/01/2026, 12:00:00 PM ERROR [ItemsController] Error creating item: Duplicate SKU
```

**Depois (JSON)**:
```json
{
  "level": "error",
  "time": 1704110400000,
  "msg": "Error creating item",
  "error": "Duplicate SKU",
  "requestId": "req-abc123",
  "userId": "user-xyz789",
  "organizationId": "org-123",
  "method": "POST",
  "url": "/items",
  "statusCode": 400,
  "duration": 45
}
```

**Benefícios**:
- ✅ Fácil de parsear (Datadog, LogDNA, ELK)
- ✅ Contexto completo (requestId, userId, orgId)
- ✅ Sem PII (sanitizado)
- ✅ Filtros poderosos (por nível, userId, orgId)

---

## Implementação Incremental

### Fase 1: Adicionar Pino (1 hora)
```bash
pnpm add pino pino-pretty
```

Configure logger básico no `main.ts`.

### Fase 2: Middleware de Contexto (30 min)
Adicione `requestId`, `userId`, `organizationId` em todos os logs.

### Fase 3: Sanitização (1 hora)
Crie funções para mascarar PII.

### Fase 4: Refatorar Logs (2 horas)
Substituir `console.log()` por `logger.info()`, `logger.error()`, etc.

**Tempo Total Estimado**: ~4.5 horas

---

## Alternativa Simples (Sem Biblioteca)

Se não quiser adicionar dependência, pode usar wrapper:

```typescript
// logger.service.ts
export class SimpleLogger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  info(msg: string, meta?: any) {
    console.log(JSON.stringify({
      level: 'info',
      time: new Date().toISOString(),
      context: this.context,
      msg,
      ...this.sanitize(meta),
    }));
  }
  
  error(msg: string, error?: Error, meta?: any) {
    console.error(JSON.stringify({
      level: 'error',
      time: new Date().toISOString(),
      context: this.context,
      msg,
      error: error?.message,
      stack: error?.stack,
      ...this.sanitize(meta),
    }));
  }
  
  private sanitize(data: any) {
    if (!data) return {};
    const sanitized = { ...data };
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) delete sanitized.token;
    if (sanitized.email) sanitized.email = this.maskEmail(sanitized.email);
    return sanitized;
  }
  
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local[0]}***@${domain}`;
  }
}
```

---

## Recomendação Final

**Para Deploy Imediato**: ✅ Logs atuais são suficientes  
**Para Melhoria Contínua**: Implementar Pino + sanitização em 1-2 sprints

**Prioridade**: Após deploy, junto com:
1. Corrigir testes E2E Web
2. Adicionar CI/CD
3. Configurar APM (Sentry)

---

**Status**: 📝 Documentado, não implementado  
**Bloqueante para Deploy**: ❌ NÃO  
**Recomendado para Produção**: ✅ SIM (mas não urgente)
