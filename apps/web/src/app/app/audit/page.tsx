'use client';

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
};

const entityLabels: Record<string, string> = {
  Item: 'Item',
  PurchaseOrder: 'Pedido de Compra',
  Supplier: 'Fornecedor',
  KanbanCard: 'Card Kanban',
  User: 'Usuário',
};

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit', 'logs'],
    queryFn: () => auditApi.getLogs(),
  });

  const { data: stats } = useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: () => auditApi.getStats(),
  });

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
            <p className="text-2xl font-bold text-green-500">{stats.creates || 0}</p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Atualizações</p>
            <p className="text-2xl font-bold text-blue-500">{stats.updates || 0}</p>
          </div>
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Exclusões</p>
            <p className="text-2xl font-bold text-red-500">{stats.deletes || 0}</p>
          </div>
        </div>
      )}

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
              data?.logs?.map((log: any) => (
                <tr key={log.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 text-sm">
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
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
                    {log.entityId?.slice(0, 8)}...
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
