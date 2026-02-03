# 🚀 INSTALAÇÃO RÁPIDA - AAGC SaaS

## ⚡ Comandos Rápidos (Copie e Cole)

### Passo 1: Instalar pnpm (se não tiver)

```powershell
npm install -g pnpm@8.15.0
```

### Passo 2: Navegar para o projeto

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"
```

### Passo 3: Instalar todas as dependências

```powershell
pnpm install
```

### Passo 4: Iniciar infraestrutura (Docker)

```powershell
docker-compose up -d
```

**Aguarde 10 segundos para o PostgreSQL ficar pronto...**

### Passo 5: Configurar banco de dados

```powershell
cd apps/api
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
cd ../..
```

### Passo 6: Iniciar todos os serviços

```powershell
pnpm dev
```

---

## ✅ Pronto!

Acesse:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Docs**: http://localhost:3001/api/docs

**Login demo:**
- Email: `manager@demo.com`
- Senha: `demo123`

---

## 🔧 Comandos Úteis

### Reiniciar Docker
```powershell
docker-compose down
docker-compose up -d
```

### Ver banco de dados
```powershell
cd apps/api
pnpm prisma studio
```

### Resetar banco (apaga tudo)
```powershell
cd apps/api
pnpm prisma migrate reset
```

---

## ❌ Problemas Comuns

### Docker não inicia
- Certifique-se de que o Docker Desktop está rodando
- Execute: `docker-compose ps` para verificar

### Porta ocupada (3000 ou 3001)
- Mude a porta no arquivo correspondente
- API: `apps/api/.env` → `PORT=3002`
- Web: `apps/web/package.json` → `"dev": "next dev -p 3002"`

### Erro de dependências
```powershell
# Limpar e reinstalar
rm -rf node_modules
rm -rf apps/*/node_modules
pnpm install
```

---

**Sistema 100% funcional. Tudo salvo em banco real. Nenhum mock.**
