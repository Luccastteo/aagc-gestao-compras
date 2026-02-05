# 🔍 FLUXO COMPLETO: CRIAR NOVO ITEM

Este documento explica **EXATAMENTE** o que acontece quando você clica em "Criar" na tela de novo item.

---

## 📸 TELA ATUAL

Você está vendo o modal "Criar Novo Item" com os seguintes campos:
- **SKU:** 5445454515
- **Descrição:** computador
- **Categoria:** trabalho
- **Unidade:** 400
- **Estoque:** -24
- **Mínimo:** 400
- **Máximo:** 20
- **Custo Unitário:** 0
- **Lead Time:** 7 dias
- **Localização:** (vazio)

---

## 🔄 FLUXO COMPLETO (PASSO A PASSO)

### PASSO 1️⃣: FRONTEND - Coleta os Dados do Formulário

**Arquivo:** `apps/web/src/app/app/inventory/page.tsx` (linha 65-81)

```typescript
const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault(); // Previne reload da página
  
  // Coleta TODOS os dados do formulário
  const formData = new FormData(e.currentTarget);
  
  const data = {
    sku: formData.get('sku'),              // "5445454515"
    descricao: formData.get('descricao'),  // "computador"
    categoria: formData.get('categoria'),  // "trabalho"
    unidade: formData.get('unidade') || 'UN',  // "400"
    saldo: parseInt(formData.get('saldo') as string) || 0,  // -24
    minimo: parseInt(formData.get('minimo') as string) || 0,  // 400
    maximo: parseInt(formData.get('maximo') as string) || 100,  // 20
    leadTimeDays: parseInt(formData.get('leadTimeDays') as string) || 7,  // 7
    custoUnitario: parseFloat(formData.get('custoUnitario') as string) || 0,  // 0
    localizacao: formData.get('localizacao'),  // null
  };
  
  // Envia para a mutation
  createMutation.mutate(data);
};
```

**O que acontece:**
- Coleta todos os valores do formulário
- Converte números (parseInt/parseFloat)
- Define valores padrão se vazio

---

### PASSO 2️⃣: REACT QUERY - Mutation para API

**Arquivo:** `apps/web/src/app/app/inventory/page.tsx` (linha 36-42)

```typescript
const createMutation = useMutation({
  mutationFn: itemsApi.create,  // ← Chama a API
  onSuccess: () => {
    // ✅ Sucesso: Atualiza cache e fecha modal
    queryClient.invalidateQueries({ queryKey: ['items'] });
    setShowCreateModal(false);
  },
});
```

**O que acontece:**
- `mutationFn` chama `itemsApi.create(data)`
- Se sucesso: invalida cache (recarrega lista) e fecha modal
- Se erro: mostra mensagem de erro

---

### PASSO 3️⃣: API CLIENT - HTTP POST

**Arquivo:** `apps/web/src/lib/api.ts` (função itemsApi.create)

```typescript
export const itemsApi = {
  create: async (data: any) => {
    const response = await api.post('/items', data);
    return response.data;
  },
  // ...
};
```

**Requisição HTTP:**
```http
POST http://localhost:3001/items
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "sku": "5445454515",
  "descricao": "computador",
  "categoria": "trabalho",
  "unidade": "400",
  "saldo": -24,
  "minimo": 400,
  "maximo": 20,
  "leadTimeDays": 7,
  "custoUnitario": 0,
  "localizacao": null
}
```

---

### PASSO 4️⃣: BACKEND API - Controller Recebe

**Arquivo:** `apps/api/src/items/items.controller.ts` (linha 45-49)

```typescript
@Post()
@Roles(Role.MANAGER, Role.OPERATOR, Role.OWNER)
async create(@Body() data: CreateItemDto, @CurrentUser() user: CurrentUserData) {
  return this.itemsService.create(data, user.organizationId, user.userId);
}
```

