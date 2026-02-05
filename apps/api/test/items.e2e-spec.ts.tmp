import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ItemsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testOrgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    
    await app.init();
    prisma = app.get(PrismaService);

    // Create test org and user
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: `test-org-${Date.now()}`,
        plan: 'pro',
        status: 'active',
      },
    });
    testOrgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `test${Date.now()}@test.com`,
        password: '$2b$10$abcdefghijklmnopqrstuv', // hashed "test123"
        name: 'Test User',
        role: 'MANAGER',
        organizationId: org.id,
      },
    });

    // Get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'test123' });
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.item.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await app.close();
  });

  describe('POST /items', () => {
    it('should create item with valid data', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: `TEST-SKU-${Date.now()}`,
          descricao: 'Test Item',
          categoria: 'Test',
          unidade: 'UN',
          saldo: 10,
          minimo: 5,
          maximo: 20,
          custoUnitario: 10.50,
          leadTimeDays: 7,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.descricao).toBe('Test Item');
        });
    });

    it('should reject negative stock', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: `TEST-SKU-${Date.now()}`,
          descricao: 'Test Item',
          saldo: -10, // INVALID
          minimo: 5,
          maximo: 20,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('saldo');
        });
    });

    it('should reject duplicate SKU', async () => {
      const sku = `TEST-SKU-${Date.now()}`;
      
      // Create first
      await request(app.getHttpServer())
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku,
          descricao: 'First Item',
          minimo: 5,
          maximo: 20,
        })
        .expect(201);

      // Try duplicate
      return request(app.getHttpServer())
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku, // DUPLICATE
          descricao: 'Second Item',
          minimo: 5,
          maximo: 20,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should enforce multi-tenant isolation', async () => {
      // Create another org
      const org2 = await prisma.organization.create({
        data: {
          name: 'Other Org',
          slug: `other-org-${Date.now()}`,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: `other${Date.now()}@test.com`,
          password: '$2b$10$abcdefghijklmnopqrstuv',
          name: 'Other User',
          role: 'MANAGER',
          organizationId: org2.id,
        },
      });

      // Login as org2 user
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user2.email, password: 'test123' });
      
      const token2 = loginRes.body.accessToken;

      // Get items from org2 (should be empty)
      const itemsRes = await request(app.getHttpServer())
        .get('/items')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      // Should not see items from testOrg
      const org1Items = itemsRes.body.data.filter((item: any) => item.organizationId === testOrgId);
      expect(org1Items.length).toBe(0);

      // Cleanup
      await prisma.user.delete({ where: { id: user2.id } });
      await prisma.organization.delete({ where: { id: org2.id } });
    });
  });
});
