import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request, { type SuperTest, type Test as SuperTestTest } from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

async function login(baseUrl: SuperTest<SuperTestTest>, email: string, password: string) {
  const res = await baseUrl.post('/auth/login').send({ email, password });
  expect(res.status).toBe(201);
  expect(res.body?.accessToken).toBeTruthy();
  return res.body.accessToken as string;
}

describe('Multi-tenant isolation (E2E)', () => {
  let app: INestApplication;
  let http: any;

  const unique = Date.now();
  const orgA = { id: '', slug: `test-org-a-${unique}` };
  const orgB = { id: '', slug: `test-org-b-${unique}` };

  const userA = { email: `owner-a-${unique}@test.local`, password: 'Passw0rd!' };
  const userB = { email: `owner-b-${unique}@test.local`, password: 'Passw0rd!' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication(new FastifyAdapter());
    await app.init();

    // Fastify needs ready()
    await app.getHttpAdapter().getInstance().ready();

    http = request(app.getHttpServer());

    const passwordHash = await bcrypt.hash('Passw0rd!', 10);

    const createdA = await prisma.organization.create({
      data: { name: 'Test Org A', slug: orgA.slug, plan: 'pro', status: 'active' },
    });
    orgA.id = createdA.id;

    const createdB = await prisma.organization.create({
      data: { name: 'Test Org B', slug: orgB.slug, plan: 'pro', status: 'active' },
    });
    orgB.id = createdB.id;

    await prisma.user.create({
      data: {
        email: userA.email,
        password: passwordHash,
        name: 'Owner A',
        role: 'OWNER',
        organizationId: orgA.id,
      },
    });

    await prisma.user.create({
      data: {
        email: userB.email,
        password: passwordHash,
        name: 'Owner B',
        role: 'OWNER',
        organizationId: orgB.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('não permite ler Item de outra organização por ID', async () => {
    const tokenA = await login(http, userA.email, userA.password);
    const tokenB = await login(http, userB.email, userB.password);

    const itemA = await prisma.item.create({
      data: {
        sku: `SKU-A-${unique}`,
        descricao: 'Item A',
        saldo: 1,
        minimo: 1,
        maximo: 10,
        leadTimeDays: 7,
        custoUnitario: 10,
        organizationId: orgA.id,
      },
    });

    const resOk = await http
      .get(`/items/${itemA.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect(resOk.status).toBe(200);
    expect(resOk.body?.id).toBe(itemA.id);

    const resLeak = await http
      .get(`/items/${itemA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send();
    expect([404, 400]).toContain(resLeak.status);
  });

  it('bloqueia criação de PO com supplierId de outra org', async () => {
    const tokenB = await login(http, userB.email, userB.password);

    const supplierA = await prisma.supplier.create({
      data: {
        codigo: `FORN-A-${unique}`,
        nome: 'Fornecedor A',
        organizationId: orgA.id,
      },
    });

    const itemB = await prisma.item.create({
      data: {
        sku: `SKU-B-${unique}`,
        descricao: 'Item B',
        saldo: 1,
        minimo: 1,
        maximo: 10,
        leadTimeDays: 7,
        custoUnitario: 10,
        organizationId: orgB.id,
      },
    });

    const res = await http
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        supplierId: supplierA.id, // cross-tenant
        items: [{ itemId: itemB.id, quantidade: 1, precoUnitario: 10 }],
      });

    expect(res.status).toBe(400);
  });

  it('bloqueia criação de PO com itemId de outra org', async () => {
    const tokenB = await login(http, userB.email, userB.password);

    const supplierB = await prisma.supplier.create({
      data: {
        codigo: `FORN-B-${unique}`,
        nome: 'Fornecedor B',
        organizationId: orgB.id,
      },
    });

    const itemA2 = await prisma.item.create({
      data: {
        sku: `SKU-A2-${unique}`,
        descricao: 'Item A2',
        saldo: 1,
        minimo: 1,
        maximo: 10,
        leadTimeDays: 7,
        custoUnitario: 10,
        organizationId: orgA.id,
      },
    });

    const res = await http
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        supplierId: supplierB.id,
        items: [{ itemId: itemA2.id, quantidade: 1, precoUnitario: 10 }], // cross-tenant
      });

    expect(res.status).toBe(400);
  });

  it('bloqueia update de Supplier de outra org', async () => {
    const tokenB = await login(http, userB.email, userB.password);

    const supplierA = await prisma.supplier.create({
      data: {
        codigo: `FORN-UPDATE-A-${unique}`,
        nome: 'Fornecedor Update A',
        organizationId: orgA.id,
      },
    });

    const res = await http
      .put(`/suppliers/${supplierA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ nome: 'Hacked Name' });

    expect([404, 400]).toContain(res.status);

    // Confirma que o supplier NÃO foi modificado
    const unchanged = await prisma.supplier.findUnique({ where: { id: supplierA.id } });
    expect(unchanged?.nome).toBe('Fornecedor Update A');
  });

  it('bloqueia delete de Item de outra org', async () => {
    const tokenB = await login(http, userB.email, userB.password);

    const itemDelete = await prisma.item.create({
      data: {
        sku: `SKU-DELETE-A-${unique}`,
        descricao: 'Item Delete A',
        saldo: 5,
        minimo: 1,
        maximo: 10,
        leadTimeDays: 7,
        custoUnitario: 20,
        organizationId: orgA.id,
      },
    });

    const res = await http
      .delete(`/items/${itemDelete.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send();

    expect([404, 400]).toContain(res.status);

    // Confirma que o item NÃO foi deletado
    const stillExists = await prisma.item.findUnique({ where: { id: itemDelete.id } });
    expect(stillExists).toBeTruthy();
  });

  it('bloqueia leitura de PO de outra org por ID', async () => {
    const tokenA = await login(http, userA.email, userA.password);
    const tokenB = await login(http, userB.email, userB.password);

    const supplierTest = await prisma.supplier.create({
      data: {
        codigo: `FORN-PO-A-${unique}`,
        nome: 'Fornecedor PO A',
        organizationId: orgA.id,
      },
    });

    const poA = await prisma.purchaseOrder.create({
      data: {
        codigo: `PO-TEST-${unique}`,
        status: 'DRAFT',
        supplierId: supplierTest.id,
        valorTotal: 100,
        createdById: (await prisma.user.findFirst({ where: { organizationId: orgA.id } }))!.id,
        organizationId: orgA.id,
      },
    });

    const resOk = await http
      .get(`/purchase-orders/${poA.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect(resOk.status).toBe(200);

    const resLeak = await http
      .get(`/purchase-orders/${poA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send();
    expect([404, 400]).toContain(resLeak.status);
  });

  it('bloqueia mover KanbanCard de outra org', async () => {
    const tokenB = await login(http, userB.email, userB.password);

    let boardA = await prisma.kanbanBoard.findFirst({
      where: { organizationId: orgA.id },
    });

    if (!boardA) {
      boardA = await prisma.kanbanBoard.create({
        data: {
          nome: 'Board A',
          descricao: 'Board A',
          organizationId: orgA.id,
        },
      });
    }

    const cardA = await prisma.kanbanCard.create({
      data: {
        titulo: 'Card A',
        descricao: 'Card A desc',
        status: 'TODO',
        posicao: 0,
        boardId: boardA.id,
        createdById: (await prisma.user.findFirst({ where: { organizationId: orgA.id } }))!.id,
        organizationId: orgA.id,
      },
    });

    const res = await http
      .patch(`/kanban/cards/${cardA.id}/move`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'IN_PROGRESS' });

    expect([404, 400]).toContain(res.status);

    // Confirma que o card NÃO foi movido
    const unchanged = await prisma.kanbanCard.findUnique({ where: { id: cardA.id } });
    expect(unchanged?.status).toBe('TODO');
  });

  it('listagem de Items não retorna itens de outra org', async () => {
    const tokenB = await login(http, userB.email, userB.password);

    await prisma.item.create({
      data: {
        sku: `SKU-LIST-A-${unique}`,
        descricao: 'Item List A',
        saldo: 1,
        minimo: 1,
        maximo: 10,
        leadTimeDays: 7,
        custoUnitario: 10,
        organizationId: orgA.id,
      },
    });

    const res = await http
      .get('/items')
      .set('Authorization', `Bearer ${tokenB}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);

    // Nenhum item de orgA deve aparecer
    const leakedItems = res.body.data.filter((item: any) => item.organizationId === orgA.id);
    expect(leakedItems).toHaveLength(0);
  });
});