**O que acontece:**
1. ✅ **Autenticação:** Verifica se tem JWT válido
2. ✅ **Autorização:** Verifica se role é MANAGER, OPERATOR ou OWNER
3. ✅ **Validação:** `CreateItemDto` valida os dados
4. ✅ **Extrai dados do usuário:** organizationId e userId do token JWT
5. ➡️ **Chama service:** `itemsService.create()`

---

### PASSO 5️⃣: VALIDAÇÃO - CreateItemDto

**Arquivo:** `apps/api/src/items/dto/create-item.dto.ts`

```typescript
export class CreateItemDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU é obrigatório' })
  sku: string;  // ✅ "5445454515" - OK

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  descricao: string;  // ✅ "computador" - OK

  @IsString()
  @IsOptional()
  categoria?: string;  // ✅ "trabalho" - OK

  @IsNumber()
  @Min(0)
  @IsOptional()
  saldo?: number;  // ⚠️ -24 - FALHA! Estoque negativo!
  
  // ... outros campos
}
```

**⚠️ PROBLEMA DETECTADO:**
O campo `saldo` tem `@Min(0)`, mas você está enviando `-24`. 
Isso vai **REJEITAR** a criação com erro:
```
❌ 400 Bad Request
{
  "statusCode": 400,
  "message": ["saldo must not be less than 0"],
  "error": "Bad Request"
}
```

---

### PASSO 6️⃣: SERVICE - Criação no Banco (SE PASSAR VALIDAÇÃO)

**Arquivo:** `apps/api/src/items/items.service.ts` (linha 76-106)

```typescript
async create(data: any, organizationId: string, userId: string) {
  // 1. Verifica se SKU já existe
  const existing = await this.prisma.item.findFirst({
    where: { sku: data.sku, organizationId },
  });

  if (existing) {
    throw new BadRequestException('SKU already exists in this organization');
  }

  // 2. Cria o item no banco de dados
  const item = await this.prisma.item.create({
    data: {
      ...data,
      organizationId,  // ← Isola por organização (multi-tenant)
    },
    include: { supplier: true },
  });

  // 3. Registra no log de auditoria
  await this.prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: 'CREATE',
      entity: 'Item',
      entityId: item.id,
      after: JSON.stringify(item),
      organizationId,
    },
  });

  // 4. Retorna o item criado
  return item;
}
```

**O que acontece:**
1. ✅ **Valida SKU único** (por organização)
2. ✅ **Cria no PostgreSQL** (tabela `items`)
3. ✅ **Log de auditoria** (quem criou, quando, o quê)
4. ✅ **Retorna item** com dados do supplier

---

### PASSO 7️⃣: RESPOSTA - Volta para o Frontend

**Resposta HTTP:**
```json
{
  "id": "uuid-gerado",
  "sku": "5445454515",
  "descricao": "computador",
  "categoria": "trabalho",
  "unidade": "400",
  "saldo": -24,
  "minimo": 400,
  "maximo": 20,
  "leadTimeDays": 7,
  "custoUnitario": 0,
  "localizacao": null,
  "organizationId": "org-uuid",
  "supplierId": null,
  "supplier": null,
  "createdAt": "2026-02-04T20:00:00Z",
  "updatedAt": "2026-02-04T20:00:00Z"
}
```

---

### PASSO 8️⃣: REACT QUERY - onSuccess

**Arquivo:** `apps/web/src/app/app/inventory/page.tsx`

```typescript
onSuccess: () => {
  // 1. Invalida cache da lista de itens
  queryClient.invalidateQueries({ queryKey: ['items'] });
  
  // 2. Fecha o modal
  setShowCreateModal(false);
}
```

**O que acontece:**
1. ✅ **Recarrega a lista** automaticamente (GET /items)
2. ✅ **Fecha o modal** de criação
3. ✅ **Novo item aparece** na tabela
4. ✅ **Se crítico** (saldo ≤ mínimo), aparece em vermelho com ícone de alerta

---

### PASSO 9️⃣: WORKER - Verifica Auto-PO (Background)

