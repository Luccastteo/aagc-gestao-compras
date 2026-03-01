/**
 * Auto PO Generation - Aggressive & Deterministic
 * 
 * This module handles automatic generation of Purchase Orders (DRAFT only)
 * based on inventory levels. The logic is:
 * 
 * 1. TRIGGER: item.saldo <= item.minimo
 * 2. QTY: target = maximo, qtyFinal = max(1, maximo - saldo)
 * 3. SUPPLIER: item.supplierId > org.defaultSupplier > lastPO for SKU > SKIP
 * 4. DEDUPE: One AUTO PO per (org, supplier, 6h window)
 * 5. UPSERT: Add new items, update qty to MAX(current, new) - never reduce
 */

import { PrismaClient, POStatus, POSource, KanbanStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Config from env
const AUTO_PO_WINDOW_HOURS = parseInt(process.env.AUTO_PO_WINDOW_HOURS || '6', 10);
const AUTO_PO_SKIP_IF_MANUAL_DRAFT_MIN = parseInt(process.env.AUTO_PO_SKIP_IF_MANUAL_DRAFT_MIN || '60', 10);

interface CriticalItem {
  id: string;
  sku: string;
  descricao: string;
  saldo: number;
  minimo: number;
  maximo: number;
  custoUnitario: number;
  supplierId: string | null;
  organizationId: string;
}

interface SupplierResolution {
  supplierId: string | null;
  supplierName: string | null;
  reason: 'ITEM_PREFERRED' | 'ORG_DEFAULT' | 'HISTORICAL_PO' | 'NO_SUPPLIER';
}

interface AutoPOResult {
  orgId: string;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  details: {
    poId?: string;
    supplierId?: string;
    supplierName?: string;
    action: 'CREATED' | 'UPDATED' | 'SKIPPED';
    reason?: string;
    itemCount?: number;
    dedupeKey?: string;
  }[];
}

/**
 * Calculate the window start time (floor to nearest N hours in UTC)
 */
function calculateWindowStart(windowHours: number): Date {
  const now = new Date();
  const msPerHour = 60 * 60 * 1000;
  const msPerWindow = windowHours * msPerHour;
  const windowStartMs = Math.floor(now.getTime() / msPerWindow) * msPerWindow;
  return new Date(windowStartMs);
}

/**
 * Generate dedupe key for auto PO
 */
function generateDedupeKey(orgId: string, supplierId: string, windowStart: Date): string {
  return `AUTO:${orgId}:${supplierId}:${windowStart.toISOString()}`;
}

/**
 * Resolve supplier for an item using deterministic rules
 */
async function resolveSupplier(
  item: CriticalItem,
  defaultSupplier: { id: string; nome: string } | null,
): Promise<SupplierResolution> {
  // Rule 1: Item has preferred supplier
  if (item.supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: item.supplierId },
      select: { id: true, nome: true, status: true },
    });
    if (supplier && supplier.status === 'ativo') {
      return {
        supplierId: supplier.id,
        supplierName: supplier.nome,
        reason: 'ITEM_PREFERRED',
      };
    }
  }

  // Rule 2: Org has default supplier
  if (defaultSupplier) {
    return {
      supplierId: defaultSupplier.id,
      supplierName: defaultSupplier.nome,
      reason: 'ORG_DEFAULT',
    };
  }

  // Rule 3: Historical PO for this SKU (most recent)
  const historicalPO = await prisma.purchaseOrder.findFirst({
    where: {
      organizationId: item.organizationId,
      status: { in: ['DELIVERED', 'SENT', 'APPROVED'] },
      items: {
        some: {
          item: { sku: item.sku },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { id: true, nome: true, status: true } },
    },
  });

  if (historicalPO && historicalPO.supplier.status === 'ativo') {
    return {
      supplierId: historicalPO.supplier.id,
      supplierName: historicalPO.supplier.nome,
      reason: 'HISTORICAL_PO',
    };
  }

  // Rule 4: No supplier found
  return {
    supplierId: null,
    supplierName: null,
    reason: 'NO_SUPPLIER',
  };
}

/**
 * Calculate quantity to purchase (deterministic)
 */
function calculatePurchaseQty(item: CriticalItem): number {
  // Target: bring stock to maximum
  const qtyRepor = item.maximo - item.saldo;
  // Never less than 1
  return Math.max(1, qtyRepor);
}

/**
 * Generate next PO code for organization
 */
