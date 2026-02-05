import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SuppliersController (e2e)', () => {
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
        name: 'Test Org Suppliers',
        slug: `test-org-sup-${Date.now()}`,
        plan: 'pro',
        status: 'active',
      },
    });
    testOrgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `test-sup-${Date.now()}@test.com`,
        password: '$2b$10$abcdefghijklmnopqrstuv', // hashed "test123"
        name: 'Test User Suppliers',
        role: 'MANAGER',
        organizationId: org.id,
      },
    });

    // Get token (assuming /auth/login exists)
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'test123' });
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.supplier.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await app.close();
  });

  describe('POST /suppliers', () => {
    it('should create supplier with valid data', () => {
      return request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codigo: `SUP-${Date.now()}`,
          nome: 'Test Supplier',
          cnpj: '12345678000190',
          email: 'test@supplier.com',
          telefone: '(11) 99999-9999',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.nome).toBe('Test Supplier');
        });
    });

    it('should reject invalid CNPJ format', () => {
      return request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codigo: `SUP-${Date.now()}`,
          nome: 'Test Supplier',
          cnpj: '123', // INVALID
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should reject duplicate codigo', async () => {
      const codigo = `SUP-${Date.now()}`;
      
      // Create first
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codigo,
          nome: 'First Supplier',
        })
        .expect(201);

      // Try duplicate
      return request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codigo, // DUPLICATE
          nome: 'Second Supplier',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });
  });

  describe('GET /suppliers', () => {
    it('should return paginated suppliers', async () => {
      // Create a test supplier
      await prisma.supplier.create({
        data: {
          codigo: `SUP-GET-${Date.now()}`,
          nome: 'Get Test Supplier',
          organizationId: testOrgId,
        },
      });

      return request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body).toHaveProperty('pagination');
        });
    });

    it('should enforce multi-tenant isolation', async () => {
      // Create another org
      const org2 = await prisma.organization.create({
        data: {
          name: 'Other Org Suppliers',
          slug: `other-org-sup-${Date.now()}`,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: `other-sup-${Date.now()}@test.com`,
          password: '$2b$10$abcdefghijklmnopqrstuv',
          name: 'Other User Suppliers',
          role: 'MANAGER',
          organizationId: org2.id,
        },
      });

      // Login as org2 user
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user2.email, password: 'test123' });
      
      const token2 = loginRes.body.accessToken;

      // Get suppliers from org2 (should not see testOrg suppliers)
      const suppliersRes = await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      // Should not see suppliers from testOrg
      const org1Suppliers = suppliersRes.body.data.filter(
        (supplier: any) => supplier.organizationId === testOrgId
      );
      expect(org1Suppliers.length).toBe(0);

      // Cleanup
      await prisma.user.delete({ where: { id: user2.id } });
      await prisma.organization.delete({ where: { id: org2.id } });
    });
  });
});