**Arquivo:** `apps/worker/src/auto-po-generator.ts`

A cada 60 segundos (em dev), o worker verifica:

```typescript
// 1. Busca itens críticos
const criticalItems = items.filter(item => item.saldo <= item.minimo);

// 2. Para o seu item:
{
  sku: "5445454515",
  descricao: "computador",
  saldo: -24,      // ← CRÍTICO!
  minimo: 400,     // ← MUITO ABAIXO!
  maximo: 20
}

// 3. Calcula quantidade necessária
const quantidadeNecessaria = item.maximo - item.saldo;
// = 20 - (-24) = 44 unidades

// 4. Cria Purchase Order automática (DRAFT)
await prisma.purchaseOrder.create({
  status: 'DRAFT',
  supplier: defaultSupplier,
  items: [{
    itemId: item.id,
    quantidade: 44,
    precoUnitario: item.custoUnitario
  }],
  metadata: {
    createdBy: 'AUTO_PO_WORKER',
    reason: 'CRITICAL_STOCK'
  }
});
```

**Resultado:**
- 🤖 **PO automática criada** em 60 segundos
- 📊 **Aparece no dashboard** como "DRAFT"
- ✉️ **Notificação enviada** (se configurado)

---

## 📊 FLUXO VISUAL COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ USUÁRIO                                                  │
│  Preenche formulário e clica "Criar"                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2️⃣ FRONTEND (React)                                         │
│  - handleCreate() coleta dados do FormData                  │
│  - Converte tipos (string → number)                         │
│  - createMutation.mutate(data)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ POST /items
┌─────────────────────────────────────────────────────────────┐
│  3️⃣ API NESTJS - Controller                                  │
│  ✅ Autenticação JWT                                         │
│  ✅ Autorização (MANAGER, OPERATOR, OWNER)                  │
│  ✅ Validação CreateItemDto                                 │
│  ❌ ERRO: saldo -24 falha @Min(0)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ❌ Retorna 400
                         │
┌─────────────────────────▼───────────────────────────────────┐
│  SE PASSASSE (saldo >= 0):                                   │
│                                                              │
│  4️⃣ SERVICE - Lógica de Negócio                              │
│  ✅ Verifica SKU duplicado                                   │
│  ✅ Cria item no PostgreSQL                                 │
│  ✅ Registra em AuditLog                                     │
│  ✅ Retorna item criado                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ 201 Created
┌─────────────────────────────────────────────────────────────┐
│  5️⃣ FRONTEND - onSuccess()                                   │
│  ✅ Invalida cache ['items']                                │
│  ✅ Recarrega lista automaticamente                         │
│  ✅ Fecha modal                                              │
│  ✅ Item aparece na tabela                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ (em 60 segundos)
┌─────────────────────────────────────────────────────────────┐
│  6️⃣ WORKER BULLMQ - Auto PO Generation                       │
│  ✅ Detecta item crítico (saldo <= minimo)                  │
│  ✅ Calcula quantidade: maximo - saldo                       │
│  ✅ Cria PO automática (DRAFT)                              │
│  ✅ Envia notificações                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ PROBLEMA NO SEU CASO

### Dados Problemáticos:

```
❌ Estoque: -24
   - Validação requer >= 0
   - Estoque negativo não é permitido

⚠️  Mínimo: 400
    Máximo: 20
    - Máximo < Mínimo (incoerente!)
    - Deve ser: Máximo >= Mínimo

⚠️  Unidade: 400
    - Deveria ser "UN", "PC", "KG", etc
    - Não um número
```

### O que vai acontecer:

```
❌ VALIDAÇÃO VAI FALHAR
Erro 400 Bad Request:
{
  "statusCode": 400,
  "message": [
    "saldo must not be less than 0"
  ],
  "error": "Bad Request"
}
```

O modal **NÃO VAI FECHAR** e você verá uma mensagem de erro.

---

## ✅ DADOS CORRETOS (Exemplo)

Para criar com sucesso, use:

