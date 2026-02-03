import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.suppliersService.findAll(user.organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.suppliersService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(Role.MANAGER, Role.OWNER)
  async create(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.suppliersService.create(data, user.organizationId);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.OWNER)
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.suppliersService.update(id, data, user.organizationId);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.suppliersService.delete(id, user.organizationId);
  }
}
