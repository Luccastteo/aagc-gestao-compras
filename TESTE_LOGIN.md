# 🧪 TESTE DE LOGIN - GUIA COMPLETO

## 🚨 SITUAÇÃO ATUAL

A rota `/auth/login` não está sendo registrada pelo NestJS.

**Solução temporária:** Criei um endpoint `/simple-login` diretamente no AppController.

---

## 🔄 PASSOS OBRIGATÓRIOS

### 1. REINICIE A API COMPLETAMENTE

```powershell
# Vá para a pasta da API
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas\apps\api"

# Se estiver rodando, pare (Ctrl+C)

# Inicie novamente
pnpm dev
```

### 2. AGUARDE VER ESTAS MENSAGENS

```
[Nest] 1234  - LOG [NestFactory] Starting Nest application...
[Nest] 1234  - LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 1234  - LOG [RoutesResolver] AppController {/}:
[Nest] 1234  - LOG [RouterExplorer] Mapped {/, GET} route
[Nest] 1234  - LOG [RouterExplorer] Mapped {/health, GET} route
[Nest] 1234  - LOG [RouterExplorer] Mapped {/simple-login, POST} route
```

**IMPORTANTE:** Procure pela linha `Mapped {/simple-login, POST}`

---

## 🧪 TESTES

### Teste 1: Root
```powershell
Invoke-RestMethod -Uri "http://localhost:3001" -Method GET
```

**Esperado:** `{"message": "AAGC API is running"}`

---

### Teste 2: Health
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

**Esperado:** JSON com status OK

---

### Teste 3: Simple Login (NOVO)
```powershell
$body = '{"email":"manager@demo.com","password":"demo123"}'
Invoke-RestMethod -Uri "http://localhost:3001/simple-login" -Method POST -Body $body -ContentType "application/json"
```

**Esperado:**
```json
{
  "success": true,
  "user": {
    "userId": "...",
    "email": "manager@demo.com",
    "name": "Maria Santos (Manager)",
    "role": "MANAGER"
  },
  "token": "session_..."
}
```

---

## 📊 DIAGNÓSTICO

### Se `/simple-login` FUNCIONAR:
✅ O problema é específico do AuthController  
➡️ Solução: Usar `/simple-login` temporariamente

### Se `/simple-login` NÃO FUNCIONAR:
❌ Há um problema maior com o NestJS  
➡️ Me envie os logs completos do terminal da API

---

## 🔧 ATUALIZAR O FRONTEND (TEMPORÁRIO)

Se `/simple-login` funcionar, atualize o frontend:

**Arquivo:** `apps/web/src/lib/api.ts`

```typescript
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/simple-login', { email, password });
    return data;
  },
};
```

---

## 📝 CHECKLIST

- [ ] Reiniciei a API com `pnpm dev`
- [ ] Vi mensagem "Mapped {/simple-login, POST}"
- [ ] Testei `http://localhost:3001`
- [ ] Testei `/simple-login` com PowerShell
- [ ] Funcionou? Atualizei o frontend

---

## 🆘 SE NADA FUNCIONAR

Me envie:
1. Print do terminal da API (tudo que aparece ao iniciar)
2. Resultado de `http://localhost:3001`
3. Resultado de `http://localhost:3001/health`
4. Resultado do teste `/simple-login`
