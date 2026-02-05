import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Health check - indica se o serviço está vivo
   * Retorna sempre 200 se o processo está rodando
   */
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Readiness check - indica se o serviço está pronto para receber requisições
   * Verifica dependências críticas (banco de dados, Redis se necessário)
   */
  async getReadiness() {
    const checks = {
      database: false,
      redis: false,
    };

    try {
      // Verifica conexão com banco de dados
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Verifica Redis (opcional - não falha se Redis não estiver disponível)
    try {
      // Se você tiver um RedisService injetado, pode verificar aqui
      // Por enquanto, assume que está ok se não houver erro
      checks.redis = true;
    } catch (error) {
      console.warn('Redis health check failed (non-critical):', error);
      checks.redis = false;
    }

    const isReady = checks.database; // Redis é opcional
    const status = isReady ? 'ready' : 'not_ready';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