```
SKU:             5445454515
Descrição:       Computador Dell Optiplex
Categoria:       Equipamentos TI
Unidade:         UN                    ← Texto, não número!
Estoque:         0                     ← Zero ou positivo
Mínimo:          5                     ← Menor que máximo
Máximo:          20                    ← Maior que mínimo
Custo Unitário:  3500.00
Lead Time:       7
Localização:     Almoxarifado A
```

---

## 🔍 CÓDIGO DETALHADO

### Frontend: handleCreate

```typescript:548:595:apps/web/src/app/app/inventory/page.tsx
<form onSubmit={handleCreate} className="space-y-4">
  <div>
    <label htmlFor="item-sku" className="text-sm font-medium">SKU *</label>
    <input id="item-sku" name="sku" required />
  </div>
  {/* ... outros campos ... */}
  <button type="submit">Criar</button>
</form>
```

### Backend: Controller

```typescript:45:49:apps/api/src/items/items.controller.ts
@Post()
@Roles(Role.MANAGER, Role.OPERATOR, Role.OWNER)
async create(@Body() data: CreateItemDto, @CurrentUser() user: CurrentUserData) {
  return this.itemsService.create(data, user.organizationId, user.userId);
}
```

### Backend: Service

```typescript:76:106:apps/api/src/items/items.service.ts
async create(data: any, organizationId: string, userId: string) {
  // 1. Verifica duplicação
  const existing = await this.prisma.item.findFirst({
    where: { sku: data.sku, organizationId },
  });

  if (existing) {
    throw new BadRequestException('SKU already exists in this organization');
  }

  // 2. Cria no banco
  const item = await this.prisma.item.create({
    data: {
      ...data,
      organizationId,
    },
    include: { supplier: true },
  });

  // 3. Audit log
  await this.prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: 'CREATE',
      entity: 'Item',
      entityId: item.id,
      after: JSON.stringify(item),
      organizationId,
    },
  });

  return item;
}
```

---

## 🎯 PARA ONDE VAI DEPOIS?

### Se SUCESSO (✅):

1. **Modal fecha** automaticamente
2. **Lista recarrega** com o novo item
3. **Item aparece na tabela** na primeira linha (ordenado por createdAt desc)
4. **Se crítico** (saldo ≤ mínimo):
   - Aparece com ícone vermelho ⚠️
   - Badge "Crítico"
   - **Em 60 segundos:** Worker cria PO automática

### Se ERRO (❌):

1. **Modal permanece aberto**
2. **Mensagem de erro** aparece em vermelho
3. **Você precisa corrigir** os dados e tentar novamente

---

## 🔧 CORREÇÕES NECESSÁRIAS NO SEU FORMULÁRIO

Para criar com sucesso, corrija:

```diff
- Estoque: -24          → Estoque: 0 (ou qualquer número >= 0)
- Mínimo: 400           → Mínimo: 5
- Máximo: 20            → Máximo: 20 (OK, mas deve ser >= mínimo)
- Unidade: 400          → Unidade: UN (texto, não número)
```

**Valores sugeridos:**
```
Estoque: 0
Mínimo: 5
Máximo: 20
Unidade: UN
```

---

## 🎊 RESUMO RÁPIDO

```
VOCÊ CLICA "CRIAR"
    ↓
Frontend coleta dados do form
    ↓
POST /items com os dados
    ↓
Backend valida (JWT, Role, DTO)
    ↓
❌ FALHA: saldo -24 < 0
    ↓
Retorna erro 400
    ↓
Modal mostra erro e permanece aberto
```

**Com dados corretos:**
```
Backend cria item
    ↓
Registra auditoria
    ↓
Retorna sucesso
    ↓
Frontend atualiza lista
    ↓
Modal fecha
    ↓
Item aparece na tabela
    ↓
(60s depois) Worker cria PO automática se crítico
```

---

**🔍 Agora você sabe EXATAMENTE o que acontece em cada etapa!**
