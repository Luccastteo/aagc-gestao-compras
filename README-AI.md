# 🤖 AAGC AI System - Documentação Técnica

## 📋 Visão Geral

Este documento descreve a transformação do AAGC de um sistema de automação determinístico (2/10 em IA) para um agente de IA completo (10/10).

### Arquitetura do Sistema de IA

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA DE IA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │     LLM      │  │     RAG      │  │  Decision Engine     │  │
│  │  (OpenAI)    │  │ (pgvector)   │  │  (Regras + ML)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┴──────────────────────┘              │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                  CAMADA ML (Python)                              │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                     │
│  ┌────────────┐  ┌────────▼──────┐  ┌──────────────────────┐  │
│  │  Prophet   │  │  XGBoost      │  │  Scikit-learn        │  │
│  │ (Forecast) │  │ (Urgency)     │  │  (Supplier Rank)     │  │
│  └────────────┘  └───────────────┘  └──────────────────────┘  │
│                                                                 │
│                    FastAPI (porta 8001)                         │
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                  CAMADA DE DADOS                                 │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────┐     │
│  │  PostgreSQL + pgvector                                 │     │
│  │  - Dados históricos (consumption, prices, suppliers)   │     │
│  │  - Embeddings vetoriais (knowledge base)               │     │
│  │  - Logs de decisões (auditoria)                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Redis (BullMQ)                                         │     │
│  │  - Filas de jobs (auto-po, ml-collection)              │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

## 🧠 Componentes de IA

### 1. LLM Service (`apps/api/src/ai/ai.service.ts`)

**Responsabilidades:**
- Chat conversacional
- Explicação de decisões de compra
- Geração de mensagens profissionais para fornecedores
- Análise de exceções e recomendações

**Tecnologia:** OpenAI API (GPT-4 Turbo)

**Endpoints:**
```typescript
POST /ai/chat
POST /ai/decision/evaluate
```

**Exemplo de uso:**
```bash
curl -X POST http://localhost:3001/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"question": "Por que o item X está em falta?"}'
```

### 2. RAG Service (`apps/api/src/ai/rag.service.ts`)

**Responsabilidades:**
- Geração de embeddings (OpenAI `text-embedding-3-small`)
- Indexação de documentos na base de conhecimento
- Busca semântica com pgvector
- Respostas contextualizadas usando documentos relevantes

**Modelos Prisma:**
- `KnowledgeDocument`: Armazena documentos com embeddings vetoriais

**Exemplo de indexação:**
```typescript
await ragService.indexDocument({
  organizationId: 'org-123',
  title: 'Política de Compras',
  content: 'Itens críticos devem ser comprados com 7 dias de antecedência...',
  category: 'POLICY',
});
```

**Busca semântica:**
```typescript
const results = await ragService.semanticSearch(
  'org-123',
  'política de compras de itens críticos',
  5 // top 5 resultados
);
```

### 3. Decision Engine (`apps/api/src/ai/decision-engine.service.ts`)

**Responsabilidades:**
- Avaliar decisões de compra baseadas em:
  - Políticas organizacionais (`PurchasePolicy`)
  - Score de urgência ML
  - Performance de fornecedores
  - Estoque atual e consumo histórico
- Logar todas as decisões para auditoria

**Modelo de decisão:**
```typescript
interface DecisionResult {
  action: 'APPROVE' | 'REJECT' | 'REVIEW';
  confidence: number; // 0-100%
  reasoning: string[];
  suggestedQuantity?: number;
  estimatedDeliveryDays?: number;
}
```

**Exemplo:**
```typescript
const decision = await decisionEngine.evaluatePurchaseDecision({
  organizationId: 'org-123',
  itemId: 'item-456',
  supplierId: 'sup-789',
  requestedQuantity: 100,
  currentStock: 20,
  minStock: 50,
  avgDailyConsumption: 10,
  leadTimeDays: 5,
  unitPrice: 25.00,
});
```

## 🔬 ML Service (Python FastAPI)

### Setup

