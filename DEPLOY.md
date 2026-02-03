# Guia de Deploy - AAGC SaaS

Este guia explica como fazer deploy do sistema AAGC em produção.

---

## Arquitetura de Produção

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Vercel       │     │  Railway/Render │     │   Neon/Supabase │
│   (Frontend)    │────▶│     (API)       │────▶│  (PostgreSQL)   │
│   Next.js       │     │    NestJS       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │    Upstash      │
                        │    (Redis)      │
                        └─────────────────┘
```

---

## 1. Banco de Dados PostgreSQL

### Opção A: Neon (Recomendado - Gratuito)

1. Acesse https://neon.tech
2. Crie uma conta e um novo projeto
3. Copie a connection string:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### Opção B: Supabase

1. Acesse https://supabase.com
2. Crie um novo projeto
3. Vá em Settings > Database > Connection string
4. Copie a URI

### Opção C: Railway

1. Acesse https://railway.app
2. New Project > Deploy PostgreSQL
3. Copie a DATABASE_URL das variáveis

---

## 2. Redis

### Opção A: Upstash (Recomendado - Gratuito)

1. Acesse https://upstash.com
2. Crie um banco Redis
3. Copie a REDIS_URL:
   ```
   rediss://default:xxx@xxx.upstash.io:6379
   ```

### Opção B: Railway

1. No mesmo projeto, adicione Redis
2. Copie a REDIS_URL

---

## 3. Deploy da API

### Opção A: Railway (Recomendado)

1. Conecte seu repositório GitHub
2. Selecione a pasta `apps/api`
3. Configure as variáveis de ambiente:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=sua-chave-secreta-muito-longa-e-segura
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://seu-frontend.vercel.app

# Opcional - Notificações
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=seu-email@gmail.com
```

4. Deploy será automático

### Opção B: Render

1. Acesse https://render.com
2. New > Web Service
3. Conecte o repositório
4. Configure:
   - Root Directory: `apps/api`
   - Build Command: `pnpm install && pnpm prisma generate && pnpm build`
   - Start Command: `pnpm prisma migrate deploy && node dist/main.js`
5. Adicione as variáveis de ambiente

### Opção C: Docker (VPS)

```bash
# Build
docker build -t aagc-api ./apps/api

# Run
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e JWT_SECRET="sua-chave" \
  -e NODE_ENV="production" \
  aagc-api
```

---

## 4. Deploy do Frontend

### Vercel (Recomendado)

1. Acesse https://vercel.com
2. Import Git Repository
3. Selecione o repositório
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `apps/web`
5. Adicione variável de ambiente:
   ```
   NEXT_PUBLIC_API_URL=https://sua-api.railway.app
   ```
6. Deploy!

### Netlify (Alternativa)

1. Acesse https://netlify.com
2. Add new site > Import from Git
3. Configure:
   - Base directory: `apps/web`
   - Build command: `pnpm build`
   - Publish directory: `apps/web/.next`

---

## 5. Configuração de Email

### Gmail (Desenvolvimento)

1. Ative 2FA na conta Google
2. Gere uma "Senha de App" em https://myaccount.google.com/apppasswords
3. Use nas variáveis:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASS=senha-de-app-gerada
   ```

### SendGrid (Produção)

1. Crie conta em https://sendgrid.com
2. Crie uma API Key
3. Configure:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=sua-api-key
   ```

---

## 6. WhatsApp e SMS (Twilio)

1. Crie conta em https://twilio.com
2. Pegue Account SID e Auth Token
3. Configure WhatsApp Sandbox ou API oficial
4. Adicione nas variáveis:
   ```
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_WHATSAPP_FROM=+14155238886
   TWILIO_SMS_FROM=+1234567890
   ```

---

## 7. Domínio Personalizado

### Frontend (Vercel)
1. Settings > Domains
2. Adicione seu domínio
3. Configure DNS apontando para Vercel

### API (Railway)
1. Settings > Networking
2. Generate Domain ou Custom Domain

---

## 8. Variáveis de Ambiente Completas

### API (apps/api)

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Redis
REDIS_URL=redis://default:pass@host:6379

# Server
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=uma-chave-muito-longa-e-segura-com-pelo-menos-32-caracteres

# Frontend
FRONTEND_URL=https://aagc.vercel.app

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=senha-de-app
SMTP_FROM=email@gmail.com

# Twilio (WhatsApp/SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_SMS_FROM=+1234567890
```

### Frontend (apps/web)

```env
NEXT_PUBLIC_API_URL=https://api.aagc.com.br
```

---

## 9. Migração do Banco

Após o deploy da API, as migrations rodam automaticamente.

Para rodar manualmente:
```bash
# Via Railway CLI
railway run pnpm prisma migrate deploy

# Via conexão direta
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
```

Para popular com dados iniciais:
```bash
railway run pnpm prisma db seed
```

---

## 10. Monitoramento

### Logs
- Railway: Dashboard > Logs
- Render: Dashboard > Logs
- Vercel: Functions > Logs

### Health Check
- API: `https://sua-api.com/health`
- Frontend: Acesse normalmente

---

## Checklist de Deploy

- [ ] PostgreSQL configurado
- [ ] Redis configurado
- [ ] API deployed
- [ ] Migrations executadas
- [ ] Seed executado (usuários demo)
- [ ] Frontend deployed
- [ ] Variáveis de ambiente corretas
- [ ] CORS configurado (FRONTEND_URL)
- [ ] Teste de login
- [ ] Teste de funcionalidades
- [ ] Domínio configurado (opcional)
- [ ] SSL ativo (automático na maioria)

---

## Custos Estimados

| Serviço | Plano Gratuito | Produção |
|---------|----------------|----------|
| Vercel | Hobby (grátis) | Pro ($20/mês) |
| Railway | $5 crédito/mês | ~$10-30/mês |
| Neon | 0.5GB grátis | $19/mês |
| Upstash | 10k req/dia | $0.20/100k |
| SendGrid | 100 emails/dia | $19.95/mês |
| Twilio | $15 crédito | Pay as you go |

**Total estimado para produção leve: $30-50/mês**

---

## Suporte

Em caso de problemas:
1. Verifique os logs da API
2. Teste a conexão com o banco
3. Verifique as variáveis de ambiente
4. Confira o CORS e a URL do frontend
