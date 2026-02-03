'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, itemsApi } from '@/lib/api';
import { CheckCircle, Send, Package, Plus, Bot, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [showCreateFromAnalysis, setShowCreateFromAnalysis] = useState(false);

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: purchaseOrdersApi.getAll,
  });

  const { data: analysis } = useQuery({
    queryKey: ['items', 'analyze'],
    queryFn: itemsApi.analyze,
    enabled: showCreateFromAnalysis,
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
        {purchaseOrders?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum pedido de compra encontrado</p>
          </div>
        ) : (
          purchaseOrders?.map((po: any) => (
            <div key={po.id} className="p-6 bg-card border border-border rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{po.codigo}</h3>
                  <p className="text-sm text-muted-foreground">
                    Fornecedor: {po.supplier.nome}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Criado por: {po.createdBy.name}
                  </p>
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
                </div>
              </div>

              {/* Items */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Itens do Pedido:</h4>
                <div className="space-y-2">
                  {po.items.map((poItem: any) => (
                    <div
                      key={poItem.id}
                      className="flex justify-between p-3 bg-secondary rounded-md text-sm"
                    >
                      <div>
                        <p className="font-medium">{poItem.item.sku}</p>
                        <p className="text-muted-foreground">{poItem.item.descricao}</p>
                      </div>
                      <div className="text-right">
                        <p>Qtd: {poItem.quantidade}</p>
                        <p>R$ {poItem.valorTotal.toFixed(2)}</p>
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
