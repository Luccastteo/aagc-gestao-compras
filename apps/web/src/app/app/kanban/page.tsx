'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kanbanApi } from '@/lib/api';
import { 
  Kanban as KanbanIcon, ArrowRight, CheckCircle2, 
  Bell, Mail, MessageCircle, Bot
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';
type Card = any;

const STATUSES: Array<{ id: Status; label: string; tone: string }> = [
  { id: 'TODO', label: 'A Fazer', tone: 'bg-secondary/30' },
  { id: 'IN_PROGRESS', label: 'Em Andamento', tone: 'bg-yellow-500/10' },
  { id: 'DONE', label: 'Concluído', tone: 'bg-green-500/10' },
];

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const [cardsByStatus, setCardsByStatus] = useState<Record<Status, Card[]>>({
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: board, isLoading } = useQuery({
    queryKey: ['kanban'],
    queryFn: kanbanApi.getBoard,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: Status; position: number }) =>
      kanbanApi.moveCard(id, status, position),
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
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
    },
  });

  useEffect(() => {
    const cards = board?.cards || [];
    const next: Record<Status, Card[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const c of cards) {
      if (c.status === 'TODO') next.TODO.push(c);
      if (c.status === 'IN_PROGRESS') next.IN_PROGRESS.push(c);
      if (c.status === 'DONE') next.DONE.push(c);
    }
    setCardsByStatus(next);
  }, [board]);

  const idToStatus = useMemo(() => {
    const map = new Map<string, Status>();
    (Object.keys(cardsByStatus) as Status[]).forEach((s) => {
      for (const c of cardsByStatus[s]) map.set(c.id, s);
    });
    return map;
  }, [cardsByStatus]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceStatus = idToStatus.get(activeId);
    if (!sourceStatus) return;

    const isOverAStatus = (STATUSES.map((s) => s.id) as string[]).includes(overId);
    const targetStatus = isOverAStatus ? (overId as Status) : idToStatus.get(overId);
    if (!targetStatus) return;

    const sourceCards = cardsByStatus[sourceStatus];
    const targetCards = cardsByStatus[targetStatus];

    const sourceIndex = sourceCards.findIndex((c) => c.id === activeId);
    if (sourceIndex < 0) return;

    const overIndex = isOverAStatus
      ? targetCards.length
      : targetCards.findIndex((c) => c.id === overId);

    const nextIndex = overIndex < 0 ? targetCards.length : overIndex;

    // Otimista: atualiza UI local
    setCardsByStatus((prev) => {
      const next = { ...prev } as Record<Status, Card[]>;
      const moved = prev[sourceStatus].find((c) => c.id === activeId);
      if (!moved) return prev;

      // Remove da origem
      const newSource = prev[sourceStatus].filter((c) => c.id !== activeId);

      if (sourceStatus === targetStatus) {
        const reordered = arrayMove(prev[sourceStatus], sourceIndex, nextIndex);
        next[sourceStatus] = reordered;
        return next;
      }

      const newTarget = [...prev[targetStatus]];
      newTarget.splice(nextIndex, 0, { ...moved, status: targetStatus });

      next[sourceStatus] = newSource;
      next[targetStatus] = newTarget;
      return next;
    });

    moveMutation.mutate({ id: activeId, status: targetStatus, position: nextIndex });
  };

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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-3 gap-4 min-h-[500px]">
          {STATUSES.map((col) => (
            <KanbanColumn
              key={col.id}
              status={col.id}
              label={col.label}
              tone={col.tone}
              cards={cardsByStatus[col.id]}
              isPending={moveMutation.isPending}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  tone,
  cards,
  isPending,
}: {
  status: Status;
  label: string;
  tone: string;
  cards: Card[];
  isPending: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  const countBadge =
    status === 'TODO'
      ? 'bg-secondary'
      : status === 'IN_PROGRESS'
        ? 'bg-yellow-500/20 text-yellow-300'
        : 'bg-green-500/20 text-green-300';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{label}</h2>
        <span className={`px-2 py-1 rounded-full text-sm ${countBadge}`}>{cards.length}</span>
      </div>

      <div ref={setNodeRef} className={`space-y-3 min-h-[400px] p-3 ${tone} rounded-lg`}>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum card</p>
        ) : (
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <SortableKanbanCard key={card.id} card={card} disabled={isPending} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

function SortableKanbanCard({ card, disabled }: { card: Card; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  const hasNotificationChannels =
    card.purchaseOrder?.supplier?.email || card.purchaseOrder?.supplier?.whatsapp;

  const borderColor =
    card.status === 'IN_PROGRESS'
      ? 'border-yellow-500/50'
      : card.status === 'DONE'
        ? 'border-green-500/50'
        : 'border-border';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-card border ${borderColor} rounded-lg hover:border-primary/50 transition-colors ${
        isDragging ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{card.titulo}</p>
          {card.descricao && <p className="text-sm text-muted-foreground mt-1">{card.descricao}</p>}
          {card.purchaseOrder && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-primary">Pedido: {card.purchaseOrder.codigo}</p>
              {card.purchaseOrder.supplier && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {card.purchaseOrder.supplier.nome}
                  {card.purchaseOrder.supplier.whatsapp && (
                    <span title="WhatsApp ativo">
                      <MessageCircle className="w-3 h-3 text-green-500" aria-label="WhatsApp ativo" role="img" />
                    </span>
                  )}
                  {card.purchaseOrder.supplier.email && (
                    <span title="E-mail ativo">
                      <Mail className="w-3 h-3 text-blue-500" aria-label="E-mail ativo" role="img" />
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="shrink-0 px-2 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Arrastar card"
          {...attributes}
          {...listeners}
        >
          Arrastar
          {hasNotificationChannels && (
            <span title="Notificação será enviada">
              <Bell className="inline w-3 h-3 ml-1 opacity-70" aria-label="Notificação será enviada" role="img" />
            </span>
          )}
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Dica: arraste e solte para mudar coluna e ordem.
      </p>
    </div>
  );
}
