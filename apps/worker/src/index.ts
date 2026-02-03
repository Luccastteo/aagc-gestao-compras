import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Queue definitions
const inventoryQueue = new Queue('inventory-check', { connection });
const poFollowupQueue = new Queue('po-followup', { connection });

// Worker: Daily Inventory Check
const inventoryWorker = new Worker(
  'inventory-check',
  async (job) => {
    console.log(`[InventoryCheck] Processing job for org: ${job.data.orgId}`);

    const { orgId } = job.data;

    const items = await prisma.item.findMany({
      where: { organizationId: orgId },
      include: { supplier: true },
    });

    const criticalItems = items.filter((item) => item.saldo <= item.minimo);

    console.log(`[InventoryCheck] Found ${criticalItems.length} critical items`);

    if (criticalItems.length > 0) {
      const board = await prisma.kanbanBoard.findFirst({
        where: { organizationId: orgId },
      });

      if (board) {
        for (const item of criticalItems.slice(0, 5)) {
          const existingCard = await prisma.kanbanCard.findFirst({
            where: {
              boardId: board.id,
              titulo: { contains: item.sku },
              status: { not: 'DONE' },
            },
          });

          if (!existingCard) {
            const operator = await prisma.user.findFirst({
              where: { organizationId: orgId, role: 'OPERATOR' },
            });

            if (operator) {
              await prisma.kanbanCard.create({
                data: {
                  titulo: `⚠️ Estoque Crítico: ${item.sku}`,
                  descricao: `${item.descricao} - Saldo: ${item.saldo} / Mínimo: ${item.minimo}`,
                  status: 'TODO',
                  posicao: 0,
                  boardId: board.id,
                  createdById: operator.id,
                  organizationId: orgId,
                },
              });

              console.log(`[InventoryCheck] Created kanban card for ${item.sku}`);
            }
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          actorUserId: 'SYSTEM',
          action: 'ALERT',
          entity: 'Inventory',
          entityId: 'daily-check',
          after: JSON.stringify({ criticalItems: criticalItems.length }),
          organizationId: orgId,
        },
      });
    }

    return { processed: items.length, critical: criticalItems.length };
  },
  { connection },
);

// Worker: PO Follow-up
const poFollowupWorker = new Worker(
  'po-followup',
  async (job) => {
    console.log(`[POFollowup] Processing job for org: ${job.data.orgId}`);

    const { orgId } = job.data;

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

    const pendingPOs = await prisma.purchaseOrder.findMany({
      where: {
        organizationId: orgId,
        status: 'SENT',
        dataEnvio: { lt: cutoff },
      },
      include: { supplier: true },
    });

    console.log(`[POFollowup] Found ${pendingPOs.length} pending POs > 24h`);

    for (const po of pendingPOs) {
      await prisma.commsLog.create({
        data: {
          tipo: 'WHATSAPP',
          destinatario: po.supplier.whatsapp || po.supplier.telefone || 'N/A',
          assunto: `Follow-up ${po.codigo}`,
          mensagem: `Pedido ${po.codigo} aguardando confirmação há mais de 24h. Fornecedor: ${po.supplier.nome}`,
          status: 'SIMULATED',
          organizationId: orgId,
        },
      });

      console.log(`[POFollowup] Logged follow-up for PO ${po.codigo}`);
    }

    return { processed: pendingPOs.length };
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

  // Get all organizations
  const orgs = await prisma.organization.findMany({
    where: { status: 'active' },
  });

  for (const org of orgs) {
    // Daily inventory check at 8 AM
    await inventoryQueue.add(
      'daily-check',
      { orgId: org.id },
      {
        repeat: {
          pattern: '0 8 * * *', // Every day at 8 AM
        },
      },
    );

    // PO follow-up every 4 hours
    await poFollowupQueue.add(
      'followup',
      { orgId: org.id },
      {
        repeat: {
          pattern: '0 */4 * * *', // Every 4 hours
        },
      },
    );
  }

  console.log(`✅ Scheduled jobs for ${orgs.length} organization(s)`);
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
