# 🚀 Quick Start - AAGC SaaS

## Para Windows

### Opção 1: Script Automático (Recomendado)

1. **Certifique-se que o Docker Desktop está rodando**
2. **Execute o script**:
   ```cmd
   START-DEV.bat
   ```

O script irá:
- ✅ Verificar Docker e pnpm
- ✅ Iniciar Postgres e Redis
- ✅ Rodar migrations
- ✅ Oferecer popular com dados demo
- ✅ Iniciar a aplicação

### Opção 2: Manual (Passo a Passo)

#### 1. Iniciar Infraestrutura

```powershell
# Iniciar Postgres e Redis
docker-compose up -d postgres redis

# Aguardar 10 segundos
Start-Sleep -Seconds 10
```

#### 2. Configurar Banco de Dados

```powershell
cd apps\api

# Instalar dependências (se necessário)
pnpm install

# Rodar migrations
pnpm prisma migrate deploy

# Gerar Prisma Client
pnpm prisma generate

# Popular com dados demo (opcional)
pnpm prisma db seed

cd ..\..
```

#### 3. Iniciar Aplicação

```powershell
# Iniciar todos os serviços
pnpm dev
```

### Acessar Aplicação

- **Frontend**: http://localhost:3002
- **API**: http://localhost:3001
- **Docs**: http://localhost:3001/api/docs

### Credenciais Demo

| Email | Senha | Papel |
|-------|-------|-------|
| `manager@demo.com` | `demo123` | Gerente |
| `owner@demo.com` | `demo123` | Proprietário |
| `operator@demo.com` | `demo123` | Operador |
| `viewer@demo.com` | `demo123` | Visualizador |

---

## 🔍 Verificar Health

```powershell
# Verificar se API está rodando
curl http://localhost:3001/health

# Verificar se está pronta para receber requests
curl http://localhost:3001/health/ready
```

---

## ❌ Problemas Comuns

### Docker não está rodando
```
[ERRO] Docker não está rodando!
```
**Solução**: Abra Docker Desktop e aguarde inicializar

### Porta já em uso
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solução**: Mate o processo na porta
```powershell
# Encontrar processo
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess

# Matar processo (substitua PID)
Stop-Process -Id <PID> -Force
```

Ou use o script:
```cmd
kill-ports.bat
```

### Erro de conexão com banco
```
Error: Can't reach database server
```
**Solução**: Aguarde Postgres inicializar completamente
```powershell
# Verificar logs
docker logs aagc-postgres

# Reiniciar container
docker-compose restart postgres
```

---

## 📝 Próximos Passos

1. ✅ Login com `manager@demo.com` / `demo123`
2. ✅ Criar um item em "Estoque"
3. ✅ Criar um fornecedor
4. ✅ Criar um pedido de compra
5. ✅ Testar o workflow completo

---

## 🛑 Parar Aplicação

```powershell
# Parar serviços Node (Ctrl+C no terminal onde rodou pnpm dev)

# Parar containers
docker-compose down
```

---

**Para deploy em produção, consulte**: [DEPLOY.md](./DEPLOY.md)
