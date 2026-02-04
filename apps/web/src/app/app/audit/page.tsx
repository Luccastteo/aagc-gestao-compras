'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Bot } from 'lucide-react';

const actionLabels: Record<string, string> = {
  CREATE: 'Criar',
  UPDATE: 'Atualizar',
  DELETE: 'Excluir',
  APPROVE: 'Aprovar',
  SEND: 'Enviar',
  RECEIVE: 'Receber',
  LOGIN: 'Login',
  ANALYZE_INVENTORY: 'Analisar Estoque',
  CREATE_FROM_SUGGESTIONS: 'Gerar PO (sugestões)',
  JOB_INVENTORY_DAILY_CHECK: 'Job: checagem estoque',
  JOB_PO_FOLLOWUP: 'Job: follow-up PO',
};

const entityLabels: Record<string, string> = {
  Item: 'Item',
  PurchaseOrder: 'Pedido de Compra',
  Supplier: 'Fornecedor',
  KanbanCard: 'Card Kanban',
  User: 'Usuário',
  Inventory: 'Estoque',
  CommsLog: 'Log de Comunicação',
};

function safeJson(input?: string | null) {
  if (!input) return null;
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [entity, setEntity] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', 'logs', { page, limit, entity, action }],
    queryFn: () =>
      auditApi.getLogs({
        page,
        limit,
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: () => auditApi.getStats(),
  });

  const actionCounts = useMemo(() => {
    const byAction = stats?.byAction || [];
    const map: Record<string, number> = {};
    for (const row of byAction) map[row.action] = row._count;
    return map;
  }, [stats]);

  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="w-8 h-8" />
          Auditoria
        </h1>
        <p className="text-muted-foreground mt-1">Histórico completo de atividades do sistema</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-card border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">Total de Registros</p>
            <p className="text-2xl font-bold">{stats.total || 0}</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Criações</p>
            <p className="text-2xl font-bold text-green-500">{actionCounts.CREATE || 0}</p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Atualizações</p>
            <p className="text-2xl font-bold text-blue-500">{actionCounts.UPDATE || 0}</p>
          </div>
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Exclusões</p>
            <p className="text-2xl font-bold text-red-500">{actionCounts.DELETE || 0}</p>
          </div>
        </div>
      )}

      {/* Filters + Pagination */}
      <div className="p-4 bg-card border border-border rounded-lg flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="audit-entity" className="block text-xs text-muted-foreground mb-1">
              Entidade
            </label>
            <select
              id="audit-entity"
              value={entity}
              onChange={(e) => {
                setPage(1);
                setEntity(e.target.value);
              }}
              className="px-3 py-2 bg-background border border-input rounded-md text-sm"
            >
              <option value="">Todas</option>
              {Object.keys(entityLabels).map((k) => (
                <option key={k} value={k}>
                  {entityLabels[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="audit-action" className="block text-xs text-muted-foreground mb-1">
              Ação
            </label>
            <select
              id="audit-action"
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
              className="px-3 py-2 bg-background border border-input rounded-md text-sm"
            >
              <option value="">Todas</option>
              {Object.keys(actionLabels).map((k) => (
                <option key={k} value={k}>
                  {actionLabels[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="audit-limit" className="block text-xs text-muted-foreground mb-1">
              Itens por página
            </label>
            <select
              id="audit-limit"
              value={String(limit)}
              onChange={(e) => {
                setPage(1);
                setLimit(Number(e.target.value));
              }}
              className="px-3 py-2 bg-background border border-input rounded-md text-sm"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50 text-sm"
            >
              Anterior
            </button>
            <span className="text-sm text-muted-foreground">
              Página <span className="text-foreground font-medium">{page}</span> de{' '}
              <span className="text-foreground font-medium">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80 disabled:opacity-50 text-sm"
            >
              Próxima
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Clique em um registro para ver <strong>before/after</strong>.
        </p>
      </div>

      {/* Agent Activity Notice */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-3">
        <Bot className="w-5 h-5 text-primary" />
        <p className="text-sm">
          O agente AAGC registra automaticamente todas as ações para garantir rastreabilidade completa
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Data/Hora</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Usuário</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Ação</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Entidade</th>
              <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum registro de auditoria encontrado
                </td>
              </tr>
            ) : (
              data?.logs?.map((log: any) => {
                const expanded = expandedId === log.id;
                const before = safeJson(log.before);
                const after = safeJson(log.after);

                return (
                  <>
                    <tr
                      key={log.id}
                      className="border-t border-border hover:bg-secondary/50 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setExpandedId(expanded ? null : log.id);
                      }}
                      aria-expanded={expanded}
                    >
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.actorUser?.name || (
                          <span className="flex items-center gap-1 text-primary">
                            <Bot className="w-3 h-3" />
                            Sistema
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.action === 'CREATE'
                              ? 'bg-green-500/20 text-green-300'
                              : log.action === 'UPDATE'
                                ? 'bg-blue-500/20 text-blue-300'
                                : log.action === 'DELETE'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{entityLabels[log.entity] || log.entity}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs text-muted-foreground">
                        {String(log.entityId || '').slice(0, 8)}...
                      </td>
                    </tr>

                    {expanded && (
                      <tr className="border-t border-border bg-secondary/20">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-card border border-border rounded-lg">
                              <p className="text-xs text-muted-foreground mb-2">Before</p>
                              <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                                {before ? JSON.stringify(before, null, 2) : '—'}
                              </pre>
                            </div>
                            <div className="p-3 bg-card border border-border rounded-lg">
                              <p className="text-xs text-muted-foreground mb-2">After</p>
                              <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                                {after ? JSON.stringify(after, null, 2) : '—'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
