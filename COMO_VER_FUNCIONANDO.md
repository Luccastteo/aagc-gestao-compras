# 🎯 COMO VER O PROGRAMA FUNCIONANDO

## 📺 GUIA VISUAL PASSO A PASSO

---

## 🚀 MÉTODO 1: INSTALAÇÃO AUTOMÁTICA (MAIS FÁCIL)

### Passo 1: Abrir Docker Desktop

1. Pressione **tecla Windows**
2. Digite: `Docker Desktop`
3. Clique para abrir
4. **AGUARDE** até aparecer na barra de tarefas (ícone de baleia)

![Docker Desktop Running]

**Como saber se está rodando?**
- Ícone do Docker na barra de tarefas está **verde** ou **branco**
- Ao clicar, mostra "Docker Desktop is running"

---

### Passo 2: Verificar Docker no PowerShell

Abra o PowerShell e execute:

```powershell
docker --version
```

**Resultado esperado:**
```
Docker version 24.x.x, build xxxxx
```

Se aparecer versão, está OK! ✅

---

### Passo 3: Navegar para a pasta do projeto

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"
```

---

### Passo 4: Executar instalação

```powershell
.\install-windows.bat
```

**O que vai acontecer:**
```
[1/6] Instalando pnpm... ✅
[2/6] Instalando dependencias... ✅
[3/6] Iniciando Docker (PostgreSQL + Redis)... ✅
[4/6] Aguardando PostgreSQL ficar pronto... ✅
[5/6] Configurando banco de dados... ✅
[6/6] Pronto! ✅
```

**Tempo estimado:** 2-3 minutos

---

### Passo 5: Iniciar o sistema

```powershell
.\start-all.bat
```

**O que vai aparecer:**
```
- API: http://localhost:3001
- Web: http://localhost:3000
- Docs: http://localhost:3001/api/docs

Login demo:
  Email: manager@demo.com
  Senha: demo123
```

**Deixe esta janela ABERTA!** Os servidores estão rodando aqui.

---

### Passo 6: Abrir no navegador

**Abra seu navegador (Chrome, Edge, Firefox) e acesse:**

```
http://localhost:3000
```

**Você verá a tela de login!** 🎉

---

### Passo 7: Fazer login

Na tela de login:

- **Email:** `manager@demo.com`
- **Senha:** `demo123`

Clique em **Login**

---

### Passo 8: Explorar o sistema!

Você vai ver o **Dashboard** com:
- ✅ Total de itens
- ✅ Itens críticos (alerta vermelho)
- ✅ Pedidos pendentes
- ✅ Valor total

**Menu lateral (esquerda):**
- 📊 Dashboard
- 📦 Inventory (Estoque)
- 🛒 Purchase Orders (Pedidos)
- 🏢 Suppliers (Fornecedores)
- 📋 Kanban
- 📝 Audit Logs

---

## 🎮 TESTANDO AS FUNCIONALIDADES

### 1. Ver Inventário

1. Clique em **"Inventory"** no menu
2. Você verá 5 produtos demo
3. Note os que estão em vermelho (CRITICAL)

### 2. Analisar Estoque

1. Ainda em Inventory
2. Clique no botão **"Analyze Stock"**
3. Veja as sugestões automáticas de compra! 🤖

### 3. Criar um Produto

1. Clique em **"New Item"**
2. Preencha:
   - SKU: `TEST-001`
   - Description: `Produto de Teste`
   - Stock: `0`
   - Min: `5`
   - Max: `20`
   - Unit Cost: `10.00`
3. Clique em **"Create"**
4. **Pronto!** O produto aparece na tabela imediatamente ✅

### 4. Ver Purchase Orders

1. Clique em **"Purchase Orders"**
2. Você verá 1 pedido demo: `PO-2026-001`
3. Clique em **"Approve"**
   - Status muda para APPROVED 🔵
4. Clique em **"Send to Supplier"**
   - Status muda para SENT 🟡
5. Clique em **"Receive Order"**
   - Status muda para DELIVERED 🟢
   - **ESTOQUE É ATUALIZADO AUTOMATICAMENTE!** 🚀

### 5. Conferir Estoque Atualizado

1. Volte para **"Inventory"**
2. Veja que os produtos do pedido tiveram o estoque aumentado
3. **TUDO REAL!** Salvo no banco de dados PostgreSQL ✅

### 6. Ver Kanban

1. Clique em **"Kanban"**
2. Veja cards em 3 colunas:
   - 📝 To Do
   - ⏳ In Progress
   - ✅ Done
3. Clique em **"Start"** para mover card
4. Clique em **"Complete"** para finalizar

### 7. Ver Audit Logs

1. Clique em **"Audit Logs"**
2. Veja **TODAS** as ações que você fez!
3. Cada clique foi registrado com:
   - Data/hora
   - Usuário (você)
   - Ação (CREATE, UPDATE, APPROVE, etc)
   - Entidade afetada
   - Mudanças (before/after)

---

## 📸 SCREENSHOTS ESPERADOS

### 1. Tela de Login
```
┌─────────────────────────────┐
│      AAGC SaaS             │
│  Purchase Management       │
│                            │
│  Email: [manager@demo.com] │
│  Password: [••••••••]      │
│                            │
│      [  Login  ]           │
└─────────────────────────────┘
```

### 2. Dashboard
```
┌─────────────────────────────────────────┐
│ AAGC SaaS        [Sidebar]  Dashboard  │
├─────────────┬───────────────────────────┤
│ Dashboard   │ 📦 Total Items: 5         │
│ Inventory   │ ⚠️  Critical: 3           │
│ Purchase..  │ 🛒 Pending: 1             │
│ Suppliers   │ 💰 Total: R$ 1,195.00    │
│ Kanban      │                           │
│ Audit Logs  │ [Tabela de produtos...]  │
│             │ [Gráficos...]            │
└─────────────┴───────────────────────────┘
```

### 3. Inventory com Análise
```
┌─────────────────────────────────────────┐
│ Inventory  [Analyze Stock] [New Item]  │
├─────────────────────────────────────────┤
│ 📊 Stock Analysis                       │
│   Total Items: 5                        │
│   Critical Items: 3                     │
│   Estimated Cost: R$ 675.00            │
│                                         │
│ 🛒 Purchase Suggestions:                │
│   ROL-6205 - Buy 15 units (R$ 675.00)  │
│   ROL-6206 - Buy 10 units (R$ 520.00)  │
├─────────────────────────────────────────┤
│ [Tabela de produtos...]                │
└─────────────────────────────────────────┘
```

---

## ⚡ MÉTODO 2: VER RÁPIDO SEM INSTALAR TUDO

Se você só quer ver a interface (sem dados reais):

### Apenas Frontend

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas\apps\web"
npm install
npm run dev
```

