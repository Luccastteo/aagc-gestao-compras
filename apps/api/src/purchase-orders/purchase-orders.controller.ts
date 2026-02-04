import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreatePurchaseOrderDto } from './dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private poService: PurchaseOrdersService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData, @Query() pagination: PaginationDto) {
    return this.poService.findAll(user.organizationId, pagination);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.poService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(Role.OPERATOR, Role.MANAGER, Role.OWNER)
  async create(@Body() data: CreatePurchaseOrderDto, @CurrentUser() user: CurrentUserData) {
    return this.poService.create(data, user.organizationId, user.userId);
  }

  @Post('from-suggestions')
  @Roles(Role.OPERATOR, Role.MANAGER, Role.OWNER)
  async createFromSuggestions(
    @Body() body: { suggestionIds?: string[]; supplierId?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.poService.createFromSuggestions(body, user.organizationId, user.userId);
  }

  @Post(':id/approve')
  @Roles(Role.MANAGER, Role.OWNER)
  async approve(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.poService.approve(id, user.organizationId, user.userId);
  }

  @Post(':id/send')
  @Roles(Role.MANAGER, Role.OWNER)
  async send(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.poService.send(id, user.organizationId, user.userId);
  }

  @Post(':id/receive')
  @Roles(Role.OPERATOR, Role.MANAGER, Role.OWNER)
  async receive(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.poService.receive(id, user.organizationId, user.userId);
  }
}
