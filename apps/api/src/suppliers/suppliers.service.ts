import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { nome: 'asc' },
    });
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

  async create(data: any, organizationId: string) {
    return this.prisma.supplier.create({
      data: { ...data, organizationId },
    });
  }

  async update(id: string, data: any, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true };
  }
}
