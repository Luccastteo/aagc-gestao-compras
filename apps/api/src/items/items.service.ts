import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = pagination?.page || 1;
    const pageSize = Math.max(1, Math.min(pagination?.pageSize || 20, 100));
    const skip = (page - 1) * pageSize;

    const where: any = { organizationId };

    // Busca textual por SKU ou Descrição (ILIKE case-insensitive)
    if (pagination?.search) {
      where.OR = [
        { sku: { contains: pagination.search, mode: 'insensitive' } },
        { descricao: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (pagination?.sortBy) {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take: pageSize,
        include: { supplier: true },
        orderBy,
      }),
      this.prisma.item.count({ where }),
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

  async findCritical(organizationId: string) {
    // Filtra diretamente no banco usando field reference (Prisma 5.3+)
    // Evita carregar todos os itens em memória para filtrar em JS
    return this.prisma.item.findMany({
      where: {
        organizationId,
        saldo: { lte: this.prisma.item.fields.minimo },
      },
      include: { supplier: true },
      orderBy: { sku: 'asc' },
    });
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
    actorUserId: string,
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
      if (quantidade < 0) {
        throw new BadRequestException('Quantidade de ajuste não pode ser negativa');
      }
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

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'UPDATE',
        entity: 'Item',
        entityId: id,
        before: JSON.stringify({ saldo: saldoAntes }),
        after: JSON.stringify({ saldo: saldoDepois, movementId: movement.id, tipo, quantidade: Math.abs(quantidade), motivo }),
        organizationId,
      },
    });

    return { movement, item: updatedItem };
  }

  async analyze(organizationId: string, actorUserId: string) {
    // OBS: este método é chamado pelo Web no botão "Analisar Estoque".
    // Requisito do MVP: gerar ALERTAS e SUGESTÕES persistidas.

    // Busca todos os IDs para determinar não-críticos, e críticos separadamente.
    // Usa field reference (Prisma 5.3+) para comparar saldo <= minimo no banco.
    const [allItemIds, critical] = await Promise.all([
      this.prisma.item.findMany({
        where: { organizationId },
        select: { id: true },
      }),
      this.prisma.item.findMany({
        where: {
          organizationId,
          saldo: { lte: this.prisma.item.fields.minimo },
        },
        include: { supplier: true },
      }),
    ]);

    const criticalIds = new Set(critical.map((i) => i.id));

    const beforeCounts = await this.prisma.$transaction([
      this.prisma.inventoryAlert.count({ where: { organizationId, status: 'OPEN' } }),
      this.prisma.purchaseSuggestion.count({ where: { organizationId, status: 'OPEN' } }),
    ]);

    await this.prisma.$transaction(async (tx) => {
      // Upsert OPEN alerts/suggestions para itens críticos
      for (const item of critical) {
        const falta = Math.max(item.minimo - item.saldo, 0);
        const sugestaoCompra = Math.max(1, item.maximo - item.saldo);
        const custoEstimado = sugestaoCompra * item.custoUnitario;

        const severity =
          item.saldo === 0 || falta >= item.minimo
            ? 'HIGH'
            : falta > 0
              ? 'MEDIUM'
              : 'LOW';

        const reason = `Saldo (${item.saldo}) <= mínimo (${item.minimo}). Falta: ${falta}.`;
        const snapshot = JSON.stringify({
          itemId: item.id,
          sku: item.sku,
          descricao: item.descricao,
          saldo: item.saldo,
          minimo: item.minimo,
          maximo: item.maximo,
          leadTimeDays: item.leadTimeDays,
          custoUnitario: item.custoUnitario,
          supplierId: item.supplierId,
          analyzedAt: new Date().toISOString(),
        });

        await tx.inventoryAlert.upsert({
          where: {
            organizationId_itemId_status: {
              organizationId,
              itemId: item.id,
              status: 'OPEN',
            },
          },
          create: {
            organizationId,
            itemId: item.id,
            status: 'OPEN',
            severity,
            reason,
            snapshot,
          },
          update: {
            severity,
            reason,
            snapshot,
            updatedAt: new Date(),
          },
        });

        await tx.purchaseSuggestion.upsert({
          where: {
            organizationId_itemId_status: {
              organizationId,
              itemId: item.id,
              status: 'OPEN',
            },
          },
          create: {
            organizationId,
            itemId: item.id,
            supplierId: item.supplierId,
            status: 'OPEN',
            suggestedQty: sugestaoCompra,
            unitCost: item.custoUnitario,
            estimatedTotal: custoEstimado,
            reason,
            snapshot,
          },
          update: {
            supplierId: item.supplierId,
            suggestedQty: sugestaoCompra,
            unitCost: item.custoUnitario,
            estimatedTotal: custoEstimado,
            reason,
            snapshot,
            updatedAt: new Date(),
          },
        });
      }

      // Fecha alertas/sugestões OPEN que não são mais críticos (evita lixo/stale)
      const nonCriticalIds = allItemIds.filter((i) => !criticalIds.has(i.id)).map((i) => i.id);
      if (nonCriticalIds.length > 0) {
        await tx.inventoryAlert.updateMany({
          where: { organizationId, status: 'OPEN', itemId: { in: nonCriticalIds } },
          data: { status: 'CLOSED' },
        });
        await tx.purchaseSuggestion.updateMany({
          where: { organizationId, status: 'OPEN', itemId: { in: nonCriticalIds } },
          data: { status: 'IGNORED' },
        });
      }
    });

    const openSuggestions = await this.prisma.purchaseSuggestion.findMany({
      where: { organizationId, status: 'OPEN' },
      include: { item: true, supplier: true },
      orderBy: { estimatedTotal: 'desc' },
    });

    const suggestions = openSuggestions.map((s) => {
      const item = s.item;
      const falta = Math.max(item.minimo - item.saldo, 0);
      return {
        suggestionId: s.id,
        itemId: item.id,
        sku: item.sku,
        descricao: item.descricao,
        saldoAtual: item.saldo,
        minimo: item.minimo,
        maximo: item.maximo,
        falta,
        sugestaoCompra: s.suggestedQty,
        custoEstimado: s.estimatedTotal,
        supplier: s.supplier,
      };
    });

    const afterCounts = await this.prisma.$transaction([
      this.prisma.inventoryAlert.count({ where: { organizationId, status: 'OPEN' } }),
      this.prisma.purchaseSuggestion.count({ where: { organizationId, status: 'OPEN' } }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'ANALYZE_INVENTORY',
        entity: 'Inventory',
        entityId: 'analysis',
        before: JSON.stringify({
          alertsOpen: beforeCounts[0],
          suggestionsOpen: beforeCounts[1],
        }),
        after: JSON.stringify({
          criticalItems: critical.length,
          alertsOpen: afterCounts[0],
          suggestionsOpen: afterCounts[1],
        }),
        organizationId,
      },
    });

    return {
      totalItems: allItemIds.length,
      itemsCriticos: critical.length,
      valorTotalEstimado: suggestions.reduce((sum, s) => sum + s.custoEstimado, 0),
      suggestions,
      persisted: {
        alertsOpenBefore: beforeCounts[0],
        suggestionsOpenBefore: beforeCounts[1],
        alertsOpenAfter: afterCounts[0],
        suggestionsOpenAfter: afterCounts[1],
      },
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
      filename: `produtos_${new Date().toISOString().split('T')[0]}.xlsx`,
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

    // Função helper para converter números de forma segura
    const safeNumber = (value: any, defaultValue: number): number => {
      if (value === null || value === undefined || value === '') return defaultValue;
      const num = Number(value);
      return isNaN(num) || !isFinite(num) ? defaultValue : num;
    };

    // Valida e normaliza todas as linhas primeiro, separando erros imediatos
    type ValidRow = { sku: string; descricao: string; rawRow: any };
    const validRows: ValidRow[] = [];

    for (const row of items) {
      if (!row.SKU || !row.Descricao) {
        results.errors.push({ row, error: 'SKU e Descrição são obrigatórios' });
        continue;
      }
      const sku = String(row.SKU).trim();
      const descricao = String(row.Descricao).trim();
      if (!sku || !descricao || sku === 'undefined' || descricao === 'undefined' || sku === 'null' || descricao === 'null') {
        results.errors.push({ row, error: 'SKU e Descrição não podem ser vazios' });
        continue;
      }
      validRows.push({ sku, descricao, rawRow: row });
    }

    if (validRows.length === 0) {
      return {
        message: 'Importação concluída',
        created: 0,
        updated: 0,
        errors: results.errors.length,
        details: results,
      };
    }

    // Batch lookup: busca todos os SKUs existentes de uma vez (evita N queries)
    const skus = validRows.map((r) => r.sku);
    const existingItems = await this.prisma.item.findMany({
      where: { organizationId, sku: { in: skus } },
      select: { id: true, sku: true },
    });
    const existingMap = new Map(existingItems.map((i) => [i.sku, i.id]));

    for (const { sku, descricao, rawRow: row } of validRows) {
      try {
        const itemData = {
          sku,
          descricao,
          categoria: row.Categoria && String(row.Categoria).trim() !== '' ? String(row.Categoria).trim() : null,
          unidade: row.Unidade && String(row.Unidade).trim() !== '' ? String(row.Unidade).trim() : 'UN',
          saldo: safeNumber(row.Estoque_Atual, 0),
          minimo: safeNumber(row.Estoque_Minimo, 0),
          maximo: safeNumber(row.Estoque_Maximo, 100),
          custoUnitario: safeNumber(row.Custo_Unitario, 0),
          leadTimeDays: safeNumber(row.Lead_Time_Dias, 7),
          localizacao: row.Localizacao && String(row.Localizacao).trim() !== '' ? String(row.Localizacao).trim() : null,
        };

        const existingId = existingMap.get(sku);

        if (existingId) {
          // Update existing item
          const [, updated] = await this.prisma.$transaction([
            this.prisma.auditLog.create({
              data: {
                actorUserId: userId,
                action: 'UPDATE',
                entity: 'Item',
                entityId: existingId,
                organizationId,
              },
            }),
            this.prisma.item.update({
              where: { id: existingId },
              data: itemData,
            }),
          ]);

          results.updated.push({ sku, id: existingId });
        } else {
          // Create new item
          const created = await this.prisma.item.create({
            data: { ...itemData, organizationId },
          });

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
          error: error instanceof Error ? error.message : String(error),
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
