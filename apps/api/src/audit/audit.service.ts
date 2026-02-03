import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, params?: any) {
    const { page = 1, limit = 50, entity, action, userId } = params || {};

    const where: any = { organizationId };

    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.actorUserId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actorUser: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(organizationId: string) {
    const total = await this.prisma.auditLog.count({ where: { organizationId } });

    const byAction = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: { organizationId },
      _count: true,
    });

    const byEntity = await this.prisma.auditLog.groupBy({
      by: ['entity'],
      where: { organizationId },
      _count: true,
    });

    return {
      total,
      byAction,
      byEntity,
    };
  }
}
