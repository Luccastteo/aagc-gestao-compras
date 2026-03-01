import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = pagination?.page || 1;
    const pageSize = Math.max(1, Math.min(pagination?.pageSize || 20, 100));
    const skip = (page - 1) * pageSize;

    const where: any = { organizationId };

    if (pagination?.search) {
      where.OR = [
        { nome: { contains: pagination.search, mode: 'insensitive' } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (pagination?.sortBy) {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'asc';
    } else {
      orderBy.nome = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async create(data: any, organizationId: string, actorUserId: string) {
    const created = await this.prisma.supplier.create({
      data: { ...data, organizationId },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'CREATE',
        entity: 'Supplier',
        entityId: created.id,
        after: JSON.stringify(created),
        organizationId,
      },
    });

    return created;
  }

  async update(id: string, data: any, organizationId: string, actorUserId: string) {
    const before = await this.findOne(id, organizationId);
    const updated = await this.prisma.supplier.update({ where: { id }, data });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'UPDATE',
        entity: 'Supplier',
        entityId: id,
        before: JSON.stringify(before),
        after: JSON.stringify(updated),
        organizationId,
      },
    });

    return updated;
  }

  async delete(id: string, organizationId: string, actorUserId: string) {
    const before = await this.findOne(id, organizationId);
    await this.prisma.supplier.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'DELETE',
        entity: 'Supplier',
        entityId: id,
        before: JSON.stringify(before),
        organizationId,
      },
    });

    return { deleted: true };
  }
}
