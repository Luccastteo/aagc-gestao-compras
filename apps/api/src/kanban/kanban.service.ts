import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { KanbanStatus } from '@prisma/client';

@Injectable()
export class KanbanService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getBoard(organizationId: string) {
    const board = await this.prisma.kanbanBoard.findFirst({
      where: { organizationId },
      include: {
        cards: {
          include: {
            purchaseOrder: {
              include: { supplier: true },
            },
            createdBy: { select: { name: true } },
          },
          orderBy: { posicao: 'asc' },
        },
      },
    });

    if (!board) {
      // Create default board
      return this.prisma.kanbanBoard.create({
        data: {
          nome: 'Compras e Reposição',
          descricao: 'Kanban de gestão de compras',
          organizationId,
        },
        include: { cards: true },
      });
    }

    return board;
  }

  async createCard(data: any, organizationId: string, userId: string) {
    const board = await this.getBoard(organizationId);

    if (data.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id: data.purchaseOrderId, organizationId },
      });
      if (!po) {
        throw new NotFoundException('Purchase order not found');
      }
    }

    const maxPosicao = await this.prisma.kanbanCard.findFirst({
      where: { boardId: board.id, status: 'TODO' },
      orderBy: { posicao: 'desc' },
    });

    const card = await this.prisma.kanbanCard.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        status: 'TODO',
        posicao: maxPosicao ? maxPosicao.posicao + 1 : 0,
        purchaseOrderId: data.purchaseOrderId,
        boardId: board.id,
        createdById: userId,
        organizationId,
      },
      include: {
        purchaseOrder: { include: { supplier: true } },
        createdBy: { select: { name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'CREATE',
        entity: 'KanbanCard',
        entityId: card.id,
        after: JSON.stringify(card),
        organizationId,
      },
    });

    // Send notifications if linked to purchase order with supplier
    if (card.purchaseOrder?.supplier) {
      const supplier = card.purchaseOrder.supplier;
      await this.notificationsService.notifyKanbanMove(
        card.titulo,
        'NOVO',
        'TODO',
        supplier.email || undefined,
        supplier.whatsapp || undefined,
        organizationId,
      );
    }

    return card;
  }

  async moveCard(
    id: string,
    newStatus: KanbanStatus,
    newPosition: number | undefined,
    organizationId: string,
    userId: string,
    notifySupplier = true,
  ) {
    const card = await this.prisma.kanbanCard.findFirst({
      where: { id, organizationId },
      include: {
        purchaseOrder: { include: { supplier: true } },
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const oldStatus = card.status;
    const oldPosicao = card.posicao;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Busca cards por coluna (status) ordenados por posição
      const sourceStatus = oldStatus;
      const targetStatus = newStatus;

      const sourceCards = await tx.kanbanCard.findMany({
        where: { boardId: card.boardId, organizationId, status: sourceStatus, id: { not: id } },
        orderBy: { posicao: 'asc' },
        select: { id: true },
      });

      const targetCards =
        sourceStatus === targetStatus
          ? sourceCards
          : await tx.kanbanCard.findMany({
              where: { boardId: card.boardId, organizationId, status: targetStatus, id: { not: id } },
              orderBy: { posicao: 'asc' },
              select: { id: true },
            });

      const clampedPosition = Math.max(
        0,
        Math.min(
          typeof newPosition === 'number' && Number.isFinite(newPosition) ? newPosition : targetCards.length,
          targetCards.length,
        ),
      );

      const targetIds = targetCards.map((c) => c.id);
      targetIds.splice(clampedPosition, 0, id);

      const updates: Array<ReturnType<typeof tx.kanbanCard.update>> = [];

      // Atualiza o card movido (status + posicao)
      updates.push(
        tx.kanbanCard.update({
          where: { id },
          data: { status: targetStatus, posicao: clampedPosition },
        }),
      );

      // Reindexa coluna alvo
      for (let idx = 0; idx < targetIds.length; idx++) {
        const cardId = targetIds[idx];
        if (cardId === id) continue;
        updates.push(tx.kanbanCard.update({ where: { id: cardId }, data: { posicao: idx } }));
      }

      // Reindexa coluna origem se mudou de status
      if (sourceStatus !== targetStatus) {
        const sourceIds = sourceCards.map((c) => c.id);
        for (let idx = 0; idx < sourceIds.length; idx++) {
          updates.push(tx.kanbanCard.update({ where: { id: sourceIds[idx] }, data: { posicao: idx } }));
        }
      }

      await Promise.all(updates);

      return tx.kanbanCard.findFirst({
        where: { id, organizationId },
        include: {
          purchaseOrder: { include: { supplier: true } },
          createdBy: { select: { name: true } },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'UPDATE',
        entity: 'KanbanCard',
        entityId: id,
        before: JSON.stringify({ status: oldStatus, posicao: oldPosicao }),
        after: JSON.stringify({ status: newStatus, posicao: updated?.posicao }),
        organizationId,
      },
    });

    // Send notifications if enabled and linked to purchase order with supplier
    if (notifySupplier && updated?.purchaseOrder?.supplier) {
      const supplier = updated.purchaseOrder.supplier;
      await this.notificationsService.notifyKanbanMove(
        updated.titulo,
        oldStatus,
        newStatus,
        supplier.email || undefined,
        supplier.whatsapp || undefined,
        organizationId,
      );
    }

    return updated;
  }

  async updateCard(
    id: string,
    data: any,
    organizationId: string,
    userId: string,
  ) {
    const card = await this.prisma.kanbanCard.findFirst({
      where: { id, organizationId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const updated = await this.prisma.kanbanCard.update({
      where: { id },
      data,
      include: {
        purchaseOrder: { include: { supplier: true } },
        createdBy: { select: { name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'UPDATE',
        entity: 'KanbanCard',
        entityId: id,
        before: JSON.stringify(card),
        after: JSON.stringify(updated),
        organizationId,
      },
    });

    return updated;
  }

  async deleteCard(id: string, organizationId: string, userId: string) {
    const card = await this.prisma.kanbanCard.findFirst({
      where: { id, organizationId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.prisma.kanbanCard.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'DELETE',
        entity: 'KanbanCard',
        entityId: id,
        before: JSON.stringify(card),
        organizationId,
      },
    });

    return { deleted: true };
  }

  // Get notification settings for cards
  async getNotificationSettings(organizationId: string) {
    return {
      notifyOnCreate: true,
      notifyOnMove: true,
      notifyOnComplete: true,
      channels: {
        email: true,
        whatsapp: true,
        sms: false,
      },
    };
  }
}