async function generatePOCode(orgId: string, tx: any): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `PO-${year}-`;

  // Busca o último PO DO ANO ATUAL para reiniciar a sequência a cada ano
  const lastPO = await tx.purchaseOrder.findFirst({
    where: {
      organizationId: orgId,
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

/**
 * Check if there's a manual DRAFT PO for this supplier created recently
 */
async function hasRecentManualDraft(
  orgId: string,
  supplierId: string,
  minutesAgo: number,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);
  
  const manualDraft = await prisma.purchaseOrder.findFirst({
    where: {
      organizationId: orgId,
      supplierId,
      source: 'MANUAL',
      status: 'DRAFT',
      createdAt: { gt: cutoff },
    },
  });

  return !!manualDraft;
}

/**
 * Create audit log for auto PO actions
 */
async function createAuditLog(
  tx: any,
  orgId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorUserId: null, // SYSTEM actor
      action,
      entity: 'PurchaseOrder',
      entityId,
      after: JSON.stringify({
        ...details,
        actor: 'SYSTEM',
        timestamp: new Date().toISOString(),
      }),
      organizationId: orgId,
    },
  });
}

/**
 * Create or update Kanban card for auto PO
 */
async function upsertKanbanCard(
  tx: any,
  orgId: string,
  po: { id: string; codigo: string },
  supplierName: string,
  itemCount: number,
  systemUserId: string,
): Promise<void> {
  // Find or create board for org
  let board = await tx.kanbanBoard.findFirst({
    where: { organizationId: orgId },
  });

  if (!board) {
    board = await tx.kanbanBoard.create({
      data: {
        nome: 'Compras e Reposição',
        descricao: 'Kanban para gestão de pedidos de compra',
        organizationId: orgId,
      },
    });
  }

  const externalRef = `AUTO_PO:${po.id}`;
  const titulo = `AUTO PO DRAFT — ${supplierName} — ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`;
  const descricao = `Pedido automático ${po.codigo} gerado pelo sistema de reposição.`;

  // Check if card exists
  const existingCard = await tx.kanbanCard.findFirst({
    where: {
      organizationId: orgId,
      externalRef,
    },
  });

  if (existingCard) {
    // Update existing card
    await tx.kanbanCard.update({
      where: { id: existingCard.id },
      data: {
        titulo,
        descricao,
        // Keep status as is, but move to IN_PROGRESS if many items
        status: itemCount >= 5 ? 'IN_PROGRESS' : existingCard.status,
      },
    });
  } else {
    // Get max position
    const maxPosCard = await tx.kanbanCard.findFirst({
      where: { boardId: board.id, status: 'TODO' },
      orderBy: { posicao: 'desc' },
    });

    await tx.kanbanCard.create({
      data: {
        titulo,
        descricao,
        status: itemCount >= 5 ? 'IN_PROGRESS' : 'TODO',
        posicao: maxPosCard ? maxPosCard.posicao + 1 : 0,
        purchaseOrderId: po.id,
        externalRef,
        boardId: board.id,
        createdById: systemUserId,
        organizationId: orgId,
      },
    });
  }
}

/**
 * Process auto PO for a single organization
 */
