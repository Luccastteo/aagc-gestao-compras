import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { POStatus } from '@prisma/client';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Gera o próximo código PO para a organização no ano corrente.
   * Reinicia a sequência a cada ano. Deve ser chamado dentro de uma transação.
   */
  private async generateNextPOCode(organizationId: string, tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const yearPrefix = `PO-${year}-`;

    const lastPO = await tx.purchaseOrder.findFirst({
      where: {
        organizationId,
        codigo: { startsWith: yearPrefix },
      },
      orderBy: { codigo: 'desc' },
      select: { codigo: true },
    });

    let sequence = 1;
    if (lastPO) {
      const parsed = parseInt(lastPO.codigo.split('-').pop() || '0', 10);
      if (!isNaN(parsed) && parsed > 0) {
        sequence = parsed + 1;
      }
    }

    return `${yearPrefix}${String(sequence).padStart(4, '0')}`;
  }

  private async assertSupplierBelongsToOrg(supplierId: string, organizationId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, organizationId },
    });
    if (!supplier) {
      throw new BadRequestException('Fornecedor inválido para esta organização');
    }
    return supplier;
  }

  private async assertItemBelongsToOrg(itemId: string, organizationId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) {
      throw new BadRequestException('Item inválido para esta organização');
    }
    return item;
  }

  async findAll(organizationId: string, pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = pagination?.page || 1;
    const pageSize = Math.max(1, Math.min(pagination?.pageSize || 20, 100));
    const skip = (page - 1) * pageSize;

    const where: any = { organizationId };

    if (pagination?.search) {
      where.codigo = { contains: pagination.search, mode: 'insensitive' };
    }

    const orderBy: any = {};
    if (pagination?.sortBy) {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          items: { include: { item: true } },
        },
        orderBy,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: {
        supplier: true,
        createdBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        items: { include: { item: true } },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  async create(data: any, organizationId: string, userId: string) {
    // Multi-tenant enforcement: valida IDs pertencem à org.
    await this.assertSupplierBelongsToOrg(data.supplierId, organizationId);

    let valorTotal = 0;

    const created = await this.prisma.$transaction(async (tx) => {
      const codigo = await this.generateNextPOCode(organizationId, tx);

      const po = await tx.purchaseOrder.create({
        data: {
          codigo,
          status: 'DRAFT',
          supplierId: data.supplierId,
          valorTotal: 0,
          observacoes: data.observacoes,
          createdById: userId,
          organizationId,
          dataAbertura: new Date(),
        },
      });

      if (data.items && data.items.length > 0) {
        for (const line of data.items) {
          await this.assertItemBelongsToOrg(line.itemId, organizationId);

          const valorItem = line.quantidade * line.precoUnitario;
          valorTotal += valorItem;

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: po.id,
              itemId: line.itemId,
              quantidade: line.quantidade,
              precoUnitario: line.precoUnitario,
              valorTotal: valorItem,
            },
          });
        }

        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { valorTotal },
        });
      }

      const full = await tx.purchaseOrder.findFirst({
        where: { id: po.id, organizationId },
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
          items: { include: { item: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'CREATE',
          entity: 'PurchaseOrder',
          entityId: po.id,
          after: JSON.stringify(full),
          organizationId,
        },
      });

      return full!;
    });

    return created;
  }

  async createFromSuggestions(
    params: { suggestionIds?: string[]; supplierId?: string },
    organizationId: string,
    userId: string,
  ) {
    const where: any = { organizationId, status: 'OPEN' };
    if (params?.suggestionIds?.length) where.id = { in: params.suggestionIds };
    if (params?.supplierId) where.supplierId = params.supplierId;

    const suggestions = await this.prisma.purchaseSuggestion.findMany({
      where,
      include: { item: true, supplier: true },
      orderBy: { estimatedTotal: 'desc' },
    });

    if (suggestions.length === 0) {
      throw new BadRequestException('Nenhuma sugestão OPEN encontrada para gerar pedido');
    }

    // Não dá pra gerar PO sem fornecedor (schema exige supplierId).
    const withoutSupplier = suggestions.filter((s) => !s.supplierId);
    if (withoutSupplier.length > 0) {
      throw new BadRequestException('Existem sugestões sem fornecedor vinculado. Ajuste o item/fornecedor e tente novamente.');
    }

    const grouped = new Map<string, typeof suggestions>();
    for (const s of suggestions) {
      const key = s.supplierId!;
      const arr = grouped.get(key) || [];
      arr.push(s);
      grouped.set(key, arr);
    }

    const createdPOs: any[] = [];
    const usedSuggestionIds: string[] = [];

    for (const [supplierId, group] of grouped.entries()) {
      // Multi-tenant enforcement (supplierId)
      await this.assertSupplierBelongsToOrg(supplierId, organizationId);

      const result = await this.prisma.$transaction(async (tx) => {
        const codigo = await this.generateNextPOCode(organizationId, tx);

        let valorTotal = 0;

        const po = await tx.purchaseOrder.create({
          data: {
            codigo,
            status: 'DRAFT',
            supplierId,
            valorTotal: 0,
            observacoes: `Gerado automaticamente a partir de sugestões (${group.length} itens).`,
            createdById: userId,
            organizationId,
            dataAbertura: new Date(),
          },
        });

        for (const s of group) {
          // Multi-tenant enforcement (itemId)
          await this.assertItemBelongsToOrg(s.itemId, organizationId);

          const lineTotal = s.suggestedQty * s.unitCost;
          valorTotal += lineTotal;

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: po.id,
              itemId: s.itemId,
              quantidade: s.suggestedQty,
              precoUnitario: s.unitCost,
              valorTotal: lineTotal,
            },
          });
        }

        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { valorTotal },
        });

        // Marca sugestões como USED e vincula ao PO
        const ids = group.map((s) => s.id);
        await tx.purchaseSuggestion.updateMany({
          where: { id: { in: ids }, organizationId, status: 'OPEN' },
          data: { status: 'USED', purchaseOrderId: po.id },
        });

        const full = await tx.purchaseOrder.findFirst({
          where: { id: po.id, organizationId },
          include: {
            supplier: true,
            createdBy: { select: { name: true, email: true } },
            approvedBy: { select: { name: true, email: true } },
            items: { include: { item: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: userId,
            action: 'CREATE_FROM_SUGGESTIONS',
            entity: 'PurchaseOrder',
            entityId: po.id,
            after: JSON.stringify({
              purchaseOrder: full,
              suggestionIds: ids,
            }),
            organizationId,
          },
        });

        // Opcional: cria card no kanban
        const board = await tx.kanbanBoard.findFirst({ where: { organizationId } });
        if (board) {
          const maxPosicao = await tx.kanbanCard.findFirst({
            where: { boardId: board.id, status: 'TODO' },
            orderBy: { posicao: 'desc' },
          });

          const card = await tx.kanbanCard.create({
            data: {
              titulo: `Pedido ${codigo} (rascunho)`,
              descricao: `Gerado automaticamente a partir de sugestões (${group.length} itens).`,
              status: 'TODO',
              posicao: maxPosicao ? maxPosicao.posicao + 1 : 0,
              purchaseOrderId: po.id,
              boardId: board.id,
              createdById: userId,
              organizationId,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: userId,
              action: 'CREATE',
              entity: 'KanbanCard',
              entityId: card.id,
              after: JSON.stringify(card),
              organizationId,
            },
          });
        }

        return { po: full!, suggestionIds: ids };
      });

      createdPOs.push(result.po);
      usedSuggestionIds.push(...result.suggestionIds);
    }

    return {
      created: createdPOs.length,
      purchaseOrders: createdPOs,
      usedSuggestionIds,
    };
  }

  async update(id: string, data: any, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Apenas pedidos em DRAFT podem ser editados');
    }

    // Validar supplier se fornecido
    if (data.supplierId) {
      await this.assertSupplierBelongsToOrg(data.supplierId, organizationId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Atualiza dados básicos
      const updateData: any = {};
      if (data.supplierId) updateData.supplierId = data.supplierId;
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

      if (Object.keys(updateData).length > 0) {
        await tx.purchaseOrder.update({
          where: { id },
          data: updateData,
        });
      }

      // Atualiza itens se fornecidos
      if (data.items && data.items.length > 0) {
        // Remove itens existentes
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        // Cria novos itens
        let valorTotal = 0;
        for (const line of data.items) {
          await this.assertItemBelongsToOrg(line.itemId, organizationId);

          const valorItem = line.quantidade * line.precoUnitario;
          valorTotal += valorItem;

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: id,
              itemId: line.itemId,
              quantidade: line.quantidade,
              precoUnitario: line.precoUnitario,
              valorTotal: valorItem,
            },
          });
        }

        await tx.purchaseOrder.update({
          where: { id },
          data: { valorTotal },
        });
      }

      return tx.purchaseOrder.findFirst({
        where: { id, organizationId },
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
          items: { include: { item: true } },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'UPDATE',
        entity: 'PurchaseOrder',
        entityId: id,
        before: JSON.stringify(po),
        after: JSON.stringify(updated),
        organizationId,
      },
    });

    return updated;
  }

  async cancel(id: string, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (!['DRAFT', 'APPROVED'].includes(po.status)) {
      throw new BadRequestException('Apenas pedidos em DRAFT ou APPROVED podem ser cancelados');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Atualiza status para CANCELLED
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Libera sugestões vinculadas (volta para OPEN)
      await tx.purchaseSuggestion.updateMany({
        where: { purchaseOrderId: id, organizationId },
        data: { status: 'OPEN', purchaseOrderId: null },
      });

      // Remove card do kanban se existir
      await tx.kanbanCard.deleteMany({
        where: { purchaseOrderId: id, organizationId },
      });

      return tx.purchaseOrder.findFirst({
        where: { id, organizationId },
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          items: { include: { item: true } },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'CANCEL',
        entity: 'PurchaseOrder',
        entityId: id,
        before: JSON.stringify(po),
        after: JSON.stringify(updated),
        organizationId,
      },
    });

    return updated;
  }

  async approve(id: string, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT orders can be approved');
    }

    // Atualização e audit log dentro de uma única transação para consistência
    const after = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          dataAprovacao: new Date(),
        },
      });

      const full = await tx.purchaseOrder.findFirst({
        where: { id, organizationId },
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
          items: { include: { item: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'APPROVE',
          entity: 'PurchaseOrder',
          entityId: id,
          before: JSON.stringify(po),
          after: JSON.stringify(full),
          organizationId,
        },
      });

      return full!;
    });

    return after;
  }

  async send(id: string, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (po.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED orders can be sent');
    }

    // Atualização, comm log e audit log dentro de uma única transação
    const after = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'SENT',
          dataEnvio: new Date(),
          previsaoEntrega: new Date(Date.now() + po.supplier.prazoMedioDias * 24 * 60 * 60 * 1000),
        },
      });

      const comm = await tx.commsLog.create({
        data: {
          tipo: 'EMAIL',
          destinatario: po.supplier.email || 'N/A',
          assunto: `Pedido de Compra ${po.codigo}`,
          mensagem: `Pedido enviado para ${po.supplier.nome}. Valor total: R$ ${po.valorTotal}`,
          status: 'SIMULATED',
          entity: 'PurchaseOrder',
          entityId: po.id,
          organizationId,
        },
      });

      const full = await tx.purchaseOrder.findFirst({
        where: { id, organizationId },
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
          items: { include: { item: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'SEND',
          entity: 'PurchaseOrder',
          entityId: id,
          before: JSON.stringify(po),
          after: JSON.stringify({ purchaseOrder: full, commsLogId: comm.id }),
          organizationId,
        },
      });

      return full!;
    });

    return after;
  }

  async receive(id: string, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (po.status !== 'SENT') {
      throw new BadRequestException('Only SENT orders can be received');
    }

    const movementsSummary: Array<{
      itemId: string;
      sku?: string;
      saldoAntes: number;
      saldoDepois: number;
      quantidade: number;
      movementId?: string;
    }> = [];

    // Toda a operação (estoque + status + audit) em uma única transação
    const after = await this.prisma.$transaction(async (tx) => {
      // Update stock
      for (const poItem of po.items) {
        const item = await tx.item.findFirst({ where: { id: poItem.itemId, organizationId } });
        if (!item) continue;

        const saldoAntes = item.saldo;
        const saldoDepois = item.saldo + poItem.quantidade;

        const movement = await tx.movement.create({
          data: {
            itemId: item.id,
            tipo: 'ENTRADA',
            quantidade: poItem.quantidade,
            saldoAntes,
            saldoDepois,
            motivo: `Recebimento PO ${po.codigo}`,
            responsavel: 'System',
          },
        });

        await tx.item.update({
          where: { id: item.id },
          data: { saldo: saldoDepois },
        });

        movementsSummary.push({
          itemId: item.id,
          sku: item.sku,
          saldoAntes,
          saldoDepois,
          quantidade: poItem.quantidade,
          movementId: movement.id,
        });

        await tx.auditLog.create({
          data: {
            actorUserId: userId,
            action: 'UPDATE',
            entity: 'Item',
            entityId: item.id,
            before: JSON.stringify({ saldo: saldoAntes }),
            after: JSON.stringify({ saldo: saldoDepois, movementId: movement.id, motivo: `Recebimento PO ${po.codigo}` }),
            organizationId,
          },
        });
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'DELIVERED', dataRecebimento: new Date() },
      });

      const full = await tx.purchaseOrder.findFirst({
        where: { id, organizationId },
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          items: { include: { item: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'RECEIVE',
          entity: 'PurchaseOrder',
          entityId: id,
          before: JSON.stringify(po),
          after: JSON.stringify({ purchaseOrder: full, movements: movementsSummary }),
          organizationId,
        },
      });

      return full!;
    });

    return after;
  }
}
