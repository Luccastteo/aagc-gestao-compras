import { Controller, Get, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('history')
  async getHistory(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.getHistory(user.organizationId);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.getStats(user.organizationId);
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.getSettings(user.organizationId);
  }

  @Post('send/email')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendEmail(
    @Body() body: { destinatario: string; assunto: string; mensagem: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendEmail({
      tipo: 'EMAIL',
      destinatario: body.destinatario,
      assunto: body.assunto,
      mensagem: body.mensagem,
      organizationId: user.organizationId,
    });
  }

  @Post('send/whatsapp')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendWhatsApp(
    @Body() body: { destinatario: string; mensagem: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendWhatsApp({
      tipo: 'WHATSAPP',
      destinatario: body.destinatario,
      mensagem: body.mensagem,
      organizationId: user.organizationId,
    });
  }

  @Post('send/sms')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendSMS(
    @Body() body: { destinatario: string; mensagem: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendSMS({
      tipo: 'SMS',
      destinatario: body.destinatario,
      mensagem: body.mensagem,
      organizationId: user.organizationId,
    });
  }

  @Post('send/all')
  @Roles(Role.MANAGER, Role.OWNER)
  async sendAll(
    @Body() body: { email?: string; whatsapp?: string; sms?: string; assunto?: string; mensagem: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.sendAll({
      ...body,
      organizationId: user.organizationId,
    });
  }

  @Post('test')
  @Roles(Role.OWNER)
  async testNotifications(
    @Body() body: { email?: string; whatsapp?: string; sms?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    const mensagem = `🧪 Teste de Notificação AAGC\n\nEsta é uma mensagem de teste do sistema.\n\nData: ${new Date().toLocaleString('pt-BR')}`;

    return this.notificationsService.sendAll({
      ...body,
      assunto: '[AAGC] Teste de Notificação',
      mensagem,
      organizationId: user.organizationId,
    });
  }
}
