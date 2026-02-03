# 🚨 SOLUÇÃO RÁPIDA - Problemas Corrigidos

## ✅ Correções Aplicadas

1. ✅ **turbo.json** - Atualizado de `pipeline` para `tasks` (Turbo 2.x)
2. ✅ **docker-compose.yml** - Removido `version` obsoleto

---

## 🐳 PASSO 1: INICIAR DOCKER DESKTOP

**IMPORTANTE**: Você precisa abrir o Docker Desktop ANTES de rodar a instalação.

### Como fazer:

1. Procure "Docker Desktop" no menu Iniciar do Windows
2. Clique para abrir
3. Aguarde até ver a mensagem "Docker Desktop is running"
4. **SÓ DEPOIS** execute a instalação

**OU** verifique se está rodando:

```powershell
docker --version
docker ps
```

Se aparecer erro, **abra o Docker Desktop manualmente**.

---

## 🚀 PASSO 2: INSTALAR NOVAMENTE

Depois que o Docker Desktop estiver **rodando**, execute:

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"
.\install-windows.bat
```

---

## ⚡ PASSO 3: INICIAR SISTEMA

```powershell
.\start-all.bat
```

Acesse: http://localhost:3000

---

## 🔍 VERIFICAR SE DOCKER ESTÁ RODANDO

```powershell
# Verificar versão
docker --version

# Verificar containers
docker ps

# Se aparecer lista (mesmo vazia), Docker está OK!
```

---

## ❌ SE DOCKER NÃO INICIAR

### Opção 1: Instalar Docker Desktop

1. Baixe: https://www.docker.com/products/docker-desktop
2. Instale
3. Reinicie o PC
4. Abra Docker Desktop

### Opção 2: Usar sem Docker (Modo Dev)

Se não quiser usar Docker agora, pode rodar sem ele instalando PostgreSQL e Redis manualmente:

**PostgreSQL:**
```powershell
# Baixe de: https://www.postgresql.org/download/windows/
# Configure: usuário=aagc, senha=aagc_dev_password, banco=aagc_db
```

**Redis:**
```powershell
# Baixe de: https://github.com/microsoftarchive/redis/releases
# Ou use Redis online: https://redis.com/try-free/
```

Depois atualize `apps/api/.env` com as URLs corretas.

---

## 📋 CHECKLIST DE SOLUÇÃO

- [ ] Abrir Docker Desktop
- [ ] Aguardar "Docker Desktop is running"
- [ ] Executar `docker ps` (deve funcionar)
- [ ] Executar `.\install-windows.bat`
- [ ] Executar `.\start-all.bat`
- [ ] Acessar http://localhost:3000

---

## 🆘 AINDA COM PROBLEMAS?

### Erro: "Docker não encontrado"
**Solução:** Instale Docker Desktop e reinicie o PC.

### Erro: "Porta 5432 ocupada"
**Solução:** Você já tem PostgreSQL rodando. Pare ele ou mude a porta no docker-compose.yml.

### Erro: "Porta 3000 ocupada"
**Solução:** 
```powershell
netstat -ano | findstr :3000
taskkill /PID <numero> /F
```

---

## ✅ RESUMO

**Problema principal:** Docker Desktop não estava rodando.

**Solução:**
1. Abra Docker Desktop
2. Aguarde inicializar
3. Execute install-windows.bat novamente

**Correções já aplicadas:**
- turbo.json ✅
- docker-compose.yml ✅

**Agora vai funcionar! 🚀**
