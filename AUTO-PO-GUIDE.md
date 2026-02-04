# AAGC - Guia do Sistema de PO Automático

## Visão Geral

O sistema de **Auto PO (Purchase Order)** gera automaticamente pedidos de compra em modo DRAFT quando o estoque atinge níveis críticos. O comportamento é **agressivo** e **determinístico**.

### Características Principais

- **Agressivo**: Executa frequentemente (60s em DEV, 6h em PROD) e cria POs imediatamente
- **Determinístico**: Mesma base de dados + mesmas regras = mesma saída
- **Seguro**: Apenas cria DRAFT, nunca aprova ou envia automaticamente
- **Idempotente**: Não duplica POs dentro da mesma janela de tempo

---

## Regras de Negócio

### 1. Trigger (Quando um item entra no pipeline)

```
item.saldo <= item.minimo
```

### 2. Quantidade a Comprar (QTY)

```javascript
qtyFinal = max(1, item.maximo - item.saldo)
```

- Sempre compra para retornar ao **máximo** (agressivo)
- Nunca compra menos que **1 unidade**

### 3. Resolução de Fornecedor (Determinística)

Ordem de prioridade:

1. **item.supplierId** - Fornecedor preferencial do item (se ativo)
2. **org.defaultSupplier** - Fornecedor marcado como `isDefault=true` na organização
3. **Histórico de PO** - Último fornecedor usado para este SKU em POs concluídas
4. **SKIP** - Se nenhum fornecedor for encontrado, item é ignorado com log

### 4. Janela de Dedupe (6 horas)

```javascript
windowStart = floor(now / 6h) * 6h  // UTC: 00:00, 06:00, 12:00, 18:00
dedupeKey = `AUTO:${orgId}:${supplierId}:${windowStartISO}`
```

- Uma única PO AUTO por (organização, fornecedor, janela)
- Se PO já existe → atualiza (adiciona itens, aumenta qtd)
- Se PO não existe → cria nova

### 5. Upsert de Itens

- **Novo item**: Adiciona à PO
- **Item existente**: `qty = MAX(qtyAtual, qtyNovo)` - nunca reduz

### 6. Preço e Total

```javascript
preco = item.custoUnitario || 0
needsQuote = (preco == 0)
total = sum(qty * preco)
```

- Se total = 0, ainda cria PO mas marca `needsQuote = true`

### 7. Travas Anti-Spam

- Se existe **PO MANUAL DRAFT** para o mesmo fornecedor criada nos últimos 60 minutos:
  - NÃO cria AUTO PO
  - Registra log: `AUTO_PO_SKIPPED_MANUAL_DRAFT_EXISTS`

---

## Configuração

### Variáveis de Ambiente (Worker)

```bash
# Habilitar/desabilitar (default: true)
AUTO_PO_ENABLED=true

# Janela de dedupe em horas (default: 6)
AUTO_PO_WINDOW_HOURS=6

# Intervalo em DEV em segundos (default: 60)
AUTO_PO_DEV_INTERVAL_SEC=60

# Pular se manual DRAFT existe há N minutos (default: 60)
AUTO_PO_SKIP_IF_MANUAL_DRAFT_MIN=60
```

### Frequência de Execução

| Ambiente | Frequência |
|----------|------------|
| DEV      | A cada 60 segundos |
| PROD     | A cada 6 horas (cron: `0 */6 * * *`) |

---

## Schema do Banco

### PurchaseOrder (novos campos)

```prisma
model PurchaseOrder {
  // ... campos existentes ...
  source            POSource  @default(MANUAL)    // MANUAL | AUTO_REPLENISH
  dedupeKey         String?                        // Chave de dedupe
  windowStart       DateTime?                      // Início da janela
  needsQuote        Boolean   @default(false)      // Precisa cotação?
  lastAutoUpdateAt  DateTime?                      // Última atualização auto
}

enum POSource {
  MANUAL
  AUTO_REPLENISH
}
```

### PurchaseOrderItem (novos campos)

```prisma
model PurchaseOrderItem {
  // ... campos existentes ...
  needsQuote  Boolean  @default(false)
}
```

### Supplier (novos campos)

```prisma
model Supplier {
  // ... campos existentes ...
  isDefault  Boolean  @default(false)  // Fornecedor padrão da org
}
```

### KanbanCard (novos campos)

