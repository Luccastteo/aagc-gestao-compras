import { Controller, Get, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  SendEmailDto,
  SendWhatsAppDto,
  SendSMSDto,
  SendAllDto,
  TestNotificationsDto,
} from './dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('history')
  @Roles(Role.OPERATOR, Role.MANAGER, Role.OWNER)
  async getHistory(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.getHistory(user.organizationId);
  }

  @Get('stats')
  @Roles(Role.MANAGER, Role.OWNER)
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.getStats(user.organizationId);
  }

  @Get('settings')
  @Roles(Role.MANAGER, Role.OWNER)
  async getSettings(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.getSettings(user.organizationId);
  }

  @Post('send/email')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendEmail(
    @Body() dto: SendEmailDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendEmail({
      tipo: 'EMAIL',
      destinatario: dto.destinatario,
      assunto: dto.assunto,
      mensagem: dto.mensagem,
      organizationId: user.organizationId,
    });
  }

  @Post('send/whatsapp')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendWhatsApp(
    @Body() dto: SendWhatsAppDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendWhatsApp({
      tipo: 'WHATSAPP',
      destinatario: dto.destinatario,
      mensagem: dto.mensagem,
      organizationId: user.organizationId,
    });
  }

  @Post('send/sms')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendSMS(
    @Body() dto: SendSMSDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendSMS({
      tipo: 'SMS',
      destinatario: dto.destinatario,
      mensagem: dto.mensagem,
      organizationId: user.organizationId,
    });
  }

  @Post('send/all')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendAll(
    @Body() dto: SendAllDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendAll({
      ...dto,
      organizationId: user.organizationId,
    });
  }

  @Post('test')
  @Roles(Role.OWNER)
  async testNotifications(
    @Body() dto: TestNotificationsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const mensagem = `🧪 Teste de Notificação AAGC\n\nEsta é uma mensagem de teste do sistema.\n\nData: ${new Date().toLocaleString('pt-BR')}`;

    return this.notificationsService.sendAll({
      ...dto,
      assunto: '[AAGC] Teste de Notificação',
      mensagem,
      organizationId: user.organizationId,
    });
  }
}
