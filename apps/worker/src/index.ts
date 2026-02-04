import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

// Requisito: jobs com nomes exatos
const inventoryQueue = new Queue('inventory_daily_check', { connection });
const poFollowupQueue = new Queue('po_followup', { connection });

function nowIso() {
  return new Date().toISOString();
}

async function upsertAlertsAndSuggestions(orgId: string) {
  const items = await prisma.item.findMany({
    where: { organizationId: orgId },
    include: { supplier: true },
  });

  const critical = items.filter((i) => i.saldo <= i.minimo);
  const criticalIds = new Set(critical.map((i) => i.id));

  for (const item of critical) {
    const falta = Math.max(item.minimo - item.saldo, 0);
    const suggestedQty = Math.max(1, item.maximo - item.saldo);
    const estimatedTotal = suggestedQty * item.custoUnitario;

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
      analyzedAt: nowIso(),
      source: 'worker',
    });

    await prisma.inventoryAlert.upsert({
      where: {
        organizationId_itemId_status: {
          organizationId: orgId,
          itemId: item.id,
          status: 'OPEN',
        },
      },
      create: {
        organizationId: orgId,
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

    await prisma.purchaseSuggestion.upsert({
      where: {
        organizationId_itemId_status: {
          organizationId: orgId,
          itemId: item.id,
          status: 'OPEN',
        },
      },
      create: {
        organizationId: orgId,
        itemId: item.id,
        supplierId: item.supplierId,
        status: 'OPEN',
        suggestedQty,
        unitCost: item.custoUnitario,
        estimatedTotal,
        reason,
        snapshot,
      },
      update: {
        supplierId: item.supplierId,
        suggestedQty,
        unitCost: item.custoUnitario,
        estimatedTotal,
        reason,
        snapshot,
        updatedAt: new Date(),
      },
    });
  }

  const nonCriticalIds = items.filter((i) => !criticalIds.has(i.id)).map((i) => i.id);
  if (nonCriticalIds.length > 0) {
    await prisma.inventoryAlert.updateMany({
      where: { organizationId: orgId, status: 'OPEN', itemId: { in: nonCriticalIds } },
      data: { status: 'CLOSED' },
    });
    await prisma.purchaseSuggestion.updateMany({
      where: { organizationId: orgId, status: 'OPEN', itemId: { in: nonCriticalIds } },
      data: { status: 'IGNORED' },
    });
  }

  return { processed: items.length, critical: critical.length };
}

// Job 1: inventory_daily_check (DEV: 60s)
const inventoryWorker = new Worker(
  'inventory_daily_check',
  async (job) => {
    const { orgId } = job.data as { orgId: string };
    console.log(`[inventory_daily_check] org=${orgId} job=${job.id}`);

    const before = await Promise.all([
      prisma.inventoryAlert.count({ where: { organizationId: orgId, status: 'OPEN' } }),
      prisma.purchaseSuggestion.count({ where: { organizationId: orgId, status: 'OPEN' } }),
    ]);

    const result = await upsertAlertsAndSuggestions(orgId);

    const after = await Promise.all([
      prisma.inventoryAlert.count({ where: { organizationId: orgId, status: 'OPEN' } }),
      prisma.purchaseSuggestion.count({ where: { organizationId: orgId, status: 'OPEN' } }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorUserId: null,
        action: 'JOB_INVENTORY_DAILY_CHECK',
        entity: 'Inventory',
        entityId: `inventory_daily_check:${orgId}`,
        before: JSON.stringify({ alertsOpen: before[0], suggestionsOpen: before[1] }),
        after: JSON.stringify({ ...result, alertsOpen: after[0], suggestionsOpen: after[1] }),
        organizationId: orgId,
      },
    });

    return result;
  },
  { connection },
);

// Job 2: po_followup (DEV: 60s)
const poFollowupWorker = new Worker(
  'po_followup',
  async (job) => {
    const { orgId } = job.data as { orgId: string };
    console.log(`[po_followup] org=${orgId} job=${job.id}`);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingPOs = await prisma.purchaseOrder.findMany({
      where: {
        organizationId: orgId,
        status: 'SENT',
        updatedAt: { lt: cutoff }, // "sem update > 24h"
      },
      include: { supplier: true },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });

    let created = 0;

    for (const po of pendingPOs) {
      // Idempotência: não criar follow-up se já houve follow-up nas últimas 24h
      const existing = await prisma.commsLog.findFirst({
        where: {
          organizationId: orgId,
          entity: 'PurchaseOrder',
          entityId: po.id,
          tipo: 'WHATSAPP',
          assunto: { startsWith: 'Follow-up' },
          createdAt: { gt: cutoff },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) continue;

      const comm = await prisma.commsLog.create({
        data: {
          tipo: 'WHATSAPP',
          destinatario: po.supplier.whatsapp || po.supplier.telefone || 'N/A',
          assunto: `Follow-up ${po.codigo}`,
          mensagem: `Pedido ${po.codigo} sem atualização há >24h. Fornecedor: ${po.supplier.nome}. (SIMULADO)`,
          status: 'SIMULATED',
          entity: 'PurchaseOrder',
          entityId: po.id,
          organizationId: orgId,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: null,
          action: 'JOB_PO_FOLLOWUP',
          entity: 'CommsLog',
          entityId: comm.id,
          after: JSON.stringify({ purchaseOrderId: po.id, poCode: po.codigo, commsLogId: comm.id }),
          organizationId: orgId,
        },
      });

      created++;
    }

    return { processed: pendingPOs.length, followupsCreated: created };
  },
  { connection },
);

// Event handlers
inventoryWorker.on('completed', (job) => {
  console.log(`✅ [InventoryCheck] Job ${job.id} completed`);
});

inventoryWorker.on('failed', (job, err) => {
  console.error(`❌ [InventoryCheck] Job ${job?.id} failed:`, err);
});

poFollowupWorker.on('completed', (job) => {
  console.log(`✅ [POFollowup] Job ${job.id} completed`);
});

poFollowupWorker.on('failed', (job, err) => {
  console.error(`❌ [POFollowup] Job ${job?.id} failed:`, err);
});

// Schedule repeating jobs
async function setupScheduledJobs() {
  console.log('⏰ Setting up scheduled jobs...');

  const isDev = process.env.NODE_ENV !== 'production';
  
  // Get all organizations
  const orgs = await prisma.organization.findMany({
    where: { status: 'active' },
  });

  for (const org of orgs) {
    await inventoryQueue.add(
      'run',
      { orgId: org.id },
      {
        jobId: `inventory_daily_check:${org.id}`,
        repeat: isDev ? { every: 60000 } : { pattern: '0 8 * * *' },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );

    await poFollowupQueue.add(
      'run',
      { orgId: org.id },
      {
        jobId: `po_followup:${org.id}`,
        repeat: isDev ? { every: 60000 } : { pattern: '0 */4 * * *' },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );
  }

  console.log(`✅ Scheduled jobs for ${orgs.length} organization(s) [${isDev ? 'DEV MODE: 60s interval' : 'PROD MODE: cron schedule'}]`);
}

// Start
async function start() {
  console.log('🚀 AAGC Worker starting...');

  try {
    await setupScheduledJobs();
    console.log('✅ Worker ready and listening for jobs');
  } catch (error) {
    console.error('❌ Worker startup failed:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 Shutting down worker...');
  await inventoryWorker.close();
  await poFollowupWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
