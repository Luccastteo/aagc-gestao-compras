import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './auth/public.decorator';
import * as bcrypt from 'bcrypt';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  getHello() {
    return { message: 'AAGC API is running', version: '1.0.0' };
  }

  @Public()
  @Get('health')
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'AAGC Backend API',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Public()
  @Get('health/ready')
  async getReadiness() {
    try {
      // Verifica conexão com banco de dados
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: true,
          redis: true, // Assume ok (não crítico)
        },
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
          redis: true,
        },
        error: error.message,
      };
    }
  }

  @Public()
  @Post('test-login')
  testLogin(@Body() body: any) {
    return {
      message: 'Test endpoint working',
      received: body,
    };
  }

  @Public()
  @Post('simple-login')
  async simpleLogin(@Body() body: { email: string; password: string }) {
    try {
      console.log('🔐 Simple login attempt:', body.email);

      const user = await this.prisma.user.findUnique({
        where: { email: body.email },
        include: { organization: true },
      });

      if (!user) {
        return { error: 'User not found' };
      }

      const isPasswordValid = await bcrypt.compare(body.password, user.password);

      if (!isPasswordValid) {
        return { error: 'Invalid password' };
      }

      console.log('✅ Login successful:', user.email);

      return {
        success: true,
        user: {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        },
        token: `session_${user.id}_${Date.now()}`,
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
