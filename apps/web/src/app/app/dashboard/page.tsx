'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { itemsApi, purchaseOrdersApi, auditApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatusBadge({ item }: { item: { saldo: number; minimo: number } }) {
  let status: 'critical' | 'low' | 'healthy' = 'healthy';
  let label = 'SAUDÁVEL';
  let className = 'bg-emerald-100 text-emerald-700';

  if (item.saldo === 0) {
    status = 'critical';
    label = 'CRÍTICO';
    className = 'bg-red-100 text-red-700';
  } else if (item.saldo <= item.minimo) {
    status = 'critical';
    label = 'CRÍTICO';
    className = 'bg-red-100 text-red-700';
  } else if (item.saldo <= item.minimo * 1.2) {
    status = 'low';
    label = 'ESTOQUE BAIXO';
    className = 'bg-amber-100 text-amber-700';
  }

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: itemsResponse } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll({ page: 1, pageSize: 100 }),
  });

  const { data: criticalItems } = useQuery({
    queryKey: ['items', 'critical'],
    queryFn: itemsApi.getCritical,
  });

  const { data: purchaseOrdersResponse } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: purchaseOrdersApi.getAll,
  });

  const { data: auditLogsResponse } = useQuery({
    queryKey: ['audit', 'logs', 'recent'],
    queryFn: () => auditApi.getLogs({ page: 1, limit: 5 }),
  });

  const items = itemsResponse?.data || [];
  const purchaseOrders = purchaseOrdersResponse?.data || [];
  const pendingPOs = purchaseOrders.filter((po: any) =>
    ['DRAFT', 'APPROVED', 'SENT'].includes(po.status)
  );
  const sentPOs = purchaseOrders.filter((po: any) => po.status === 'SENT');
  const totalStockValue = items.reduce(
    (sum: number, item: any) => sum + (item.saldo || 0) * (item.custoUnitario || 0),
    0
  );
  const criticalCount = criticalItems?.length ?? items.filter((i: any) => (i.saldo || 0) <= (i.minimo || 0)).length;
  const auditLogs = auditLogsResponse?.logs || [];

  const criticalForTable = (criticalItems?.length ? criticalItems : items)
    .filter((i: any) => (i.saldo || 0) <= (i.minimo || 0) || (i.saldo || 0) <= (i.minimo || 0) * 1.2)
    .slice(0, 4);
  if (criticalForTable.length === 0 && items.length > 0) {
    criticalForTable.push(...items.slice(0, 4));
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'VALOR TOTAL EM ESTOQUE',
            value: `R$ ${totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            trend: '12.5%',
            icon: 'account_balance_wallet',
            color: 'bg-blue-50 text-primary-600',
            trendColor: 'text-emerald-500',
            trendIcon: 'trending_up',
          },
          {
            label: 'ITENS CRÍTICOS',
            value: String(criticalCount),
            trend: '! Urgente',
            icon: 'warning',
            color: 'bg-red-50 text-red-600',
            trendColor: 'text-red-500',
            trendIcon: 'priority_high',
          },
          {
            label: 'PEDIDOS PENDENTES',
            value: String(pendingPOs.length),
            trend: 'Pendente',
            icon: 'assignment_late',
            color: 'bg-amber-50 text-amber-600',
            trendColor: 'text-slate-400',
            trendIcon: null,
          },
          {
            label: 'ENVIOS ATIVOS',
            value: String(sentPOs.length),
            trend: 'Em Rota',
            icon: 'local_shipping',
            color: 'bg-emerald-50 text-emerald-600',
            trendColor: 'text-emerald-500',
            trendIcon: null,
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-lg ${kpi.color} opacity-90`}>
                <span className="material-icons-round text-[20px]">{kpi.icon}</span>
              </div>
              <span className={`text-xs font-bold flex items-center gap-1 ${kpi.trendColor}`}>
                {kpi.trendIcon && <span className="material-icons-round text-[14px] opacity-90">{kpi.trendIcon}</span>}
                {kpi.trend}
              </span>
            </div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              {kpi.label}
            </p>
            <h3 className="text-2xl font-extrabold mt-1 text-slate-800 tabular-nums">{kpi.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Tabela Saúde do Estoque Crítico */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="font-bold text-lg text-slate-800">Saúde do Estoque Crítico</h2>
              <Link
                href="/app/inventory"
                className="text-primary-600 text-sm font-bold hover:underline"
              >
                Ver Todos os Produtos
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 pl-8">Nome do Produto</th>
                    <th className="px-6 py-3 text-center">SKU</th>
                    <th className="px-6 py-3 text-center">Em Estoque</th>
                    <th className="px-6 py-3 text-center">Nível Mín.</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {criticalForTable.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Nenhum item no estoque. Adicione produtos ou importe via Excel.
                      </td>
                    </tr>
                  ) : (
                    criticalForTable.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 pl-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                              <span className="material-icons-round text-slate-400 text-[20px]">
                                inventory_2
                              </span>
                            </div>
                            <span className="font-semibold text-slate-700">
                              {item.descricao || item.name || item.sku}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center tabular-nums text-slate-500 font-medium text-xs">
                          {item.sku}
                        </td>
                        <td
                          className={`px-6 py-4 text-center tabular-nums font-bold ${
                            (item.saldo || 0) < (item.minimo || 0)
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {item.saldo ?? 0}
                        </td>
                        <td className="px-6 py-4 text-center tabular-nums text-slate-500">
                          {item.minimo ?? 0}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge item={item} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/app/inventory`}
                            className="text-slate-400 hover:text-slate-600 transition-colors inline-flex"
                            aria-label="Opções"
                          >
                            <span className="material-icons-round text-[20px]">more_vert</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna direita: Controle de Operações + Log de Auditoria */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-lg text-slate-800 mb-5">Controle de Operações</h2>
            <div className="space-y-3">
              <Link
                href="/app/inventory?analyze=1"
                className="w-full flex items-center justify-between p-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-md">
                    <span className="material-icons-round text-[20px] opacity-95">psychology</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold leading-none text-sm">Analisar Estoque</p>
                    <p className="text-[10px] opacity-80 mt-1.5 uppercase tracking-widest font-bold">
                      Executar Diagnóstico com IA
                    </p>
                  </div>
                </div>
                <span className="material-icons-round text-[20px] group-hover:translate-x-1 transition-transform opacity-95">
                  arrow_forward
                </span>
              </Link>

              <Link
                href="/app/purchase-orders"
                className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-primary-500 hover:bg-white transition-colors group"
              >
                <div className="flex items-center gap-4 text-slate-800">
                  <div className="p-2 bg-white rounded-md border border-slate-100 text-primary-600 group-hover:text-primary-700 group-hover:border-primary-100">
                    <span className="material-icons-round text-[20px] opacity-90">add_shopping_cart</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold leading-none text-sm">Novo Pedido de Compra</p>
                    <p className="text-[10px] text-slate-500 mt-1.5 uppercase tracking-widest font-bold">
                      Aquisição Manual
                    </p>
                  </div>
                </div>
                <span className="material-icons-round text-[20px] text-slate-400 group-hover:text-primary-600 transition-colors">
                  add
                </span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-white">
              <h2 className="font-bold text-lg text-slate-800">Log de Auditoria do Sistema</h2>
            </div>
            <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum registro recente.</p>
              ) : (
                auditLogs.map((log: any, idx: number) => {
                  const isApprove = log.action === 'APPROVE';
                  const isCreate = log.action === 'CREATE';
                  const isUpdate = log.action === 'UPDATE';
                  const icon = isApprove ? 'check_circle' : isCreate ? 'add_circle' : 'edit';
                  const color = isApprove
                    ? 'bg-emerald-100 text-emerald-600'
                    : isCreate
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-100 text-slate-500';
                  const title =
                    log.entity === 'PurchaseOrder'
                      ? `PO #${(log.entityId || '').slice(-4)} ${isApprove ? 'Aprovado' : 'Atualizado'}`
                      : `${log.entity} ${log.action}`;
                  const desc =
                    log.after && typeof log.after === 'string'
                      ? log.after.slice(0, 80) + (log.after.length > 80 ? '...' : '')
                      : `Ação ${log.action} em ${log.entity}`;
                  const time = log.createdAt
                    ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })
                    : '';

                  return (
                    <div key={log.id || idx} className="flex gap-4 relative">
                      {idx !== auditLogs.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-slate-100" />
                      )}
                      <div
                        className={`w-8 h-8 rounded-full ${color} flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white opacity-95`}
                      >
                        <span className="material-icons-round text-[14px]">{icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{title}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {desc}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tabular-nums tracking-wider">
                          {time}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <Link
                href="/app/audit"
                className="text-xs font-bold text-slate-500 hover:text-primary-600 uppercase tracking-widest transition-colors"
              >
                Ver Todos os Logs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
