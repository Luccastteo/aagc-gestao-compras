/**
 * ML Data Collection
 * 
 * Coleta dados históricos para alimentar modelos de Machine Learning:
 * - Consumo diário de itens
 * - Performance de fornecedores
 * - Histórico de preços
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Calcula consumo diário baseado em movimentações
 */
export async function calculateConsumptionHistory(organizationId: string): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Buscar movimentações de saída do dia anterior
  const movements = await prisma.movement.findMany({
    where: {
      item: { organizationId },
      createdAt: { gte: yesterday, lt: today },
      tipo: 'SAIDA',
    },
    include: { item: true },
  });

  // Agrupar por item
  const itemMap = new Map<string, number>();
  for (const mov of movements) {
    const current = itemMap.get(mov.itemId) || 0;
    itemMap.set(mov.itemId, current + Math.abs(mov.quantidade));
  }

  // Salvar histórico
  const date = yesterday;
  const dayOfWeek = date.getDay();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  const year = date.getFullYear();
  const weekOfYear = getWeekNumber(date);

  for (const [itemId, quantity] of itemMap) {
    await prisma.consumptionHistory.upsert({
      where: {
        organizationId_itemId_date: { organizationId, itemId, date },
      },
      create: {
        organizationId,
        itemId,
        date,
        quantity,
        dayOfWeek,
        month,
        quarter,
        year,
        weekOfYear,
        source: 'SYSTEM_CALCULATED',
      },
      update: { quantity },
    });
  }

  console.log(`[ML_DATA] Consumption history: ${itemMap.size} items`);
}

/**
 * Atualiza performance de fornecedores baseada em POs completadas
 */
export async function updateSupplierPerformance(organizationId: string): Promise<void> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      organizationId,
      status: { in: ['DELIVERED', 'SENT', 'APPROVED'] },
      createdAt: { gte: ninetyDaysAgo },
    },
    include: { supplier: true },
  });

  const supplierMap = new Map<string, any[]>();
  for (const po of pos) {
    if (!supplierMap.has(po.supplierId)) {
      supplierMap.set(po.supplierId, []);
    }
    supplierMap.get(po.supplierId)!.push(po);
  }

  for (const [supplierId, supplierPOs] of supplierMap) {
    const totalOrders = supplierPOs.length;
    const completedOrders = supplierPOs.filter((po) => po.status === 'DELIVERED').length;
    const lateOrders = supplierPOs.filter((po) => {
      if (!po.previsaoEntrega || !po.dataRecebimento) return false;
      return po.dataRecebimento > po.previsaoEntrega;
    }).length;

    // Calcular lead time médio
    const leadTimes = supplierPOs
      .filter((po) => po.dataRecebimento && po.createdAt)
      .map((po) => {
        const diff = po.dataRecebimento!.getTime() - po.createdAt.getTime();
        return diff / (1000 * 60 * 60 * 24);
      });

    const avgLeadTime = leadTimes.length > 0 
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length 
      : supplierPOs[0]?.supplier.prazoMedioDias || 7;

    const onTimeRate = completedOrders > 0 ? (completedOrders - lateOrders) / completedOrders : 0.85;
    const qualityScore = 75; // Placeholder - pode ser calculado de feedbacks
    const priceScore = 70; // Placeholder - pode ser calculado comparando com mercado
    const commScore = 80; // Placeholder - pode ser calculado de tempo de resposta

    await prisma.supplierPerformance.upsert({
      where: {
        organizationId_supplierId: { organizationId, supplierId },
      },
      create: {
        organizationId,
        supplierId,
        avgLeadTimeDays: avgLeadTime,
        onTimeDeliveryRate: onTimeRate,
        qualityScore,
        priceCompetitiveness: priceScore,
        communicationScore: commScore,
        totalOrders,
        completedOrders,
        lateOrders,
        dataFrom: ninetyDaysAgo,
        dataTo: new Date(),
      },
      update: {
        avgLeadTimeDays: avgLeadTime,
        onTimeDeliveryRate: onTimeRate,
        qualityScore,
        priceCompetitiveness: priceScore,
        communicationScore: commScore,
        totalOrders,
        completedOrders,
        lateOrders,
        lastEvaluatedAt: new Date(),
        dataTo: new Date(),
      },
    });
  }

  console.log(`[ML_DATA] Supplier performance: ${supplierMap.size} suppliers`);
}

/**
 * Rastreia variações de preços de POs recentes
 */
export async function trackPriceChanges(organizationId: string): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentPOs = await prisma.purchaseOrder.findMany({
    where: {
      organizationId,
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      items: { include: { item: true } },
    },
  });

  let tracked = 0;

  for (const po of recentPOs) {
    for (const poItem of po.items) {
      // Verificar se já existe registro
      const existing = await prisma.priceHistory.findFirst({
        where: {
          organizationId,
          itemId: poItem.itemId,
          supplierId: po.supplierId,
          referenceId: po.id,
        },
      });

      if (!existing) {
        await prisma.priceHistory.create({
          data: {
            organizationId,
            itemId: poItem.itemId,
            supplierId: po.supplierId,
            price: poItem.precoUnitario,
            quantity: poItem.quantidade,
            source: 'PURCHASE_ORDER',
            referenceId: po.id,
            effectiveDate: po.createdAt,
          },
        });
        tracked++;
      }
    }
  }

  console.log(`[ML_DATA] Price history: ${tracked} new records`);
}

/**
 * Processa coleta de dados ML para uma organização
 */
export async function processMLDataCollection(orgId: string, jobId?: string): Promise<any> {
  console.log(`[ML_DATA_COLLECTION] org=${orgId} job=${jobId}`);

  try {
    await calculateConsumptionHistory(orgId);
    await updateSupplierPerformance(orgId);
    await trackPriceChanges(orgId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: null,
        action: 'JOB_ML_DATA_COLLECTION',
        entity: 'MLData',
        entityId: `job:${jobId}`,
        after: JSON.stringify({
          orgId,
          jobId,
          timestamp: new Date().toISOString(),
        }),
        organizationId: orgId,
      },
    });

    return { success: true, org: orgId };
  } catch (error) {
    console.error(`[ML_DATA_COLLECTION] Error for org ${orgId}:`, error);
    throw error;
  }
}