```bash
cd apps/ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

### Endpoints

#### 1. Forecast (Prophet)
```bash
POST /forecast
{
  "item_id": "item-123",
  "history": [10, 12, 15, 14, 16, 18, 20],
  "horizon": 7
}

Response:
{
  "forecast": [21.5, 22.3, 23.1, 24.0, 24.8, 25.6, 26.4]
}
```

#### 2. Urgency Score (XGBoost)
```bash
POST /urgency-score
{
  "current_stock": 5,
  "min_stock": 10,
  "avg_consumption": 2,
  "lead_time_days": 7,
  "days_until_stockout": 2
}

Response:
{
  "urgency_score": 0.89,
  "category": "CRITICAL"
}
```

#### 3. Supplier Ranking (Scikit-learn)
```bash
POST /rank-suppliers
{
  "suppliers": [
    {
      "supplier_id": "sup-1",
      "price": 100,
      "lead_time_days": 5,
      "on_time_rate": 0.95,
      "quality_score": 0.98
    }
  ]
}

Response:
{
  "ranked": [
    {
      "supplier_id": "sup-1",
      "score": 0.92,
      "reasoning": "Excelente qualidade e pontualidade"
    }
  ]
}
```

## 📊 Modelos de Dados AI

### ConsumptionHistory
```prisma
model ConsumptionHistory {
  id             String   @id @default(uuid())
  organizationId String
  itemId         String
  date           DateTime
  quantity       Float
  dayOfWeek      Int
  month          Int
  quarter        Int
  year           Int
  weekOfYear     Int
  isHoliday      Boolean
  source         String
}
```

### SupplierPerformance
```prisma
model SupplierPerformance {
  id                   String   @id @default(uuid())
  organizationId       String
  supplierId           String
  avgLeadTimeDays      Float
  onTimeDeliveryRate   Float
  qualityScore         Float
  priceCompetitiveness Float
  totalOrders          Int
  calculatedAt         DateTime
}
```

### MLPrediction
```prisma
model MLPrediction {
  id             String   @id @default(uuid())
  organizationId String
  itemId         String
  predictionType String   // 'DEMAND', 'URGENCY', 'PRICE'
  predictedValue Float
  confidence     Float
  horizon        Int
  createdAt      DateTime
  metadata       Json?
}
```

### DecisionLog
```prisma
model DecisionLog {
  id             String   @id @default(uuid())
  organizationId String
  decisionType   String
  context        Json
  result         Json
  aiReasoning    String?
  humanFeedback  String?
  createdAt      DateTime
}
```

### KnowledgeDocument
```prisma
model KnowledgeDocument {
  id             String   @id @default(uuid())
  organizationId String
  title          String
  content        String
  category       String   // 'POLICY', 'FAQ', 'PROCEDURE', 'GUIDELINE'
  // embedding   Vector(1536) // pgvector
  metadata       Json?
  createdAt      DateTime
}
```

### PurchasePolicy
```prisma
model PurchasePolicy {
  id                    String   @id @default(uuid())
  organizationId        String
  name                  String
  autoApprovalThreshold Float    // Valor máximo para aprovação automática
  minLeadTimeDays       Int      // Lead time mínimo exigido
  safetyStockMultiplier Float    // Multiplicador do estoque de segurança
  urgencyThreshold      Float    // Threshold do score de urgência
  isActive              Boolean
  createdAt             DateTime
}
```

## 🤖 Workers BullMQ

### Auto PO Generation (Existente)
- **Fila:** `auto_po_generation`
- **Frequência:** A cada 60s em dev, diariamente em produção
- **Função:** Gera POs automaticamente baseado em consumo

### ML Data Collection (Novo)
- **Fila:** `ml_data_collection`
- **Frequência:** Diariamente às 02:00
- **Função:**
  1. Calcula histórico de consumo (`ConsumptionHistory`)
  2. Atualiza performance de fornecedores (`SupplierPerformance`)
  3. Rastreia mudanças de preços (`PriceHistory`)

**Código:**
```typescript
// apps/worker/src/ml-data-collection.ts
export async function processMLDataCollection(orgId: string) {
  await calculateConsumptionHistory(orgId);
  await updateSupplierPerformance(orgId);
  await trackPriceChanges(orgId);
}
```

## 🎨 Frontend AI

### Chat Interface (`apps/web/src/app/app/ai/page.tsx`)
- Chat conversacional com RAG
- Citações de fontes
- Interface moderna com Tailwind CSS

### Insights Dashboard (`apps/web/src/app/app/ai/insights/page.tsx`)
- Previsões de demanda
- Ranking de fornecedores
- Decisões recentes do AI
- Métricas de performance

## 🚀 Instalação e Configuração

### 1. Pré-requisitos
```bash
- Docker & Docker Compose
- Node.js 18+ & pnpm
- Git
```

### 2. Clone e configure
```bash
git clone https://github.com/Luccastteo/aagc-gestao-compras
cd aagc-gestao-compras/aagc-saas
chmod +x scripts/*.sh
./scripts/start-ai-system.sh
```

### 3. Configure variáveis de ambiente
```bash
# apps/api/.env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
ML_SERVICE_URL=http://localhost:8001
ENABLE_AUTO_APPROVAL=true
ENABLE_AUTO_PURCHASE=true
```

### 4. Inicie o sistema
```bash
pnpm dev
```

### 5. Valide a instalação
```bash
./scripts/validate-ai-system.sh
```

## 🧪 Testes

### Teste ML Service
```bash
# Forecast
curl -X POST http://localhost:8001/forecast \
  -H "Content-Type: application/json" \
  -d '{"item_id":"test","history":[1,2,3,4,5,6,7],"horizon":7}'

# Urgency Score
curl -X POST http://localhost:8001/urgency-score \
  -H "Content-Type: application/json" \
  -d '{"current_stock":5,"min_stock":10,"avg_consumption":2,"lead_time_days":7}'
```

### Teste API AI (com autenticação)
```bash
# Login
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!@#"}' \
  | jq -r '.access_token')

# Chat AI
curl -X POST http://localhost:3001/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"Quais itens estão em falta?"}'
```

## 📈 Métricas e Monitoramento

### Logs de Decisão
```sql
-- Ver últimas decisões de IA
SELECT * FROM decision_logs
ORDER BY created_at DESC
LIMIT 10;

-- Taxa de aprovação automática
SELECT 
  result->>'action' as action,
  COUNT(*) as count,
  AVG((result->>'confidence')::float) as avg_confidence
FROM decision_logs
WHERE decision_type = 'PURCHASE_EVALUATION'
GROUP BY result->>'action';
```

### Performance do ML
```sql
-- Acurácia das previsões
SELECT 
  prediction_type,
  AVG(confidence) as avg_confidence,
  COUNT(*) as total_predictions
FROM ml_predictions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY prediction_type;
```

## 🔧 Troubleshooting

### ML Service não inicia
```bash
# Verificar logs
docker logs aagc-ml-service -f

# Reconstruir imagem
docker-compose build ml-service
docker-compose up -d ml-service
```

### pgvector não habilitado
```bash
docker exec -it aagc-postgres psql -U aagc -d aagc_db
CREATE EXTENSION IF NOT EXISTS vector;
\dx
```

### OpenAI API Key inválida
```bash
# Verificar variável de ambiente
echo $OPENAI_API_KEY

# Testar diretamente
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## 🎯 Roadmap

- [ ] Fine-tuning de modelos específicos para o domínio
- [ ] A/B testing de estratégias de compra
- [ ] Modelo de recomendação de fornecedores
- [ ] Detecção de anomalias em consumo
- [ ] Interface de chat por voz
- [ ] Integração com mais LLMs (Anthropic Claude, Google Gemini)

## 📚 Referências

- [OpenAI API](https://platform.openai.com/docs)
- [Prophet Forecasting](https://facebook.github.io/prophet/)
- [pgvector](https://github.com/pgvector/pgvector)
- [FastAPI](https://fastapi.tiangolo.com/)
- [BullMQ](https://docs.bullmq.io/)

---

**Desenvolvido com ❤️ por AAGC Team**