Acesse: http://localhost:3000

**Nota:** Vai dar erro ao tentar login porque precisa da API rodando.

---

## 🎥 MÉTODO 3: DEMO ONLINE (FUTURO)

Em breve teremos uma versão demo online em:
- https://aagc-demo.vercel.app (exemplo)

Mas por enquanto, rode localmente!

---

## 🐛 PROBLEMAS COMUNS

### ❌ "Cannot GET /"
**Solução:** O frontend ainda está carregando. Aguarde 10-20 segundos.

### ❌ "Login failed"
**Solução:** Verifique se a API está rodando:
```
http://localhost:3001/health
```
Deve retornar JSON com status OK.

### ❌ "Port 3000 already in use"
**Solução:** Outra coisa está usando a porta.
```powershell
netstat -ano | findstr :3000
taskkill /PID <numero> /F
```

### ❌ Tela em branco
**Solução:** Abra o Console do navegador (F12) e veja os erros.

---

## 📹 GRAVANDO TELA (OPCIONAL)

Quer gravar o funcionamento?

**Windows 10/11:**
1. Pressione `Windows + G` (Xbox Game Bar)
2. Clique no ícone de gravar
3. Navegue no sistema
4. Pressione `Windows + Alt + R` para parar

**OBS Studio:**
- Baixe: https://obsproject.com
- Configure para gravar tela
- Qualidade profissional

---

## 📊 CHECKLIST RÁPIDO

Antes de abrir o navegador, confirme:

- [ ] Docker Desktop está aberto e rodando
- [ ] `docker ps` funciona no PowerShell
- [ ] `.\install-windows.bat` executou sem erros
- [ ] `.\start-all.bat` está rodando (janela aberta)
- [ ] Vê mensagens tipo "API running on http://localhost:3001"

Se TODOS estiverem OK, abra: http://localhost:3000

---

## 🎯 RESUMO ULTRA-RÁPIDO

```powershell
# 1. Abrir Docker Desktop (ícone de baleia)
# 2. PowerShell:
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"
.\install-windows.bat
.\start-all.bat

# 3. Navegador:
# http://localhost:3000
# manager@demo.com / demo123
```

**Pronto! Sistema funcionando! 🎉**

---

## 📚 VÍDEO TUTORIAL (FUTURO)

Gravamos um vídeo mostrando tudo:
- [ ] Instalação
- [ ] Login
- [ ] Criando produto
- [ ] Aprovando pedido
- [ ] Kanban
- [ ] Audit logs

*Link em breve...*

---

## 🆘 AINDA NÃO FUNCIONOU?

Envie screenshot do erro para análise:
1. Print da tela de erro
2. Print do PowerShell
3. Print do Docker Desktop

Ou consulte: `SOLUCAO_RAPIDA.md`
