import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      plan: 'pro',
      status: 'active',
    },
  });

  console.log('✅ Organization created:', org.name);

  // Create users with different roles
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      email: 'owner@demo.com',
      password: hashedPassword,
      name: 'João Silva (Owner)',
      role: 'OWNER',
      organizationId: org.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      password: hashedPassword,
      name: 'Maria Santos (Manager)',
      role: 'MANAGER',
      organizationId: org.id,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@demo.com' },
    update: {},
    create: {
      email: 'operator@demo.com',
      password: hashedPassword,
      name: 'Carlos Oliveira (Operator)',
      role: 'OPERATOR',
      organizationId: org.id,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@demo.com' },
    update: {},
    create: {
      email: 'viewer@demo.com',
      password: hashedPassword,
      name: 'Ana Costa (Viewer)',
      role: 'VIEWER',
      organizationId: org.id,
    },
  });

  console.log('✅ Users created: Owner, Manager, Operator, Viewer');

  // Create suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: {
      organizationId_codigo: {
        organizationId: org.id,
        codigo: 'FORN-001',
      },
    },
    update: {
      nome: 'Rolamentos Brasil Ltda',
      cnpj: '12.345.678/0001-90',
      email: 'contato@rolamentosbrasil.com.br',
      telefone: '(11) 3456-7890',
      whatsapp: '5511987654321',
      prazoMedioDias: 5,
      qualidade: 'excelente',
      status: 'ativo',
      isDefault: true, // Default supplier for org
    },
    create: {
      codigo: 'FORN-001',
      nome: 'Rolamentos Brasil Ltda',
      cnpj: '12.345.678/0001-90',
      email: 'contato@rolamentosbrasil.com.br',
      telefone: '(11) 3456-7890',
      whatsapp: '5511987654321',
      prazoMedioDias: 5,
      qualidade: 'excelente',
      status: 'ativo',
      isDefault: true, // Default supplier for org
      organizationId: org.id,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: {
      organizationId_codigo: {
        organizationId: org.id,
        codigo: 'FORN-002',
      },
    },
    update: {
      nome: 'Peças Industriais SP',
      cnpj: '98.765.432/0001-10',
      email: 'vendas@pecasindustriais.com.br',
      telefone: '(11) 2345-6789',
      whatsapp: '5511976543210',
      prazoMedioDias: 7,
      qualidade: 'bom',
      status: 'ativo',
      isDefault: false,
    },
    create: {
      codigo: 'FORN-002',
      nome: 'Peças Industriais SP',
      cnpj: '98.765.432/0001-10',
      email: 'vendas@pecasindustriais.com.br',
      telefone: '(11) 2345-6789',
      whatsapp: '5511976543210',
      prazoMedioDias: 7,
      qualidade: 'bom',
      status: 'ativo',
      isDefault: false,
      organizationId: org.id,
    },
  });

  console.log('✅ Suppliers created:', supplier1.nome, '(default)', supplier2.nome);

  // Create items
  const items = [
    {
      sku: 'ROL-6205',
      descricao: 'Rolamento 6205 ZZ',
      categoria: 'Rolamentos',
      unidade: 'UN',
      saldo: 3,
      minimo: 5,
      maximo: 20,
      leadTimeDays: 5,
      custoUnitario: 45.0,
      supplierId: supplier1.id,
      localizacao: 'Prateleira A1',
      organizationId: org.id,
    },
    {
      sku: 'ROL-6206',
      descricao: 'Rolamento 6206 ZZ',
      categoria: 'Rolamentos',
      unidade: 'UN',
      saldo: 2,
      minimo: 5,
      maximo: 15,
      leadTimeDays: 5,
      custoUnitario: 52.0,
      supplierId: supplier1.id,
      localizacao: 'Prateleira A1',
      organizationId: org.id,
    },
    {
      sku: 'VEDACAO-001',
      descricao: 'Anel de Vedação NBR 50x70x10',
      categoria: 'Vedações',
      unidade: 'UN',
      saldo: 8,
      minimo: 10,
      maximo: 30,
      leadTimeDays: 7,
      custoUnitario: 12.5,
      supplierId: supplier2.id,
      localizacao: 'Prateleira B3',
      organizationId: org.id,
    },
    {
      sku: 'PARAFUSO-M8',
      descricao: 'Parafuso Sextavado M8x30mm',
      categoria: 'Fixação',
      unidade: 'UN',
      saldo: 150,
      minimo: 100,
      maximo: 500,
      leadTimeDays: 3,
      custoUnitario: 0.8,
      supplierId: supplier2.id,
      localizacao: 'Gaveta C12',
      organizationId: org.id,
    },
    {
      sku: 'FILTRO-HYD-001',
      descricao: 'Filtro Hidráulico HF6177',
      categoria: 'Filtros',
      unidade: 'UN',
      saldo: 0,
      minimo: 2,
      maximo: 10,
      leadTimeDays: 10,
      custoUnitario: 180.0,
      supplierId: supplier1.id,
      localizacao: 'Prateleira D1',
      organizationId: org.id,
    },
    // Item sem fornecedor preferencial (usará o default da org)
    {
      sku: 'CORREIA-V001',
      descricao: 'Correia em V A68',
      categoria: 'Correias',
      unidade: 'UN',
      saldo: 1,
      minimo: 3,
      maximo: 15,
      leadTimeDays: 5,
      custoUnitario: 35.0,
      supplierId: null as any, // No preferred supplier - will use org default
      localizacao: 'Prateleira E2',
      organizationId: org.id,
    },
    // Item crítico sem preço (needsQuote = true)
    {
      sku: 'VALVULA-HIDRA-001',
      descricao: 'Válvula Hidráulica Solenoide 24V',
      categoria: 'Hidráulica',
      unidade: 'UN',
      saldo: 0,
      minimo: 1,
      maximo: 5,
      leadTimeDays: 14,
      custoUnitario: 0, // Sem preço cadastrado
      supplierId: supplier2.id,
      localizacao: 'Prateleira F1',
      organizationId: org.id,
    },
  ];

  for (const itemData of items) {
    await prisma.item.upsert({
      where: {
        organizationId_sku: {
          organizationId: org.id,
          sku: itemData.sku,
        },
      },
      update: {
        descricao: itemData.descricao,
        categoria: itemData.categoria,
        unidade: itemData.unidade,
        saldo: itemData.saldo,
        minimo: itemData.minimo,
        maximo: itemData.maximo,
        leadTimeDays: itemData.leadTimeDays,
        custoUnitario: itemData.custoUnitario,
        supplierId: itemData.supplierId,
        localizacao: itemData.localizacao,
        organizationId: org.id,
      },
      create: itemData,
    });
  }

  console.log(`✅ ${items.length} items created`);

  // Create kanban board
  const existingBoard = await prisma.kanbanBoard.findFirst({
    where: { organizationId: org.id, nome: 'Compras e Reposição' },
  });

  const board = existingBoard
    ? await prisma.kanbanBoard.update({
        where: { id: existingBoard.id },
        data: { descricao: 'Kanban para gestão de pedidos de compra' },
      })
    : await prisma.kanbanBoard.create({
        data: {
          nome: 'Compras e Reposição',
          descricao: 'Kanban para gestão de pedidos de compra',
          organizationId: org.id,
        },
      });

  console.log('✅ Kanban board created:', board.nome);

  // Create a sample purchase order
  const po = await prisma.purchaseOrder.upsert({
    where: {
      organizationId_codigo: {
        organizationId: org.id,
        codigo: 'PO-2026-001',
      },
    },
    update: {
      status: 'DRAFT',
      supplierId: supplier1.id,
      observacoes: 'Pedido de reposição de rolamentos críticos',
      createdById: manager.id,
      dataAbertura: new Date(),
    },
    create: {
      codigo: 'PO-2026-001',
      status: 'DRAFT',
      supplierId: supplier1.id,
      valorTotal: 0,
      observacoes: 'Pedido de reposição de rolamentos críticos',
      createdById: manager.id,
      organizationId: org.id,
      dataAbertura: new Date(),
    },
  });

  const item1 = items[0]; // ROL-6205
  const item2 = items[1]; // ROL-6206

  // Recreate PO items deterministically
  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: po.id } });

  const item1Db = (await prisma.item.findFirst({ where: { sku: item1.sku, organizationId: org.id } }))!;
  const item2Db = (await prisma.item.findFirst({ where: { sku: item2.sku, organizationId: org.id } }))!;

  await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: po.id,
      itemId: item1Db.id,
      quantidade: 15,
      precoUnitario: 45.0,
      valorTotal: 675.0,
    },
  });

  await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: po.id,
      itemId: item2Db.id,
      quantidade: 10,
      precoUnitario: 52.0,
      valorTotal: 520.0,
    },
  });

  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { valorTotal: 1195.0 },
  });

  console.log('✅ Sample purchase order created:', po.codigo);

  // Create kanban card for this PO
  const existingCard = await prisma.kanbanCard.findFirst({
    where: { organizationId: org.id, purchaseOrderId: po.id, boardId: board.id },
  });

  if (!existingCard) {
    await prisma.kanbanCard.create({
      data: {
        titulo: `Pedido ${po.codigo} - Rolamentos`,
        descricao: 'Reposição urgente de rolamentos 6205 e 6206',
        status: 'TODO',
        posicao: 0,
        purchaseOrderId: po.id,
        boardId: board.id,
        createdById: operator.id,
        organizationId: org.id,
      },
    });
  }

  console.log('✅ Kanban card created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📧 Login credentials:');
  console.log('  Owner:    owner@demo.com / demo123');
  console.log('  Manager:  manager@demo.com / demo123');
  console.log('  Operator: operator@demo.com / demo123');
  console.log('  Viewer:   viewer@demo.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
