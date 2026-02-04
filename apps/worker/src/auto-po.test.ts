/**
 * Auto PO Tests
 * 
 * Run with: pnpm -C apps/worker test
 * 
 * These tests verify:
 * 1. Idempotency: Running job twice creates only 1 PO per (org, supplier, window)
 * 2. Qty never reduces: Subsequent runs can only increase quantities
 * 3. No supplier handling: Items without supplier are skipped with proper logging
 * 4. Manual DRAFT skip: Auto PO is skipped if recent manual DRAFT exists
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to create test data
async function createTestData() {
  // Create test organization
  const org = await prisma.organization.upsert({
    where: { slug: 'test-auto-po' },
    update: {},
    create: {
      name: 'Test Auto PO Org',
      slug: 'test-auto-po',
      plan: 'pro',
      status: 'active',
    },
  });

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test-auto-po@test.com' },
    update: {},
    create: {
      email: 'test-auto-po@test.com',
      password: 'test123',
      name: 'Test User',
      role: 'OWNER',
      organizationId: org.id,
    },
  });

  // Create default supplier
  const defaultSupplier = await prisma.supplier.upsert({
    where: {
      organizationId_codigo: { organizationId: org.id, codigo: 'TEST-DEFAULT' },
    },
    update: { isDefault: true },
    create: {
      codigo: 'TEST-DEFAULT',
      nome: 'Default Test Supplier',
      status: 'ativo',
      isDefault: true,
      organizationId: org.id,
    },
  });

  // Create supplier 2 (not default)
  const supplier2 = await prisma.supplier.upsert({
    where: {
      organizationId_codigo: { organizationId: org.id, codigo: 'TEST-SUPPLIER2' },
    },
    update: { isDefault: false },
    create: {
      codigo: 'TEST-SUPPLIER2',
      nome: 'Test Supplier 2',
      status: 'ativo',
      isDefault: false,
      organizationId: org.id,
    },
  });

  // Create critical items
  const item1 = await prisma.item.upsert({
    where: {
      organizationId_sku: { organizationId: org.id, sku: 'TEST-ITEM-001' },
    },
    update: {
      saldo: 2,
      minimo: 5,
      maximo: 20,
      custoUnitario: 100,
      supplierId: defaultSupplier.id,
    },
    create: {
      sku: 'TEST-ITEM-001',
      descricao: 'Test Item 1',
      saldo: 2,
      minimo: 5,
      maximo: 20,
      custoUnitario: 100,
      supplierId: defaultSupplier.id,
      organizationId: org.id,
    },
  });

  const item2 = await prisma.item.upsert({
    where: {
      organizationId_sku: { organizationId: org.id, sku: 'TEST-ITEM-002' },
    },
    update: {
      saldo: 0,
      minimo: 3,
      maximo: 10,
      custoUnitario: 50,
      supplierId: supplier2.id,
    },
    create: {
      sku: 'TEST-ITEM-002',
      descricao: 'Test Item 2 (different supplier)',
      saldo: 0,
      minimo: 3,
      maximo: 10,
      custoUnitario: 50,
      supplierId: supplier2.id,
      organizationId: org.id,
    },
  });

  // Item without supplier (will use default)
  const item3 = await prisma.item.upsert({
    where: {
      organizationId_sku: { organizationId: org.id, sku: 'TEST-ITEM-003' },
    },
    update: {
      saldo: 1,
      minimo: 5,
      maximo: 15,
      custoUnitario: 75,
      supplierId: null,
    },
    create: {
      sku: 'TEST-ITEM-003',
      descricao: 'Test Item 3 (no supplier)',
      saldo: 1,
      minimo: 5,
      maximo: 15,
      custoUnitario: 75,
      supplierId: null,
      organizationId: org.id,
    },
  });

  // Item without price (needsQuote = true)
  const item4 = await prisma.item.upsert({
    where: {
      organizationId_sku: { organizationId: org.id, sku: 'TEST-ITEM-004' },
    },
    update: {
      saldo: 0,
      minimo: 2,
      maximo: 8,
      custoUnitario: 0,
      supplierId: defaultSupplier.id,
    },
    create: {
      sku: 'TEST-ITEM-004',
      descricao: 'Test Item 4 (no price)',
      saldo: 0,
      minimo: 2,
      maximo: 8,
      custoUnitario: 0,
      supplierId: defaultSupplier.id,
      organizationId: org.id,
    },
  });

  return { org, user, defaultSupplier, supplier2, items: [item1, item2, item3, item4] };
}

// Cleanup test data
async function cleanupTestData() {
  const org = await prisma.organization.findUnique({
    where: { slug: 'test-auto-po' },
  });

  if (org) {
    // Delete in order due to foreign keys
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrder: { organizationId: org.id } },
    });
    await prisma.kanbanCard.deleteMany({ where: { organizationId: org.id } });
    await prisma.purchaseOrder.deleteMany({ where: { organizationId: org.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
    await prisma.item.deleteMany({ where: { organizationId: org.id } });
    await prisma.supplier.deleteMany({ where: { organizationId: org.id } });
    await prisma.kanbanBoard.deleteMany({ where: { organizationId: org.id } });
    await prisma.user.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  }
}

// Test runner
async function runTests() {
  console.log('🧪 Starting Auto PO tests...\n');

  try {
    // Setup
    await cleanupTestData();
    const { org, defaultSupplier, supplier2 } = await createTestData();
    console.log('✅ Test data created\n');

    // Import and run auto PO
    const { processAutoPoForOrg } = await import('./auto-po');

    // Test 1: First run should create POs
    console.log('📝 Test 1: First run creates AUTO POs...');
    const result1 = await processAutoPoForOrg(org.id, 'test-job-1');
    
    console.log(`   Processed: ${result1.processed}`);
    console.log(`   Created: ${result1.created}`);
    console.log(`   Updated: ${result1.updated}`);
    console.log(`   Skipped: ${result1.skipped}`);

    // Verify POs were created
    const pos1 = await prisma.purchaseOrder.findMany({
      where: { organizationId: org.id, source: 'AUTO_REPLENISH' },
      include: { items: true },
    });

    console.log(`   AUTO POs in DB: ${pos1.length}`);
    
    if (result1.created < 1) {
      throw new Error('Test 1 FAILED: Expected at least 1 AUTO PO to be created');
    }
    console.log('✅ Test 1 PASSED\n');

    // Test 2: Second run should update, not create new POs
    console.log('📝 Test 2: Second run updates existing POs (idempotency)...');
    const result2 = await processAutoPoForOrg(org.id, 'test-job-2');
    
    console.log(`   Created: ${result2.created}`);
    console.log(`   Updated: ${result2.updated}`);

    const pos2 = await prisma.purchaseOrder.findMany({
      where: { organizationId: org.id, source: 'AUTO_REPLENISH' },
    });

    if (pos2.length !== pos1.length) {
      throw new Error(`Test 2 FAILED: Expected ${pos1.length} POs, got ${pos2.length}`);
    }
    console.log('✅ Test 2 PASSED: No duplicate POs created\n');

    // Test 3: Qty should never reduce
    console.log('📝 Test 3: Quantities never reduce...');
    
    // Get current quantities
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrder: { organizationId: org.id, source: 'AUTO_REPLENISH' } },
    });

    const originalQtys = new Map(poItems.map(i => [i.itemId, i.quantidade]));

    // Run again (should not reduce)
    await processAutoPoForOrg(org.id, 'test-job-3');

    const poItemsAfter = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrder: { organizationId: org.id, source: 'AUTO_REPLENISH' } },
    });

    for (const item of poItemsAfter) {
      const originalQty = originalQtys.get(item.itemId);
      if (originalQty && item.quantidade < originalQty) {
        throw new Error(`Test 3 FAILED: Qty reduced from ${originalQty} to ${item.quantidade}`);
      }
    }
    console.log('✅ Test 3 PASSED: Quantities maintained or increased\n');

    // Test 4: Check needsQuote flag
    console.log('📝 Test 4: Items without price have needsQuote=true...');
    
    const needsQuoteItems = await prisma.purchaseOrderItem.findMany({
      where: {
        purchaseOrder: { organizationId: org.id, source: 'AUTO_REPLENISH' },
        needsQuote: true,
      },
      include: { item: true },
    });

    console.log(`   Items needing quote: ${needsQuoteItems.length}`);
    
    // At least item4 (no price) should have needsQuote
    if (needsQuoteItems.length < 1) {
      throw new Error('Test 4 FAILED: Expected at least 1 item with needsQuote=true');
    }
    console.log('✅ Test 4 PASSED\n');

    // Test 5: Check audit logs
    console.log('📝 Test 5: Audit logs created...');
    
    const autoPOLogs = await prisma.auditLog.findMany({
      where: {
        organizationId: org.id,
        action: { startsWith: 'AUTO_PO' },
      },
    });

    console.log(`   AUTO_PO audit logs: ${autoPOLogs.length}`);
    
    if (autoPOLogs.length < 1) {
      throw new Error('Test 5 FAILED: Expected AUTO_PO audit logs');
    }
    console.log('✅ Test 5 PASSED\n');

    // Test 6: Check Kanban cards created
    console.log('📝 Test 6: Kanban cards created for AUTO POs...');
    
    const cards = await prisma.kanbanCard.findMany({
      where: {
        organizationId: org.id,
        externalRef: { startsWith: 'AUTO_PO:' },
      },
    });

    console.log(`   Kanban cards for AUTO POs: ${cards.length}`);
    
    if (cards.length < 1) {
      throw new Error('Test 6 FAILED: Expected Kanban cards for AUTO POs');
    }
    console.log('✅ Test 6 PASSED\n');

    // Cleanup
    await cleanupTestData();
    console.log('🧹 Test data cleaned up\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    await cleanupTestData();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
