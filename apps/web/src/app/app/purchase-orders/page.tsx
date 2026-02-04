'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, itemsApi } from '@/lib/api';
import { CheckCircle, Send, Package, Plus, Bot, ShoppingCart, Filter, AlertTriangle, Zap } from 'lucide-react';
import { useState } from 'react';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const sourceLabels: Record<string, string> = {
  MANUAL: 'Manual',
  AUTO_REPLENISH: 'Automático',
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [showCreateFromAnalysis, setShowCreateFromAnalysis] = useState(false);
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showNeedsQuoteOnly, setShowNeedsQuoteOnly] = useState(false);

  const { data: purchaseOrdersResponse, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: purchaseOrdersApi.getAll,
  });

  // Extrair array de dados da resposta paginada e aplicar filtros
  const allPurchaseOrders = purchaseOrdersResponse?.data || [];
  const purchaseOrders = allPurchaseOrders.filter((po: any) => {
    if (filterSource !== 'ALL' && po.source !== filterSource) return false;
    if (filterStatus !== 'ALL' && po.status !== filterStatus) return false;
    if (showNeedsQuoteOnly && !po.needsQuote) return false;
    return true;
  });

  const { data: analysis } = useQuery({
    queryKey: ['items', 'analyze'],
    queryFn: itemsApi.analyze,
    enabled: showCreateFromAnalysis,
  });

  const createFromSuggestionsMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.createFromSuggestions({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      // Re-analisar para refletir status USED no backend
      queryClient.invalidateQueries({ queryKey: ['items', 'analyze'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.receive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            Pedidos de Compra
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie o ciclo de vida dos pedidos</p>
        </div>
        <button
          onClick={() => setShowCreateFromAnalysis(!showCreateFromAnalysis)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Bot className="w-4 h-4" />
          Sugestões do Agente
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-secondary/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Origem:</label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-md text-sm"
          >
            <option value="ALL">Todos</option>
            <option value="MANUAL">Manual</option>
            <option value="AUTO_REPLENISH">Automático</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-md text-sm"
          >
            <option value="ALL">Todos</option>
            <option value="DRAFT">Rascunho</option>
            <option value="APPROVED">Aprovado</option>
            <option value="SENT">Enviado</option>
            <option value="DELIVERED">Entregue</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showNeedsQuoteOnly}
            onChange={(e) => setShowNeedsQuoteOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            Apenas com cotação pendente
          </span>
        </label>

        <div className="ml-auto text-sm text-muted-foreground">
          {purchaseOrders.length} de {allPurchaseOrders.length} pedidos
        </div>
      </div>

      {/* Agent Suggestions */}
      {showCreateFromAnalysis && analysis?.suggestions && analysis.suggestions.length > 0 && (
        <div className="p-6 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Sugestões Automáticas de Compra</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            O agente identificou {analysis.itemsCriticos} itens críticos que precisam de reposição.
            Valor total estimado: R$ {analysis.valorTotalEstimado?.toFixed(2)}
          </p>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => createFromSuggestionsMutation.mutate()}
              disabled={createFromSuggestionsMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {createFromSuggestionsMutation.isPending ? 'Gerando...' : 'Gerar Pedido(s) (rascunho)'}
            </button>
          </div>
          <div className="space-y-2">
            {analysis.suggestions.slice(0, 5).map((sug: any) => (
              <div key={sug.itemId} className="flex justify-between items-center p-3 bg-card rounded-md">
                <div>
                  <p className="font-medium">{sug.sku}</p>
                  <p className="text-sm text-muted-foreground">{sug.descricao}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Comprar: {sug.sugestaoCompra} un</p>
                  <p className="text-sm text-muted-foreground">R$ {sug.custoEstimado.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Orders List */}
      <div className="space-y-4">
        {purchaseOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum pedido de compra encontrado</p>
          </div>
        ) : (
          purchaseOrders.map((po: any) => (
            <div key={po.id} className={`p-6 bg-card border rounded-lg ${po.source === 'AUTO_REPLENISH' ? 'border-primary/50' : 'border-border'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{po.codigo}</h3>
                    {/* Source Badge */}
                    {po.source === 'AUTO_REPLENISH' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium">
                        <Zap className="w-3 h-3" />
                        AUTO
                      </span>
                    )}
                    {/* Needs Quote Badge */}
                    {po.needsQuote && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        COTAÇÃO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fornecedor: {po.supplier.nome}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Criado por: {po.createdBy.name}
                  </p>
                  {po.dedupeKey && (
                    <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                      Janela: {po.windowStart ? new Date(po.windowStart).toLocaleString('pt-BR') : 'N/A'}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">R$ {po.valorTotal.toFixed(2)}</p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded text-sm ${
                      po.status === 'DRAFT'
                        ? 'bg-gray-500/20 text-gray-300'
                        : po.status === 'APPROVED'
                        ? 'bg-blue-500/20 text-blue-300'
                        : po.status === 'SENT'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}
                  >
                    {statusLabels[po.status] || po.status}
                  </span>
                  {po.lastAutoUpdateAt && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Última atualização auto: {new Date(po.lastAutoUpdateAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Itens do Pedido ({po.items.length}):</h4>
                <div className="space-y-2">
                  {po.items.map((poItem: any) => (
                    <div
                      key={poItem.id}
                      className={`flex justify-between p-3 rounded-md text-sm ${poItem.needsQuote ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-secondary'}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{poItem.item.sku}</p>
                          {poItem.needsQuote && (
                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Sem preço
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{poItem.item.descricao}</p>
                      </div>
                      <div className="text-right">
                        <p>Qtd: {poItem.quantidade}</p>
                        <p className={poItem.needsQuote ? 'text-yellow-400' : ''}>
                          {poItem.needsQuote ? 'A cotar' : `R$ ${poItem.valorTotal.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions - Workflow */}
              <div className="flex gap-2 flex-wrap">
                {po.status === 'DRAFT' && (
                  <button
                    onClick={() => approveMutation.mutate(po.id)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar Pedido
                  </button>
                )}

                {po.status === 'APPROVED' && (
                  <button
                    onClick={() => sendMutation.mutate(po.id)}
                    disabled={sendMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Enviar ao Fornecedor
                  </button>
                )}

                {po.status === 'SENT' && (
                  <button
                    onClick={() => receiveMutation.mutate(po.id)}
                    disabled={receiveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <Package className="w-4 h-4" />
                    Receber Mercadoria
                  </button>
                )}

                {po.status === 'DELIVERED' && (
                  <span className="px-4 py-2 bg-green-500/20 text-green-300 rounded-md">
                    ✓ Pedido Concluído
                  </span>
                )}

              </div>

              {po.observacoes && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Observações: {po.observacoes}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
