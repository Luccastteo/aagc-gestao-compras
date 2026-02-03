'use client';

import { useQuery } from '@tanstack/react-query';
import { itemsApi, purchaseOrdersApi } from '@/lib/api';
import { Package, ShoppingCart, AlertTriangle, TrendingUp, Bot, Zap } from 'lucide-react';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export default function DashboardPage() {
  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: itemsApi.getAll,
  });

  const { data: criticalItems } = useQuery({
    queryKey: ['items', 'critical'],
    queryFn: itemsApi.getCritical,
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: purchaseOrdersApi.getAll,
  });

  const pendingPOs = purchaseOrders?.filter((po: any) => 
    ['DRAFT', 'APPROVED', 'SENT'].includes(po.status)
  ) || [];

  const totalValue = purchaseOrders?.reduce((sum: number, po: any) => sum + po.valorTotal, 0) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="w-8 h-8 text-primary" />
          Painel de Controle
        </h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema e métricas</p>
      </div>

      {/* Agent Status */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">Agente AAGC Ativo</p>
            <p className="text-sm text-muted-foreground">
              Monitorando estoque e processando pedidos automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Itens</p>
              <p className="text-2xl font-bold mt-1">{items?.length || 0}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Itens Críticos</p>
              <p className="text-2xl font-bold mt-1 text-red-500">
                {criticalItems?.length || 0}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
              <p className="text-2xl font-bold mt-1">{pendingPOs.length}</p>
            </div>
            <ShoppingCart className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold mt-1">
                R$ {totalValue.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      {/* Critical Items Alert */}
      {criticalItems && criticalItems.length > 0 && (
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Itens com Estoque Crítico
          </h2>
          <div className="space-y-2">
            {criticalItems.map((item: any) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-card rounded-md"
              >
                <div>
                  <p className="font-medium">{item.sku}</p>
                  <p className="text-sm text-muted-foreground">{item.descricao}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    Estoque: <span className="font-bold text-red-500">{item.saldo}</span> / 
                    Mínimo: {item.minimo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Purchase Orders */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Pedidos de Compra Recentes</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Código</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fornecedor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Valor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders?.slice(0, 5).map((po: any) => (
                <tr key={po.id} className="border-t border-border">
                  <td className="px-4 py-3 text-sm">{po.codigo}</td>
                  <td className="px-4 py-3 text-sm">{po.supplier.nome}</td>
                  <td className="px-4 py-3 text-sm">R$ {po.valorTotal.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
