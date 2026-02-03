'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kanbanApi } from '@/lib/api';
import { 
  Kanban as KanbanIcon, ArrowRight, CheckCircle2, 
  Bell, Mail, MessageCircle, Bot
} from 'lucide-react';

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const { data: board, isLoading } = useQuery({
    queryKey: ['kanban'],
    queryFn: kanbanApi.getBoard,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      kanbanApi.moveCard(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      
      // Show notification feedback
      if (data.purchaseOrder?.supplier) {
        const supplier = data.purchaseOrder.supplier;
        const channels = [];
        if (supplier.email) channels.push('e-mail');
        if (supplier.whatsapp) channels.push('WhatsApp');
        
        if (channels.length > 0) {
          setLastNotification(`Notificação enviada via ${channels.join(' e ')} para ${supplier.nome}`);
          setTimeout(() => setLastNotification(null), 5000);
        }
      }
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  const todoCards = board?.cards?.filter((c: any) => c.status === 'TODO') || [];
  const inProgressCards = board?.cards?.filter((c: any) => c.status === 'IN_PROGRESS') || [];
  const doneCards = board?.cards?.filter((c: any) => c.status === 'DONE') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <KanbanIcon className="w-8 h-8" />
          Kanban de Compras
        </h1>
        <p className="text-muted-foreground mt-1">Acompanhe o fluxo de trabalho de compras</p>
      </div>

      {/* Auto-notification info */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">Notificações Automáticas Ativadas</p>
            <p className="text-sm text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> E-mail
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </span>
              <span className="text-xs opacity-70">
                Fornecedores são notificados automaticamente quando cards são movidos
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {lastNotification && (
        <div className="fixed bottom-4 right-4 p-4 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2 animate-pulse z-50">
          <Bell className="w-5 h-5" />
          {lastNotification}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 min-h-[500px]">
        {/* A FAZER */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">A Fazer</h2>
            <span className="px-2 py-1 bg-secondary rounded-full text-sm">{todoCards.length}</span>
          </div>
          <div className="space-y-3 min-h-[400px] p-3 bg-secondary/30 rounded-lg">
            {todoCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum card</p>
            ) : (
              todoCards.map((card: any) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  onMove={() => moveMutation.mutate({ id: card.id, status: 'IN_PROGRESS' })}
                  moveLabel="Iniciar"
                  moveColor="bg-blue-600 hover:bg-blue-700"
                  borderColor=""
                  isPending={moveMutation.isPending}
                />
              ))
            )}
          </div>
        </div>

        {/* EM ANDAMENTO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Em Andamento</h2>
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">{inProgressCards.length}</span>
          </div>
          <div className="space-y-3 min-h-[400px] p-3 bg-yellow-500/10 rounded-lg">
            {inProgressCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum card</p>
            ) : (
              inProgressCards.map((card: any) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  onMove={() => moveMutation.mutate({ id: card.id, status: 'DONE' })}
                  moveLabel="Concluir"
                  moveColor="bg-green-600 hover:bg-green-700"
                  borderColor="border-yellow-500/50"
                  isPending={moveMutation.isPending}
                />
              ))
            )}
          </div>
        </div>

        {/* CONCLUÍDO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Concluído</h2>
            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">{doneCards.length}</span>
          </div>
          <div className="space-y-3 min-h-[400px] p-3 bg-green-500/10 rounded-lg">
            {doneCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum card</p>
            ) : (
              doneCards.map((card: any) => (
                <div key={card.id} className="p-4 bg-card border border-green-500/50 rounded-lg opacity-75">
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {card.titulo}
                  </p>
                  {card.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{card.descricao}</p>
                  )}
                  {card.purchaseOrder && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-primary">
                        Pedido: {card.purchaseOrder.codigo}
                      </p>
                      {card.purchaseOrder.supplier && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          Fornecedor: {card.purchaseOrder.supplier.nome}
                          {card.purchaseOrder.supplier.whatsapp && (
                            <MessageCircle className="w-3 h-3 text-green-500" />
                          )}
                          {card.purchaseOrder.supplier.email && (
                            <Mail className="w-3 h-3 text-blue-500" />
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Kanban Card Component
function KanbanCard({ 
  card, 
  onMove, 
  moveLabel, 
  moveColor, 
  borderColor,
  isPending 
}: { 
  card: any; 
  onMove: () => void; 
  moveLabel: string; 
  moveColor: string;
  borderColor: string;
  isPending: boolean;
}) {
  const hasNotificationChannels = card.purchaseOrder?.supplier?.email || 
                                   card.purchaseOrder?.supplier?.whatsapp;

  return (
    <div className={`p-4 bg-card border ${borderColor || 'border-border'} rounded-lg hover:border-primary/50 transition-colors`}>
      <p className="font-medium">{card.titulo}</p>
      {card.descricao && (
        <p className="text-sm text-muted-foreground mt-1">{card.descricao}</p>
      )}
      {card.purchaseOrder && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-primary">
            Pedido: {card.purchaseOrder.codigo}
          </p>
          {card.purchaseOrder.supplier && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {card.purchaseOrder.supplier.nome}
              {card.purchaseOrder.supplier.whatsapp && (
                <MessageCircle className="w-3 h-3 text-green-500" title="WhatsApp ativo" />
              )}
              {card.purchaseOrder.supplier.email && (
                <Mail className="w-3 h-3 text-blue-500" title="E-mail ativo" />
              )}
            </p>
          )}
        </div>
      )}
      
      <button
        onClick={onMove}
        disabled={isPending}
        className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-white rounded disabled:opacity-50 ${moveColor}`}
      >
        {isPending ? (
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            {moveLabel === 'Concluir' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {moveLabel}
            {hasNotificationChannels && (
              <Bell className="w-3 h-3 ml-1 opacity-70" title="Notificação será enviada" />
            )}
          </>
        )}
      </button>
    </div>
  );
}
