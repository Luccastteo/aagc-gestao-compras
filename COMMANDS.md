# 📋 COMANDOS ÚTEIS - AAGC SaaS

## 🚀 Instalação e Início

### Instalação Completa (Automática)
```cmd
install-windows.bat
```

### Iniciar Sistema
```cmd
start-all.bat
```

### Instalação Manual
```cmd
npm install -g pnpm@8.15.0
pnpm install
docker-compose up -d
cd apps\api
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
cd ..\..
pnpm dev
```

---

## 🐳 Docker

### Iniciar containers
```cmd
docker-compose up -d
```

### Parar containers
```cmd
docker-compose down
```

### Ver logs
```cmd
docker-compose logs -f
```

### Reiniciar
```cmd
docker-compose restart
```

### Status
```cmd
docker-compose ps
```

---

## 📊 Banco de Dados

### Gerar Prisma Client
```cmd
cd apps\api
pnpm prisma generate
```

### Criar Migration
```cmd
cd apps\api
pnpm prisma migrate dev --name nome_da_migration
```

### Aplicar Migrations
```cmd
cd apps\api
pnpm prisma migrate deploy
```

### Seed (popular dados demo)
```cmd
cd apps\api
pnpm prisma db seed
```

### Ver banco no navegador
```cmd
cd apps\api
pnpm prisma studio
```

### Resetar banco (APAGA TUDO)
```cmd
cd apps\api
pnpm prisma migrate reset
```

---

## 🏃 Executar Serviços

### Todos juntos
```cmd
pnpm dev
```

### API apenas
```cmd
cd apps\api
pnpm dev
```

### Web apenas
```cmd
cd apps\web
pnpm dev
```

### Worker apenas
```cmd
cd apps\worker
pnpm dev
```

---

## 🏗️ Build para Produção

### Build tudo
```cmd
pnpm build
```

### Build individual
```cmd
cd apps\api
pnpm build
```

### Rodar produção
```cmd
cd apps\api
pnpm start
```

---

## 🧹 Limpeza

### Limpar node_modules
```cmd
rmdir /s /q node_modules
rmdir /s /q apps\api\node_modules
rmdir /s /q apps\web\node_modules
rmdir /s /q apps\worker\node_modules
pnpm install
```

### Limpar cache Turbo
```cmd
rmdir /s /q .turbo
```

### Limpar build
```cmd
rmdir /s /q apps\api\dist
rmdir /s /q apps\web\.next
rmdir /s /q apps\worker\dist
```

---

## 🔍 Debug

### Ver logs da API
```cmd
cd apps\api
pnpm dev
```
(Logs aparecem no console)

### Ver logs do Worker
```cmd
cd apps\worker
pnpm dev
```

### Verificar porta ocupada
```cmd
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

### Matar processo na porta
```cmd
REM Primeiro encontre o PID
netstat -ano | findstr :3000

REM Depois mate o processo
taskkill /PID <numero_do_pid> /F
```

---

## 🧪 Testes

### Testar conexão API
```cmd
curl http://localhost:3001/health
```

### Testar login
```cmd
curl -X POST http://localhost:3001/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"manager@demo.com\",\"password\":\"demo123\"}"
```

### Ver items
```cmd
curl http://localhost:3001/items ^
  -H "x-user-id: <seu-user-id>"
```

---

## 📦 Gerenciamento de Dependências

### Adicionar dependência
```cmd
REM No workspace raiz
pnpm add <pacote> -w

REM Em um app específico
cd apps\api
pnpm add <pacote>
```

### Remover dependência
```cmd
cd apps\api
pnpm remove <pacote>
```

### Atualizar dependências
```cmd
pnpm update
```

### Ver dependências desatualizadas
```cmd
pnpm outdated
```

---

## 🔐 Segurança

### Gerar novo JWT secret
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Checar vulnerabilidades
```cmd
pnpm audit
```

---

## 📚 Documentação

### Abrir API Docs (Swagger)
- Navegador: http://localhost:3001/api/docs

### Ver schema Prisma
```cmd
code apps\api\prisma\schema.prisma
```

---

## 🎯 Comandos Rápidos

| Comando | Ação |
|---------|------|
| `install-windows.bat` | Instalar tudo |
| `start-all.bat` | Iniciar sistema |
| `pnpm dev` | Dev mode |
| `docker-compose up -d` | Iniciar Docker |
| `docker-compose down` | Parar Docker |
| `pnpm prisma studio` | Ver banco |
| `pnpm prisma db seed` | Popular dados |
| `pnpm build` | Build produção |

---

## 🆘 Problemas Comuns

### Erro: "Cannot find module"
```cmd
pnpm install
```

### Erro: "Port already in use"
```cmd
REM Matar processo na porta
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Erro: "Prisma Client not generated"
```cmd
cd apps\api
pnpm prisma generate
```

### Erro: "Docker not running"
```cmd
REM Abrir Docker Desktop manualmente
docker-compose up -d
```

### Erro: "Database connection failed"
```cmd
docker-compose restart postgres
timeout /t 10 /nobreak
cd apps\api
pnpm prisma migrate deploy
```

---

**Todos os comandos testados no Windows 10/11 com PowerShell e CMD.**