export async function processAutoPoForOrg(orgId: string, jobId?: string): Promise<AutoPOResult> {
  const result: AutoPOResult = {
    orgId,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    details: [],
  };

  try {
    // Get system user (first OWNER or MANAGER in org)
    const systemUser = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        role: { in: ['OWNER', 'MANAGER'] },
        isActive: true,
      },
      select: { id: true },
    });

    if (!systemUser) {
      console.warn(`[AUTO_PO] org=${orgId}: No active OWNER/MANAGER found, skipping`);
      return result;
    }

    // Get critical items (saldo <= minimo), ordered by SKU for determinism
    const criticalItems = await prisma.item.findMany({
      where: {
        organizationId: orgId,
        saldo: { lte: prisma.item.fields.minimo },
      },
      orderBy: { sku: 'asc' },
    });

    if (criticalItems.length === 0) {
      console.log(`[AUTO_PO] org=${orgId}: No critical items found`);
      return result;
    }

    result.processed = criticalItems.length;

    // Get default supplier for org
    const defaultSupplier = await prisma.supplier.findFirst({
      where: {
        organizationId: orgId,
        isDefault: true,
        status: 'ativo',
      },
      select: { id: true, nome: true },
    });

    // Resolve suppliers and group items
    const supplierGroups = new Map<string, {
      supplierId: string;
      supplierName: string;
      items: Array<CriticalItem & { qty: number; preco: number; needsQuote: boolean }>;
    }>();

    const skippedItems: Array<{ itemId: string; sku: string; reason: string }> = [];

    for (const item of criticalItems) {
      const resolution = await resolveSupplier(item as CriticalItem, defaultSupplier);

      if (resolution.reason === 'NO_SUPPLIER' || !resolution.supplierId) {
        skippedItems.push({
          itemId: item.id,
          sku: item.sku,
          reason: 'NO_SUPPLIER',
        });
        result.skipped++;
        continue;
      }

      const qty = calculatePurchaseQty(item as CriticalItem);
      const preco = item.custoUnitario || 0;
      const needsQuote = preco === 0;

      const group = supplierGroups.get(resolution.supplierId) || {
        supplierId: resolution.supplierId,
        supplierName: resolution.supplierName!,
        items: [],
      };

      group.items.push({
        ...(item as CriticalItem),
        qty,
        preco,
        needsQuote,
      });

      supplierGroups.set(resolution.supplierId, group);
    }

    // Log skipped items
    if (skippedItems.length > 0) {
      await prisma.auditLog.create({
        data: {
          actorUserId: null,
          action: 'AUTO_ITEM_SKIPPED_NO_SUPPLIER',
          entity: 'Item',
          entityId: `batch:${orgId}`,
          after: JSON.stringify({
            items: skippedItems,
            count: skippedItems.length,
            jobId,
          }),
          organizationId: orgId,
        },
      });
    }

    // Calculate window start
    const windowStart = calculateWindowStart(AUTO_PO_WINDOW_HOURS);

    // Process each supplier group
    for (const [supplierId, group] of supplierGroups) {
      // Check for recent manual DRAFT
      const hasManualDraft = await hasRecentManualDraft(
        orgId,
        supplierId,
        AUTO_PO_SKIP_IF_MANUAL_DRAFT_MIN,
      );

      if (hasManualDraft) {
        result.skipped += group.items.length;
        result.details.push({
          supplierId,
          supplierName: group.supplierName,
          action: 'SKIPPED',
          reason: 'MANUAL_DRAFT_EXISTS',
          itemCount: group.items.length,
        });

        await prisma.auditLog.create({
          data: {
            actorUserId: null,
            action: 'AUTO_PO_SKIPPED',
            entity: 'PurchaseOrder',
            entityId: `skip:${orgId}:${supplierId}`,
            after: JSON.stringify({
              reason: 'MANUAL_DRAFT_EXISTS',
              supplierId,
              supplierName: group.supplierName,
              itemCount: group.items.length,
              jobId,
            }),
            organizationId: orgId,
          },
        });

        continue;
      }

      const dedupeKey = generateDedupeKey(orgId, supplierId, windowStart);

      // Process in transaction
      await prisma.$transaction(async (tx) => {
        // Find existing AUTO PO by dedupeKey
        let po = await tx.purchaseOrder.findFirst({
          where: {
            organizationId: orgId,
            dedupeKey,
          },
          include: {
            items: true,
          },
        });

        const addedItems: string[] = [];
        const updatedQtyItems: Array<{ itemId: string; sku: string; oldQty: number; newQty: number }> = [];

        if (po) {
          // UPDATE existing PO
          const existingItemMap = new Map(po.items.map(i => [i.itemId, i]));
          let totalUpdated = false;
          let anyNeedsQuote = po.needsQuote;

          for (const item of group.items) {
            const existing = existingItemMap.get(item.id);
            const lineTotal = item.qty * item.preco;

            if (existing) {
              // Update qty to MAX(current, new) - never reduce
              if (item.qty > existing.quantidade) {
                await tx.purchaseOrderItem.update({
                  where: { id: existing.id },
                  data: {
                    quantidade: item.qty,
                    precoUnitario: item.preco,
                    valorTotal: lineTotal,
                    needsQuote: item.needsQuote,
                  },
                });
                updatedQtyItems.push({
                  itemId: item.id,
                  sku: item.sku,
                  oldQty: existing.quantidade,
                  newQty: item.qty,
                });
                totalUpdated = true;
              }
            } else {
              // Add new item to PO
              await tx.purchaseOrderItem.create({
                data: {
                  purchaseOrderId: po!.id,
                  itemId: item.id,
                  quantidade: item.qty,
                  precoUnitario: item.preco,
                  valorTotal: lineTotal,
                  needsQuote: item.needsQuote,
                },
              });
              addedItems.push(item.sku);
              totalUpdated = true;
            }

            if (item.needsQuote) anyNeedsQuote = true;
          }

          if (totalUpdated) {
            // Recalculate total
            const allItems = await tx.purchaseOrderItem.findMany({
              where: { purchaseOrderId: po!.id },
            });
            const newTotal = allItems.reduce((sum, i) => sum + i.valorTotal, 0);

            await tx.purchaseOrder.update({
              where: { id: po!.id },
              data: {
                valorTotal: newTotal,
                needsQuote: anyNeedsQuote,
                lastAutoUpdateAt: new Date(),
              },
            });

            // Update Kanban card
            await upsertKanbanCard(
              tx,
              orgId,
              po!,
              group.supplierName,
              allItems.length,
              systemUser.id,
            );

            // Audit log
            await createAuditLog(tx, orgId, 'AUTO_PO_UPDATED', po!.id, {
              dedupeKey,
              addedItems,
              updatedQtyItems,
              totalItems: allItems.length,
              valorTotal: newTotal,
              jobId,
            });

            result.updated++;
            result.details.push({
              poId: po!.id,
              supplierId,
              supplierName: group.supplierName,
              action: 'UPDATED',
              itemCount: allItems.length,
              dedupeKey,
            });
          }
        } else {
          // CREATE new PO
          const codigo = await generatePOCode(orgId, tx);
          const anyNeedsQuote = group.items.some(i => i.needsQuote);

          const newPO = await tx.purchaseOrder.create({
            data: {
              codigo,
              status: 'DRAFT',
              source: 'AUTO_REPLENISH',
              supplierId,
              valorTotal: 0,
              observacoes: `Pedido automático gerado pelo sistema de reposição. ${anyNeedsQuote ? '⚠️ NECESSITA COTAÇÃO' : ''}`,
              createdById: systemUser.id,
              organizationId: orgId,
              dataAbertura: new Date(),
              dedupeKey,
              windowStart,
              needsQuote: anyNeedsQuote,
              lastAutoUpdateAt: new Date(),
            },
          });

          let valorTotal = 0;

          for (const item of group.items) {
            const lineTotal = item.qty * item.preco;
            valorTotal += lineTotal;

            await tx.purchaseOrderItem.create({
              data: {
                purchaseOrderId: newPO.id,
                itemId: item.id,
                quantidade: item.qty,
                precoUnitario: item.preco,
                valorTotal: lineTotal,
                needsQuote: item.needsQuote,
              },
            });
            addedItems.push(item.sku);
          }

          await tx.purchaseOrder.update({
            where: { id: newPO.id },
            data: { valorTotal },
          });

          // Create Kanban card
          await upsertKanbanCard(
            tx,
            orgId,
            newPO,
            group.supplierName,
            group.items.length,
            systemUser.id,
          );

          // Audit log
          await createAuditLog(tx, orgId, 'AUTO_PO_CREATED', newPO.id, {
            codigo,
            dedupeKey,
            supplierId,
            supplierName: group.supplierName,
            items: addedItems,
            itemCount: group.items.length,
            valorTotal,
            needsQuote: anyNeedsQuote,
            jobId,
          });

          result.created++;
          result.details.push({
            poId: newPO.id,
            supplierId,
            supplierName: group.supplierName,
            action: 'CREATED',
            itemCount: group.items.length,
            dedupeKey,
          });
        }
      });
    }

    console.log(
      `[AUTO_PO] org=${orgId}: processed=${result.processed}, created=${result.created}, updated=${result.updated}, skipped=${result.skipped}`,
    );

    return result;
  } catch (error) {
    console.error(`[AUTO_PO] org=${orgId}: Error processing auto PO:`, error);
    
    // Log error
    await prisma.auditLog.create({
      data: {
        actorUserId: null,
        action: 'AUTO_PO_ERROR',
        entity: 'PurchaseOrder',
        entityId: `error:${orgId}`,
        after: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          jobId,
        }),
        organizationId: orgId,
      },
    });

    throw error;
  }
}

/**
 * Process auto PO for all active organizations
 */
export async function processAutoPoForAllOrgs(jobId?: string): Promise<AutoPOResult[]> {
  const orgs = await prisma.organization.findMany({
    where: { status: 'active' },
    select: { id: true, name: true },
  });

  const results: AutoPOResult[] = [];

  for (const org of orgs) {
    try {
      const result = await processAutoPoForOrg(org.id, jobId);
      results.push(result);
    } catch (error) {
      console.error(`[AUTO_PO] Failed for org ${org.name} (${org.id}):`, error);
      results.push({
        orgId: org.id,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        details: [{
          action: 'SKIPPED',
          reason: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
      });
    }
  }

  return results;
}
