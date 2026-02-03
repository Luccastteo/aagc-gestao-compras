import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.itemsService.findAll(user.organizationId);
  }

  @Get('critical')
  async findCritical(@CurrentUser() user: CurrentUserData) {
    return this.itemsService.findCritical(user.organizationId);
  }

  @Get('analyze')
  @Roles(Role.MANAGER, Role.OWNER)
  async analyze(@CurrentUser() user: CurrentUserData) {
    return this.itemsService.analyze(user.organizationId);
  }

  @Get('export')
  @Roles(Role.MANAGER, Role.OWNER)
  async exportExcel(@CurrentUser() user: CurrentUserData) {
    return this.itemsService.exportToExcel(user.organizationId);
  }

  @Get('template')
  async getTemplate() {
    return this.itemsService.getImportTemplate();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.itemsService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(Role.MANAGER, Role.OPERATOR, Role.OWNER)
  async create(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.itemsService.create(data, user.organizationId, user.userId);
  }

  @Post('import')
  @Roles(Role.MANAGER, Role.OWNER)
  async importExcel(@Body() data: { items: any[] }, @CurrentUser() user: CurrentUserData) {
    return this.itemsService.importFromExcel(data.items, user.organizationId, user.userId);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.OPERATOR, Role.OWNER)
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.itemsService.update(id, data, user.organizationId, user.userId);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.OWNER)
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.itemsService.delete(id, user.organizationId, user.userId);
  }

  @Post(':id/movimentar')
  @Roles(Role.MANAGER, Role.OPERATOR, Role.OWNER)
  async movimentar(
    @Param('id') id: string,
    @Body() data: { tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE'; quantidade: number; motivo: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.itemsService.movimentar(
      id,
      data.tipo,
      data.quantidade,
      data.motivo,
      user.organizationId,
      user.name,
    );
  }
}
