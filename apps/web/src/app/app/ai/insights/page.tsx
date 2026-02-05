'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Brain, 
  Sparkles, 
  Send,
  Package,
  ShoppingCart,
  RefreshCw
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; score: number }>;
}

export default function AIInsightsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');

  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const { data } = await api.get('/ai/insights');
      return data;
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (q: string) => {
      const { data } = await api.post('/ai/chat', { question: q });
      return data;
    },
    onSuccess: (data, variables) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: variables },
        { role: 'assistant', content: data.answer, sources: data.sources },
      ]);
      setQuestion('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !chatMutation.isPending) {
      chatMutation.mutate(question);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Carregando insights...
      </div>
    );
  }

  const hasData = insights && (
    insights.demandForecasts?.length > 0 ||
    insights.supplierRankings?.length > 0 ||
    insights.recentDecisions?.length > 0 ||
    insights.purchaseSuggestions?.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" aria-hidden="true" />
            Insights de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Análises, alertas e sugestões inteligentes do sistema
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          aria-label="Atualizar insights"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {/* Summary Cards */}
      {insights?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm">Alertas Críticos</span>
            </div>
            <p className="text-3xl font-bold mt-2">{insights.summary.criticalAlerts}</p>
          </div>
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400">
              <ShoppingCart className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm">Sugestões Pendentes</span>
            </div>
            <p className="text-3xl font-bold mt-2">{insights.summary.pendingSuggestions}</p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400">
              <Package className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm">Fornecedores Avaliados</span>
            </div>
            <p className="text-3xl font-bold mt-2">{insights.summary.suppliersEvaluated}</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm">Decisões Hoje</span>
            </div>
            <p className="text-3xl font-bold mt-2">{insights.summary.decisionsToday}</p>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
          <h2 className="text-xl font-semibold mb-2">Sem dados de insights ainda</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Os insights serão gerados conforme o sistema analisa seu estoque e fornecedores.
            Execute a análise de estoque para gerar alertas e sugestões.
          </p>
        </div>
      )}

      {/* Purchase Suggestions */}
      {insights?.purchaseSuggestions?.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" aria-hidden="true" />
            Sugestões de Compra
          </h2>
          <div className="space-y-3">
            {insights.purchaseSuggestions.map((suggestion: any) => (
              <div key={suggestion.id} className="p-4 bg-card border border-border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{suggestion.sku}</h3>
                    <p className="text-sm text-muted-foreground">{suggestion.itemName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fornecedor: {suggestion.supplierName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Motivo: {suggestion.reason || 'Estoque crítico'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{suggestion.suggestedQty}</div>
                    <p className="text-xs text-muted-foreground">unidades</p>
                    <p className="text-sm text-primary mt-1">
                      R$ {Number(suggestion.estimatedTotal).toFixed(2)}
                    </p>
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        suggestion.urgencyScore >= 80 
                          ? 'bg-red-500/20 text-red-400' 
                          : suggestion.urgencyScore >= 50 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        Urgência: {suggestion.urgencyScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demand Forecasts / Alerts */}
      {insights?.demandForecasts?.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" aria-hidden="true" />
            Alertas de Estoque
          </h2>
          <div className="space-y-3">
            {insights.demandForecasts.map((forecast: any) => (
              <div key={forecast.itemId} className="p-4 bg-card border border-border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{forecast.sku}</h3>
                    <p className="text-sm text-muted-foreground">{forecast.itemName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estoque atual: {forecast.currentStock} unidades
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                      forecast.severity === 'HIGH' 
                        ? 'bg-red-500/20 text-red-400' 
                        : forecast.severity === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {forecast.alertType} - {forecast.severity}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {forecast.trend === 'UP' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                      )}
                      <span className="text-2xl font-bold">{forecast.predictedDemand30d}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">necessário repor</p>
                    <p className="text-xs text-primary mt-1">
                      Confiança: {(forecast.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplier Rankings */}
      {insights?.supplierRankings?.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            Ranking de Fornecedores
          </h2>
          <div className="space-y-3">
            {insights.supplierRankings.map((supplier: any) => (
              <div key={supplier.supplierId} className="p-4 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-bold">
                    #{supplier.rank}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{supplier.name}</h3>
                    <div className="flex gap-4 mt-2 text-xs flex-wrap">
                      <span>Pontualidade: {supplier.factors.onTime.toFixed(0)}%</span>
                      <span>Qualidade: {supplier.factors.quality.toFixed(0)}%</span>
                      <span>Preço: {supplier.factors.price.toFixed(0)}%</span>
                      <span>Comunicação: {supplier.factors.communication.toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {supplier.ordersDelivered} pedidos entregues
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{supplier.score.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">score total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent AI Decisions */}
      {insights?.recentDecisions?.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            Decisões Recentes do Sistema
          </h2>
          <div className="space-y-3">
            {insights.recentDecisions.map((decision: any) => (
              <div key={decision.id} className="p-4 bg-card border border-border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          decision.type === 'AUTO_APPROVE'
                            ? 'bg-green-500/20 text-green-400'
                            : decision.type === 'ESCALATE'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {decision.type}
                      </span>
                      <span className="font-semibold">{decision.item}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Confiança: {(decision.confidence * 100).toFixed(0)}% • {decision.result}
                    </p>
                    {decision.reasoning && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-md">
                        {decision.reasoning}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(decision.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-secondary border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            Consultar Base de Conhecimento
          </h2>
        </div>

        <div className="h-64 overflow-y-auto p-6 space-y-4" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-16">
              <p className="text-sm">Faça uma pergunta para começar</p>
              <p className="text-xs mt-2">Ex: "Qual é a política de aprovação automática?"</p>
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
            <label htmlFor="ai-question" className="sr-only">
              Pergunta para a IA
            </label>
            <input
              id="ai-question"
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
              <Send className="w-4 h-4" aria-hidden="true" />
              {chatMutation.isPending ? '...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
