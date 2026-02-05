import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  @Roles(Role.MANAGER, Role.OWNER)
  async findAll(@CurrentUser() user: CurrentUserData, @Query() query: any) {
    return this.auditService.findAll(user.organizationId, query);
  }

  @Get('stats')
  @Roles(Role.MANAGER, Role.OWNER)
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.auditService.getStats(user.organizationId);
  }
}
