'use client';

import { useQuery } from '@tanstack/react-query';
import { itemsApi, purchaseOrdersApi, auditApi } from '@/lib/api';
import { Package, ShoppingCart, AlertTriangle, TrendingUp, Bot, Zap, BarChart3, PieChart, Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

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

  const { data: auditStats } = useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: auditApi.getStats,
  });

  const pendingPOs = purchaseOrders?.filter((po: any) => 
    ['DRAFT', 'APPROVED', 'SENT'].includes(po.status)
  ) || [];

  const totalValue = purchaseOrders?.reduce((sum: number, po: any) => sum + po.valorTotal, 0) || 0;

  // Dados para gráfico de status dos pedidos
  const orderStatusData = [
    { name: 'Rascunho', value: purchaseOrders?.filter((po: any) => po.status === 'DRAFT').length || 0, color: '#6b7280' },
    { name: 'Aprovado', value: purchaseOrders?.filter((po: any) => po.status === 'APPROVED').length || 0, color: '#3b82f6' },
    { name: 'Enviado', value: purchaseOrders?.filter((po: any) => po.status === 'SENT').length || 0, color: '#f59e0b' },
    { name: 'Entregue', value: purchaseOrders?.filter((po: any) => po.status === 'DELIVERED').length || 0, color: '#22c55e' },
  ];

  // Dados para gráfico de pizza - distribuição de estoque
  const stockDistribution = [
    { name: 'Normal', value: (items?.filter((i: any) => i.saldo > i.minimo).length || 0), color: '#22c55e' },
    { name: 'Crítico', value: (items?.filter((i: any) => i.saldo <= i.minimo && i.saldo > 0).length || 0), color: '#f59e0b' },
    { name: 'Zerado', value: (items?.filter((i: any) => i.saldo === 0).length || 0), color: '#ef4444' },
  ];

  // Dados para gráfico de barras - Top 5 itens por valor em estoque
  const topItemsByValue = items
    ?.map((item: any) => ({
      name: item.sku.substring(0, 10),
      valor: item.saldo * item.custoUnitario,
      quantidade: item.saldo,
    }))
    .sort((a: any, b: any) => b.valor - a.valor)
    .slice(0, 6) || [];

  // Dados para gráfico de área - Níveis de estoque
  const stockLevels = items
    ?.slice(0, 8)
    .map((item: any) => ({
      name: item.sku.substring(0, 8),
      atual: item.saldo,
      minimo: item.minimo,
      maximo: item.maximo,
    })) || [];

  // Valor total em estoque
  const totalStockValue = items?.reduce((sum: number, item: any) => sum + (item.saldo * item.custoUnitario), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="w-8 h-8 text-primary" />
          Painel de Controle
        </h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema e métricas em tempo real</p>
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
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-500">Online</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Itens</p>
              <p className="text-2xl font-bold mt-1">{items?.length || 0}</p>
            </div>
            <Package className="w-9 h-9 text-blue-500" />
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Itens Críticos</p>
              <p className="text-2xl font-bold mt-1 text-red-500">
                {criticalItems?.length || 0}
              </p>
            </div>
            <AlertTriangle className="w-9 h-9 text-red-500" />
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
              <p className="text-2xl font-bold mt-1">{pendingPOs.length}</p>
            </div>
            <ShoppingCart className="w-9 h-9 text-yellow-500" />
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor em Compras</p>
              <p className="text-xl font-bold mt-1">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="w-9 h-9 text-green-500" />
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor em Estoque</p>
              <p className="text-xl font-bold mt-1 text-purple-500">
                R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Activity className="w-9 h-9 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Pedidos */}
        <div className="p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Status dos Pedidos de Compra
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={orderStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                {orderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Estoque */}
        <div className="p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Situação do Estoque
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={stockDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {stockDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Itens por Valor */}
        <div className="p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Top Itens por Valor em Estoque
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topItemsByValue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
              />
              <Bar dataKey="valor" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Níveis de Estoque */}
        <div className="p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Níveis de Estoque vs Limites
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stockLevels}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="maximo" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Máximo" />
              <Area type="monotone" dataKey="atual" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Atual" />
              <Area type="monotone" dataKey="minimo" stackId="3" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Mínimo" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Critical Items Alert */}
      {criticalItems && criticalItems.length > 0 && (
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Itens com Estoque Crítico - Ação Necessária
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalItems.slice(0, 6).map((item: any) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-card rounded-md border border-border"
              >
                <div>
                  <p className="font-medium">{item.sku}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-[150px]">{item.descricao}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-500">{item.saldo}</p>
                  <p className="text-xs text-muted-foreground">mín: {item.minimo}</p>
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
                <th className="px-4 py-3 text-left text-sm font-medium">Itens</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Valor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum pedido de compra encontrado
                  </td>
                </tr>
              ) : (
                purchaseOrders?.slice(0, 5).map((po: any) => (
                  <tr key={po.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 text-sm font-medium">{po.codigo}</td>
                    <td className="px-4 py-3 text-sm">{po.supplier?.nome || '-'}</td>
                    <td className="px-4 py-3 text-sm">{po.items?.length || 0} itens</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      R$ {po.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          po.status === 'DRAFT'
                            ? 'bg-gray-500/20 text-gray-300'
                            : po.status === 'APPROVED'
                            ? 'bg-blue-500/20 text-blue-300'
                            : po.status === 'SENT'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : po.status === 'DELIVERED'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {statusLabels[po.status] || po.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Stats */}
      {auditStats && (
        <div className="p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Atividade do Sistema</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-secondary rounded-lg">
              <p className="text-2xl font-bold text-primary">{auditStats.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total de Ações</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <p className="text-2xl font-bold text-green-500">{auditStats.byAction?.CREATE || 0}</p>
              <p className="text-sm text-muted-foreground">Criações</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <p className="text-2xl font-bold text-blue-500">{auditStats.byAction?.UPDATE || 0}</p>
              <p className="text-sm text-muted-foreground">Atualizações</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <p className="text-2xl font-bold text-yellow-500">{auditStats.byAction?.APPROVE || 0}</p>
              <p className="text-sm text-muted-foreground">Aprovações</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
