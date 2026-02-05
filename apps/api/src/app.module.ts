import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ItemsModule } from './items/items.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { KanbanModule } from './kanban/kanban.module';
import { AuditModule } from './audit/audit.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AIModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ItemsModule,
    PurchaseOrdersModule,
    KanbanModule,
    AuditModule,
    SuppliersModule,
    NotificationsModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
