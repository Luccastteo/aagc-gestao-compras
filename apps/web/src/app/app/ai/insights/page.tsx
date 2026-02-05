'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Brain } from 'lucide-react';

export default function AIInsightsPage() {
  // Placeholder - endpoints serão implementados
  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      // Retorna dados mockados por enquanto
      return {
        demandForecasts: [
          {
            itemId: '1',
            itemName: 'Rolamento 6205',
            sku: 'ROL-6205',
            currentStock: 3,
            predictedDemand30d: 25,
            confidence: 0.85,
            trend: 'UP',
          },
          {
            itemId: '2',
            itemName: 'Filtro Hidráulico',
            sku: 'FILTRO-HYD-001',
            currentStock: 0,
            predictedDemand30d: 8,
            confidence: 0.78,
            trend: 'STABLE',
          },
        ],
        supplierRankings: [
          {
            supplierId: 's1',
            name: 'Rolamentos Brasil',
            score: 87.5,
            rank: 1,
            factors: {
              onTime: 92,
              quality: 88,
              price: 85,
              communication: 90,
            },
          },
          {
            supplierId: 's2',
            name: 'Peças Industriais SP',
            score: 76.3,
            rank: 2,
            factors: {
              onTime: 78,
              quality: 75,
              price: 80,
              communication: 72,
            },
          },
        ],
        recentDecisions: [
          {
            id: 'd1',
            type: 'AUTO_APPROVE',
            item: 'ROL-6206',
            confidence: 0.85,
            result: 'APPROVED',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'd2',
            type: 'ESCALATE',
            item: 'VALVULA-HIDRA-001',
            confidence: 0.65,
            result: 'PENDING_REVIEW',
            timestamp: new Date().toISOString(),
          },
        ],
      };
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando insights...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          Insights de IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Previsões, análises e decisões autônomas do sistema
        </p>
      </div>

      {/* Demand Forecasts */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Previsões de Demanda (30 dias)
        </h2>
        <div className="space-y-3">
          {insights?.demandForecasts.map((forecast: any) => (
            <div key={forecast.itemId} className="p-4 bg-card border border-border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{forecast.sku}</h3>
                  <p className="text-sm text-muted-foreground">{forecast.itemName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estoque atual: {forecast.currentStock} unidades
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {forecast.trend === 'UP' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-2xl font-bold">{forecast.predictedDemand30d}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">unidades previstas</p>
                  <p className="text-xs text-primary mt-1">
                    Confiança: {(forecast.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supplier Rankings */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Ranking de Fornecedores (ML)
        </h2>
        <div className="space-y-3">
          {insights?.supplierRankings.map((supplier: any, idx: number) => (
            <div key={supplier.supplierId} className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-bold">
                  #{supplier.rank}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{supplier.name}</h3>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span>Pontualidade: {supplier.factors.onTime}%</span>
                    <span>Qualidade: {supplier.factors.quality}%</span>
                    <span>Preço: {supplier.factors.price}%</span>
                    <span>Comunicação: {supplier.factors.communication}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{supplier.score}</div>
                  <p className="text-xs text-muted-foreground">score total</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent AI Decisions */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Decisões Recentes da IA
        </h2>
        <div className="space-y-3">
          {insights?.recentDecisions.map((decision: any) => (
            <div key={decision.id} className="p-4 bg-card border border-border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        decision.type === 'AUTO_APPROVE'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {decision.type}
                    </span>
                    <span className="font-semibold">{decision.item}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confiança: {(decision.confidence * 100).toFixed(0)}% • {decision.result}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(decision.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-secondary border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Consultar Base de Conhecimento
          </h2>
        </div>

        <div className="h-64 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-16">
              <p className="text-sm">Faça uma pergunta para começar</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xl p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <p className="text-xs opacity-70 mb-1">Fontes:</p>
                      <ul className="text-xs opacity-70 space-y-0.5">
                        {msg.sources.map((s, i) => (
                          <li key={i}>• {s.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-secondary/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual é a política de aprovação automática?"
              className="flex-1 px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={chatMutation.isPending}
            />
            <button
              type="submit"
              disabled={chatMutation.isPending || !question.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {chatMutation.isPending ? '...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
