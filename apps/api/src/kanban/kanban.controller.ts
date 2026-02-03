import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, KanbanStatus } from '@prisma/client';

@Controller('kanban')
export class KanbanController {
  constructor(private kanbanService: KanbanService) {}

  @Get('board')
  async getBoard(@CurrentUser() user: CurrentUserData) {
    return this.kanbanService.getBoard(user.organizationId);
  }

  @Post('cards')
  @Roles(Role.OPERATOR, Role.MANAGER, Role.OWNER)
  async createCard(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.kanbanService.createCard(data, user.organizationId, user.userId);
  }

  @Patch('cards/:id/move')
  @Roles(Role.OPERATOR, Role.MANAGER, Role.OWNER)
  async moveCard(
    @Param('id') id: string,
    @Body('status') status: KanbanStatus,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kanbanService.moveCard(id, status, user.organizationId, user.userId);
  }

  @Patch('cards/:id')
  @Roles(Role.OPERATOR, Role.MANAGER, Role.OWNER)
  async updateCard(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kanbanService.updateCard(id, data, user.organizationId, user.userId);
  }

  @Delete('cards/:id')
  @Roles(Role.MANAGER, Role.OWNER)
  async deleteCard(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.kanbanService.deleteCard(id, user.organizationId, user.userId);
  }
}
