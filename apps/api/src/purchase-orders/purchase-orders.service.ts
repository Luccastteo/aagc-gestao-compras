import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { POStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      include: {
        supplier: true,
        createdBy: { select: { name: true, email: true } },
        items: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
    const lastPO = await this.prisma.purchaseOrder.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    const count = lastPO ? parseInt(lastPO.codigo.split('-').pop() || '0') + 1 : 1;
    const codigo = `PO-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    let valorTotal = 0;

    const po = await this.prisma.purchaseOrder.create({
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
      for (const item of data.items) {
        const valorItem = item.quantidade * item.precoUnitario;
        valorTotal += valorItem;

        await this.prisma.purchaseOrderItem.create({
          data: {
            purchaseOrderId: po.id,
            itemId: item.itemId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            valorTotal: valorItem,
          },
        });
      }

      await this.prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { valorTotal },
      });
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'CREATE',
        entity: 'PurchaseOrder',
        entityId: po.id,
        after: JSON.stringify({ codigo, valorTotal }),
        organizationId,
      },
    });

    return this.findOne(po.id, organizationId);
  }

  async approve(id: string, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT orders can be approved');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        dataAprovacao: new Date(),
      },
      include: {
        supplier: true,
        items: { include: { item: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'APPROVE',
        entity: 'PurchaseOrder',
        entityId: id,
        before: JSON.stringify({ status: 'DRAFT' }),
        after: JSON.stringify({ status: 'APPROVED' }),
        organizationId,
      },
    });

    return updated;
  }

  async send(id: string, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (po.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED orders can be sent');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'SENT',
        dataEnvio: new Date(),
        previsaoEntrega: new Date(Date.now() + po.supplier.prazoMedioDias * 24 * 60 * 60 * 1000),
      },
    });

    // Simulated email/WhatsApp
    await this.prisma.commsLog.create({
      data: {
        tipo: 'EMAIL',
        destinatario: po.supplier.email || 'N/A',
        assunto: `Pedido de Compra ${po.codigo}`,
        mensagem: `Pedido enviado para ${po.supplier.nome}. Valor total: R$ ${po.valorTotal}`,
        status: 'SIMULATED',
        organizationId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'SEND',
        entity: 'PurchaseOrder',
        entityId: id,
        after: JSON.stringify({ status: 'SENT' }),
        organizationId,
      },
    });

    return updated;
  }

  async receive(id: string, organizationId: string, userId: string) {
    const po = await this.findOne(id, organizationId);

    if (po.status !== 'SENT') {
      throw new BadRequestException('Only SENT orders can be received');
    }

    // Update stock
    for (const poItem of po.items) {
      const item = await this.prisma.item.findUnique({ where: { id: poItem.itemId } });
      if (item) {
        await this.prisma.movement.create({
          data: {
            itemId: item.id,
            tipo: 'ENTRADA',
            quantidade: poItem.quantidade,
            saldoAntes: item.saldo,
            saldoDepois: item.saldo + poItem.quantidade,
            motivo: `Recebimento PO ${po.codigo}`,
            responsavel: 'System',
          },
        });

        await this.prisma.item.update({
          where: { id: item.id },
          data: { saldo: item.saldo + poItem.quantidade },
        });
      }
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        dataRecebimento: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'RECEIVE',
        entity: 'PurchaseOrder',
        entityId: id,
        after: JSON.stringify({ status: 'DELIVERED' }),
        organizationId,
      },
    });

    return updated;
  }
}