```prisma
model KanbanCard {
  // ... campos existentes ...
  externalRef  String?  // Ref para AUTO POs
}
```

---

## Audit Logs

O sistema registra os seguintes eventos:

| Action | Descrição |
|--------|-----------|
| `AUTO_PO_CREATED` | Nova PO AUTO criada |
| `AUTO_PO_UPDATED` | PO AUTO existente atualizada |
| `AUTO_PO_SKIPPED` | Auto PO não criada (ex: manual DRAFT existe) |
| `AUTO_ITEM_SKIPPED_NO_SUPPLIER` | Item ignorado por falta de fornecedor |
| `JOB_AUTO_PO_GENERATION` | Resumo da execução do job |
| `AUTO_PO_ERROR` | Erro durante processamento |

---

## Interface do Usuário

### Filtros na Página de Pedidos

- **Origem**: Todos / Manual / Automático
- **Status**: Todos / Rascunho / Aprovado / Enviado / Entregue
- **Cotação pendente**: Checkbox para filtrar itens sem preço

### Badges Visuais

- **AUTO** (azul): Pedido gerado automaticamente
- **COTAÇÃO** (amarelo): Pedido com itens sem preço cadastrado

### Informações Adicionais

- Janela de criação (para POs AUTO)
- Última atualização automática
- Indicador de item sem preço na lista de itens

---

## Fluxo Completo

```
┌─────────────────┐
│   Worker Job    │
│ (a cada 60s/6h) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Buscar orgs     │
│ ativas          │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Para cada org:                  │
│ 1. Buscar itens críticos       │
│    (saldo <= minimo)           │
│ 2. Resolver fornecedor         │
│ 3. Agrupar por supplierId      │
└────────┬───────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Para cada fornecedor:           │
│ 1. Verificar manual DRAFT       │
│ 2. Calcular dedupeKey           │
│ 3. Buscar PO existente          │
│ 4. CRIAR ou ATUALIZAR PO        │
│ 5. Criar/Atualizar Kanban       │
│ 6. Registrar audit logs         │
└─────────────────────────────────┘
```

---

## Como Testar

### 1. Executar Testes Automatizados

```bash
# Na raiz do projeto
pnpm -C apps/worker test
```

### 2. Testar Manualmente

1. **Preparar dados**:
   - Certifique-se de ter itens com `saldo <= minimo`
   - Configure um fornecedor como `isDefault = true`

2. **Iniciar o worker**:
   ```bash
   pnpm dev
   ```

3. **Aguardar execução** (60s em DEV):
   - Observe os logs do worker
   - Verifique POs criadas na UI

4. **Validar**:
   - POs AUTO têm badge "AUTO"
   - Itens sem preço têm badge "COTAÇÃO"
   - Audit logs mostram ações do sistema

### 3. Validar Idempotência

1. Anote o número de POs AUTO no banco
2. Aguarde outra execução (ou reinicie o worker)
3. Verifique que não foram criadas novas POs duplicadas

### 4. Validar QTY Nunca Reduz

1. Crie um cenário onde a qty deveria reduzir (aumente saldo de um item)
2. Execute o job
3. Verifique que a qty no PO item não reduziu

---

## Troubleshooting

### POs AUTO não estão sendo criadas

1. Verifique se `AUTO_PO_ENABLED=true`
2. Verifique se há itens críticos (saldo <= minimo)
3. Verifique se há fornecedor configurado (item ou default da org)
4. Verifique audit logs por `AUTO_PO_SKIPPED`

### Muitas POs sendo criadas

1. Verifique a janela de dedupe (`AUTO_PO_WINDOW_HOURS`)
2. Verifique se não há múltiplos workers rodando

### Itens sendo ignorados

1. Verifique audit logs por `AUTO_ITEM_SKIPPED_NO_SUPPLIER`
2. Configure fornecedor preferencial ou default da org

---

## Segurança

- **Multi-tenant**: Todas as operações são filtradas por `organizationId`
- **Apenas DRAFT**: Sistema nunca aprova ou envia POs
- **RBAC**: Aprovação/envio continua manual via permissões existentes
- **Audit trail**: Todas as ações são registradas

---

## Roadmap Futuro

- [ ] Suporte a regras de fornecedor por categoria
- [ ] Integração com cotações automáticas
- [ ] Notificações de POs AUTO criadas
- [ ] Dashboard de métricas do auto-PO
- [ ] Configuração de thresholds personalizados por org
