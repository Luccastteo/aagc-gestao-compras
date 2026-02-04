import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Helper genérico para garantir operações multi-tenant seguras.
 * 
 * Uso:
 * 
 * ```ts
 * const item = await this.tenantRepo.findOneOrFail('Item', id, organizationId);
 * ```
 * 
 * Sempre retorna 404 se não encontrar OU se o recurso pertencer a outra org.
 */
@Injectable()
export class TenantSafeRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca um recurso por ID garantindo que pertence à organizationId.
   * @throws NotFoundException se não encontrar ou se pertencer a outra org
   */
  async findOneOrFail<T = any>(
    entity: 'Item' | 'Supplier' | 'PurchaseOrder' | 'KanbanCard' | 'User',
    id: string,
    organizationId: string,
    include?: any,
  ): Promise<T> {
    const modelMap = {
      Item: this.prisma.item,
      Supplier: this.prisma.supplier,
      PurchaseOrder: this.prisma.purchaseOrder,
      KanbanCard: this.prisma.kanbanCard,
      User: this.prisma.user,
    };

    const model = modelMap[entity];
    if (!model) {
      throw new Error(`Unknown entity: ${entity}`);
    }

    const resource = await (model as any).findFirst({
      where: { id, organizationId },
      include,
    });

    if (!resource) {
      // IMPORTANTE: não vazar informação se o ID existe mas pertence a outra org.
      // Sempre retorna "not found" genérico.
      throw new NotFoundException(`${entity} not found`);
    }

    return resource as T;
  }

  /**
   * Valida que múltiplos IDs pertencem à organizationId.
   * @throws BadRequestException com mensagem clara se algum ID for inválido
   */
  async validateManyBelongToOrg(
    entity: 'Item' | 'Supplier',
    ids: string[],
    organizationId: string,
  ): Promise<void> {
    if (!ids || ids.length === 0) return;

    const modelMap = {
      Item: this.prisma.item,
      Supplier: this.prisma.supplier,
    };

    const model = modelMap[entity];
    const found = await (model as any).findMany({
      where: { id: { in: ids }, organizationId },
      select: { id: true },
    });

    if (found.length !== ids.length) {
      const foundIds = new Set(found.map((f: any) => f.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Os seguintes ${entity}s não pertencem a esta organização ou não existem: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Busca lista paginada com segurança multi-tenant.
   */
  async findManyPaginated<T = any>(
    entity: 'Item' | 'Supplier' | 'PurchaseOrder' | 'AuditLog',
    organizationId: string,
    options: {
      page?: number;
      pageSize?: number;
      orderBy?: any;
      where?: any;
      include?: any;
    } = {},
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const modelMap = {
      Item: this.prisma.item,
      Supplier: this.prisma.supplier,
      PurchaseOrder: this.prisma.purchaseOrder,
      AuditLog: this.prisma.auditLog,
    };

    const model = modelMap[entity];
    const where = { organizationId, ...(options.where || {}) };

    const [data, total] = await Promise.all([
      (model as any).findMany({
        where,
        skip,
        take: pageSize,
        orderBy: options.orderBy || { createdAt: 'desc' },
        include: options.include,
      }),
      (model as any).count({ where }),
    ]);

    return {
      data: data as T[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
