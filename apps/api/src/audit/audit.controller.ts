import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  async findAll(@CurrentUser() user: CurrentUserData, @Query() query: any) {
    return this.auditService.findAll(user.organizationId, query);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.auditService.getStats(user.organizationId);
  }
}
