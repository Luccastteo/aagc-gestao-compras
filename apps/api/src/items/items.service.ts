import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.item.findMany({
      where: { organizationId },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCritical(organizationId: string) {
    const items = await this.prisma.item.findMany({
      where: { organizationId },
      include: { supplier: true },
    });

    return items.filter(item => item.saldo <= item.minimo);
  }

  async findOne(id: string, organizationId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, organizationId },
      include: { supplier: true, movements: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  async create(data: any, organizationId: string, userId: string) {
    const existing = await this.prisma.item.findFirst({
      where: { sku: data.sku, organizationId },
    });

    if (existing) {
      throw new BadRequestException('SKU already exists in this organization');
    }

    const item = await this.prisma.item.create({
      data: {
        ...data,
        organizationId,
      },
      include: { supplier: true },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'CREATE',
        entity: 'Item',
        entityId: item.id,
        after: JSON.stringify(item),
        organizationId,
      },
    });

    return item;
  }

  async update(id: string, data: any, organizationId: string, userId: string) {
    const item = await this.findOne(id, organizationId);

    const updated = await this.prisma.item.update({
      where: { id },
      data,
      include: { supplier: true },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'UPDATE',
        entity: 'Item',
        entityId: item.id,
        before: JSON.stringify(item),
        after: JSON.stringify(updated),
        organizationId,
      },
    });

    return updated;
  }

  async delete(id: string, organizationId: string, userId: string) {
    const item = await this.findOne(id, organizationId);

    await this.prisma.item.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'DELETE',
        entity: 'Item',
        entityId: item.id,
        before: JSON.stringify(item),
        organizationId,
      },
    });

    return { deleted: true };
  }

  async movimentar(
    id: string,
    tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE',
    quantidade: number,
    motivo: string,
    organizationId: string,
    responsavel: string,
  ) {
    const item = await this.findOne(id, organizationId);

    const saldoAntes = item.saldo;
    let saldoDepois = saldoAntes;

    if (tipo === 'ENTRADA') {
      saldoDepois = saldoAntes + quantidade;
    } else if (tipo === 'SAIDA') {
      saldoDepois = saldoAntes - quantidade;
      if (saldoDepois < 0) {
        throw new BadRequestException('Insufficient stock');
      }
    } else if (tipo === 'AJUSTE') {
      saldoDepois = quantidade;
    }

    const [movement, updatedItem] = await this.prisma.$transaction([
      this.prisma.movement.create({
        data: {
          itemId: id,
          tipo,
          quantidade: Math.abs(quantidade),
          saldoAntes,
          saldoDepois,
          motivo,
          responsavel,
        },
      }),
      this.prisma.item.update({
        where: { id },
        data: { saldo: saldoDepois },
        include: { supplier: true },
      }),
    ]);

    return { movement, item: updatedItem };
  }

  async analyze(organizationId: string) {
    const items = await this.prisma.item.findMany({
      where: { organizationId },
      include: { supplier: true },
    });

    const suggestions = items
      .filter(item => item.saldo <= item.minimo)
      .map(item => {
        const falta = item.minimo - item.saldo;
        const sugestaoCompra = Math.max(falta, item.maximo - item.saldo);

        return {
          itemId: item.id,
          sku: item.sku,
          descricao: item.descricao,
          saldoAtual: item.saldo,
          minimo: item.minimo,
          maximo: item.maximo,
          falta,
          sugestaoCompra,
          custoEstimado: sugestaoCompra * item.custoUnitario,
          supplier: item.supplier,
        };
      });

    return {
      totalItems: items.length,
      itemsCriticos: suggestions.length,
      valorTotalEstimado: suggestions.reduce((sum, s) => sum + s.custoEstimado, 0),
      suggestions,
    };
  }

  // ========== IMPORT/EXPORT EXCEL ==========

  async exportToExcel(organizationId: string) {
    const items = await this.prisma.item.findMany({
      where: { organizationId },
      include: { supplier: true },
      orderBy: { sku: 'asc' },
    });

    const exportData = items.map(item => ({
      SKU: item.sku,
      Descricao: item.descricao,
      Categoria: item.categoria || '',
      Unidade: item.unidade,
      Estoque_Atual: item.saldo,
      Estoque_Minimo: item.minimo,
      Estoque_Maximo: item.maximo,
      Custo_Unitario: item.custoUnitario,
      Lead_Time_Dias: item.leadTimeDays,
      Localizacao: item.localizacao || '',
      Fornecedor: item.supplier?.nome || '',
      Status: item.saldo <= item.minimo ? 'CRITICO' : 'OK',
      Falta: item.saldo <= item.minimo ? item.minimo - item.saldo : 0,
      Sugestao_Compra: item.saldo <= item.minimo ? item.maximo - item.saldo : 0,
      Custo_Reposicao: item.saldo <= item.minimo ? (item.maximo - item.saldo) * item.custoUnitario : 0,
    }));

    return {
      data: exportData,
      filename: `estoque_${new Date().toISOString().split('T')[0]}.xlsx`,
      totalItems: items.length,
      criticalItems: items.filter(i => i.saldo <= i.minimo).length,
    };
  }

  getImportTemplate() {
    const templateData = [
      {
        SKU: 'EXEMPLO-001',
        Descricao: 'Produto de Exemplo',
        Categoria: 'Categoria A',
        Unidade: 'UN',
        Estoque_Atual: 100,
        Estoque_Minimo: 10,
        Estoque_Maximo: 200,
        Custo_Unitario: 25.50,
        Lead_Time_Dias: 7,
        Localizacao: 'A1-01',
      },
    ];

    return {
      template: templateData,
      columns: [
        { field: 'SKU', description: 'Código único do item (obrigatório)', required: true },
        { field: 'Descricao', description: 'Descrição do item (obrigatório)', required: true },
        { field: 'Categoria', description: 'Categoria do item', required: false },
        { field: 'Unidade', description: 'Unidade de medida (UN, KG, L, etc)', required: false },
        { field: 'Estoque_Atual', description: 'Quantidade atual em estoque', required: false },
        { field: 'Estoque_Minimo', description: 'Quantidade mínima de segurança', required: false },
        { field: 'Estoque_Maximo', description: 'Quantidade máxima ideal', required: false },
        { field: 'Custo_Unitario', description: 'Custo por unidade em R$', required: false },
        { field: 'Lead_Time_Dias', description: 'Tempo de entrega em dias', required: false },
        { field: 'Localizacao', description: 'Localização no estoque', required: false },
      ],
    };
  }

  async importFromExcel(items: any[], organizationId: string, userId: string) {
    const results = {
      success: [] as any[],
      errors: [] as any[],
      updated: [] as any[],
    };

    for (const row of items) {
      try {
        // Validate required fields
        if (!row.SKU || !row.Descricao) {
          results.errors.push({
            row,
            error: 'SKU e Descrição são obrigatórios',
          });
          continue;
        }

        const sku = String(row.SKU).trim();
        const descricao = String(row.Descricao).trim();

        // Check if item exists
        const existing = await this.prisma.item.findFirst({
          where: { sku, organizationId },
        });

        const itemData = {
          sku,
          descricao,
          categoria: row.Categoria ? String(row.Categoria).trim() : null,
          unidade: row.Unidade ? String(row.Unidade).trim() : 'UN',
          saldo: Number(row.Estoque_Atual) || 0,
          minimo: Number(row.Estoque_Minimo) || 0,
          maximo: Number(row.Estoque_Maximo) || 100,
          custoUnitario: Number(row.Custo_Unitario) || 0,
          leadTimeDays: Number(row.Lead_Time_Dias) || 7,
          localizacao: row.Localizacao ? String(row.Localizacao).trim() : null,
        };

        if (existing) {
          // Update existing item
          const updated = await this.prisma.item.update({
            where: { id: existing.id },
            data: itemData,
          });

          // Audit log
          await this.prisma.auditLog.create({
            data: {
              actorUserId: userId,
              action: 'UPDATE',
              entity: 'Item',
              entityId: existing.id,
              before: JSON.stringify(existing),
              after: JSON.stringify(updated),
              organizationId,
            },
          });

          results.updated.push({ sku, id: existing.id });
        } else {
          // Create new item
          const created = await this.prisma.item.create({
            data: {
              ...itemData,
              organizationId,
            },
          });

          // Audit log
          await this.prisma.auditLog.create({
            data: {
              actorUserId: userId,
              action: 'CREATE',
              entity: 'Item',
              entityId: created.id,
              after: JSON.stringify(created),
              organizationId,
            },
          });

          results.success.push({ sku, id: created.id });
        }
      } catch (error) {
        results.errors.push({
          row,
          error: error.message,
        });
      }
    }

    return {
      message: 'Importação concluída',
      created: results.success.length,
      updated: results.updated.length,
      errors: results.errors.length,
      details: results,
    };
  }
}
