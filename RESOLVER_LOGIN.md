# 🔧 RESOLVER ERRO DE LOGIN

## ❌ Erro: "Login failed"

Você está vendo a tela de login, mas ao tentar entrar aparece erro.

---

## ✅ SOLUÇÃO EM 3 PASSOS

### Passo 1: Verificar se a API está rodando

Abra uma **NOVA aba do navegador** e acesse:

```
http://localhost:3001/health
```

**Resultado esperado:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03...",
  "service": "AAGC Backend API",
  "version": "1.0.0"
}
```

**Se aparecer JSON acima:** API está OK! ✅ Vá para Passo 2.

**Se aparecer erro "Can't reach this page":** API não está rodando! ❌ Continue abaixo.

---

### Passo 2: Verificar o PowerShell

No PowerShell onde você executou `.\start-all.bat`, você deve ver mensagens assim:

```
🚀 API running on http://localhost:3001
📚 Docs available at http://localhost:3001/api/docs
✅ Prisma connected to database
```

**Se NÃO vê estas mensagens:**
- A API não iniciou corretamente
- Vá para "Solução A" abaixo

**Se vê mensagens de ERRO:**
- Vá para "Solução B" abaixo

---

### Passo 3: Verificar o Banco de Dados

Execute no PowerShell:

```powershell
docker ps
```

**Resultado esperado:**
Deve mostrar 2 containers rodando:
- `aagc-postgres`
- `aagc-redis`

**Se NÃO aparecem:** Docker não está rodando corretamente.

---

## 🔧 SOLUÇÕES

### Solução A: Reiniciar Tudo

1. **Feche** a janela do PowerShell que está rodando
2. **Pressione** Ctrl+C se necessário
3. Execute novamente:

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"
.\start-all.bat
```

4. Aguarde ver: `🚀 API running on http://localhost:3001`
5. Teste o login novamente

---

### Solução B: Recriar o Banco de Dados

Se a API não conecta ao banco:

```powershell
# Parar tudo
docker-compose down

# Reiniciar Docker
docker-compose up -d

# Aguardar 15 segundos
timeout /t 15

# Recriar banco
cd apps\api
pnpm prisma migrate deploy
pnpm prisma db seed
cd ..\..

# Iniciar sistema
.\start-all.bat
```

---

### Solução C: Verificar .env

Abra o arquivo: `apps\api\.env`

Deve conter:

```env
DATABASE_URL="postgresql://aagc:aagc_dev_password@localhost:5432/aagc_db?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3001
NODE_ENV=development
JWT_SECRET=aagc_super_secret_jwt_key_change_in_production_2026
```

Se estiver diferente, corrija e reinicie.

---

### Solução D: Rodar Cada Serviço Separadamente (Debug)

**Terminal 1 - API:**
```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas\apps\api"
pnpm dev
```

Aguarde ver: `🚀 API running on http://localhost:3001`

**Terminal 2 - Web:**
```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas\apps\web"
pnpm dev
```

Aguarde ver: `ready - started server on 0.0.0.0:3000`

Agora teste o login.

---

## 🎯 CHECKLIST DE VERIFICAÇÃO

Antes de tentar login, confirme:

- [ ] Docker Desktop está aberto e verde
- [ ] `docker ps` mostra 2 containers (postgres + redis)
- [ ] `http://localhost:3001/health` retorna JSON
- [ ] PowerShell mostra "API running on..."
- [ ] Frontend está em `http://localhost:3000`

Se TODOS estiverem OK, o login vai funcionar!

---

## 🔐 CREDENCIAIS CORRETAS

**Email:** manager@demo.com  
**Senha:** demo123

(copie e cole exatamente assim, sem espaços)

---

## 🐛 ERROS ESPECÍFICOS

### "Can't reach database server at localhost:5432"

**Causa:** PostgreSQL não está rodando.

**Solução:**
```powershell
docker-compose restart postgres
timeout /t 10
cd apps\api
pnpm prisma migrate deploy
```

### "Port 3001 already in use"

**Causa:** Outro processo está usando a porta.

**Solução:**
```powershell
netstat -ano | findstr :3001
# Anote o PID (última coluna)
taskkill /PID <numero> /F
```

### "CORS error" no navegador

**Causa:** Frontend não consegue falar com API.

**Solução:** Verifique se ambos estão rodando e reinicie.

---

## 📸 PRÓXIMO PASSO

Depois que conseguir logar, você verá:

```
┌─────────────────────────────────┐
│ AAGC SaaS                       │
│ ┌───────────┬─────────────────┐ │
│ │ Dashboard │ 📊 Dashboard    │ │
│ │ Inventory │                 │ │
│ │ Purchase..│ Métricas aqui!  │ │
│ │ Suppliers │                 │ │
│ │ Kanban    │                 │ │
│ │ Audit Logs│                 │ │
│ └───────────┴─────────────────┘ │
└─────────────────────────────────┘
```

---

## 🆘 AINDA NÃO FUNCIONOU?

Execute este comando e envie o resultado:

```powershell
# Verificar tudo de uma vez
docker ps
curl http://localhost:3001/health
curl http://localhost:3000
```

Ou consulte o PowerShell e veja se há mensagens de erro em vermelho.
