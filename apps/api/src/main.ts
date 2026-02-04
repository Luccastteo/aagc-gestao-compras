import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      // Importação Excel (vira JSON grande) pode estourar 1MB default do Fastify
      bodyLimit: 20 * 1024 * 1024, // 20MB
    }),
  );

  // Rate limiting (Redis-backed, global + per-IP + per-org)
  const isDev = process.env.NODE_ENV === 'development';
  const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || (isDev ? '120' : '60'), 10);
  const rateLimitTTL = parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000; // ms

  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
  });

  await app.register(rateLimit as any, {
    max: rateLimitMax,
    timeWindow: rateLimitTTL,
    redis,
    // Gera chave por orgId (se autenticado) + IP
    keyGenerator: (req: any) => {
      const ipHeader = req.headers?.['x-forwarded-for'];
      const forwarded = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
      const ip =
        (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      // Se autenticado, combina orgId:IP para rate limit por tenant
      const orgId = req.user?.organizationId;
      return orgId ? `${orgId}:${ip}` : ip;
    },
    skipOnError: true, // Não bloquear requests se Redis falhar (graceful degradation)
  });

  // Security headers (Helmet)
  // DEV: CSP desabilitado para permitir Swagger com inline scripts/styles
  // PROD: CSP rigoroso, mas permitindo unsafe-inline para compatibilidade com alguns clients
  // Nota: "as any" necessário devido a incompatibilidade de tipos entre plugins Fastify
  await app.register(helmet as any, {
    contentSecurityPolicy: process.env.NODE_ENV === 'development'
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger/some clients precisam
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'], // data: para base64, https: para CDNs
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'data:'],
          },
        },
    crossOriginEmbedderPolicy: false, // API não embeda recursos cross-origin
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite CORS controlado
  });

  // CORS
  const originsRaw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
  const origins = originsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('AAGC SaaS API')
    .setDescription('Multi-tenant Purchase Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
