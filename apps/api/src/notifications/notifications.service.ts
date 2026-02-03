import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationPayload {
  tipo: 'EMAIL' | 'WHATSAPP' | 'SMS';
  destinatario: string;
  assunto?: string;
  mensagem: string;
  organizationId: string;
}

export interface NotificationResult {
  success: boolean;
  type: string;
  logId: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ========== EMAIL ==========
  async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
    console.log('📧 [EMAIL] Enviando para:', payload.destinatario);
    console.log('   Assunto:', payload.assunto);
    console.log('   Mensagem:', payload.mensagem);

    await this.delay(100);

    const log = await this.prisma.commsLog.create({
      data: {
        tipo: 'EMAIL',
        destinatario: payload.destinatario,
        assunto: payload.assunto,
        mensagem: payload.mensagem,
        status: 'SIMULATED',
        organizationId: payload.organizationId,
      },
    });

    return {
      success: true,
      type: 'EMAIL',
      logId: log.id,
      message: `Email simulado enviado para ${payload.destinatario}`,
    };
  }

  // ========== WHATSAPP ==========
  async sendWhatsApp(payload: NotificationPayload): Promise<NotificationResult> {
    console.log('📱 [WHATSAPP] Enviando para:', payload.destinatario);
    console.log('   Mensagem:', payload.mensagem);

    await this.delay(100);

    const log = await this.prisma.commsLog.create({
      data: {
        tipo: 'WHATSAPP',
        destinatario: payload.destinatario,
        mensagem: payload.mensagem,
        status: 'SIMULATED',
        organizationId: payload.organizationId,
      },
    });

    return {
      success: true,
      type: 'WHATSAPP',
      logId: log.id,
      message: `WhatsApp simulado enviado para ${payload.destinatario}`,
    };
  }

  // ========== SMS ==========
  async sendSMS(payload: NotificationPayload): Promise<NotificationResult> {
    console.log('💬 [SMS] Enviando para:', payload.destinatario);
    console.log('   Mensagem:', payload.mensagem);

    await this.delay(100);

    const log = await this.prisma.commsLog.create({
      data: {
        tipo: 'SMS',
        destinatario: payload.destinatario,
        mensagem: payload.mensagem,
        status: 'SIMULATED',
        organizationId: payload.organizationId,
      },
    });

    return {
      success: true,
      type: 'SMS',
      logId: log.id,
      message: `SMS simulado enviado para ${payload.destinatario}`,
    };
  }

  // ========== SEND ALL (Broadcast) ==========
  async sendAll(payload: {
    email?: string;
    whatsapp?: string;
    sms?: string;
    assunto?: string;
    mensagem: string;
    organizationId: string;
  }) {
    const results: NotificationResult[] = [];

    if (payload.email) {
      const result = await this.sendEmail({
        tipo: 'EMAIL',
        destinatario: payload.email,
        assunto: payload.assunto,
        mensagem: payload.mensagem,
        organizationId: payload.organizationId,
      });
      results.push(result);
    }

    if (payload.whatsapp) {
      const result = await this.sendWhatsApp({
        tipo: 'WHATSAPP',
        destinatario: payload.whatsapp,
        mensagem: payload.mensagem,
        organizationId: payload.organizationId,
      });
      results.push(result);
    }

    if (payload.sms) {
      const result = await this.sendSMS({
        tipo: 'SMS',
        destinatario: payload.sms,
        mensagem: payload.mensagem,
        organizationId: payload.organizationId,
      });
      results.push(result);
    }

    return {
      sent: results.length,
      results,
    };
  }

  // ========== KANBAN NOTIFICATIONS ==========
  async notifyKanbanMove(
    cardTitle: string,
    fromStatus: string,
    toStatus: string,
    supplierEmail?: string,
    supplierWhatsapp?: string,
    organizationId?: string,
  ) {
    const statusLabels: Record<string, string> = {
      TODO: 'A Fazer',
      IN_PROGRESS: 'Em Andamento',
      DONE: 'Concluído',
      NOVO: 'Novo',
    };

    const fromLabel = statusLabels[fromStatus] || fromStatus;
    const toLabel = statusLabels[toStatus] || toStatus;

    const mensagem = `🔔 AAGC - Atualização de Pedido\n\n` +
      `O item "${cardTitle}" foi movido de "${fromLabel}" para "${toLabel}".\n\n` +
      `Data: ${new Date().toLocaleString('pt-BR')}\n\n` +
      `Este é um aviso automático do sistema AAGC.`;

    const assunto = `[AAGC] Pedido atualizado: ${cardTitle}`;

    const results: NotificationResult[] = [];

    if (supplierEmail && organizationId) {
      const result = await this.sendEmail({
        tipo: 'EMAIL',
        destinatario: supplierEmail,
        assunto,
        mensagem,
        organizationId,
      });
      results.push(result);
    }

    if (supplierWhatsapp && organizationId) {
      const result = await this.sendWhatsApp({
        tipo: 'WHATSAPP',
        destinatario: supplierWhatsapp,
        mensagem,
        organizationId,
      });
      results.push(result);
    }

    return results;
  }

  // ========== PURCHASE ORDER NOTIFICATIONS ==========
  async notifyPurchaseOrderStatus(
    poCode: string,
    status: string,
    supplierEmail?: string,
    supplierWhatsapp?: string,
    organizationId?: string,
    valorTotal?: number,
  ) {
    const statusLabels: Record<string, string> = {
      DRAFT: 'Rascunho',
      APPROVED: 'Aprovado',
      SENT: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
    };

    const statusLabel = statusLabels[status] || status;

    let mensagem = `🔔 AAGC - Pedido de Compra\n\n` +
      `Pedido: ${poCode}\n` +
      `Status: ${statusLabel}\n`;

    if (valorTotal) {
      mensagem += `Valor Total: R$ ${valorTotal.toFixed(2)}\n`;
    }

    mensagem += `\nData: ${new Date().toLocaleString('pt-BR')}\n\n`;

    if (status === 'SENT') {
      mensagem += `Por favor, confirme o recebimento deste pedido.\n\n`;
    } else if (status === 'APPROVED') {
      mensagem += `O pedido foi aprovado e será enviado em breve.\n\n`;
    }

    mensagem += `Este é um aviso automático do sistema AAGC.`;

    const assunto = `[AAGC] Pedido ${poCode} - ${statusLabel}`;

    const results: NotificationResult[] = [];

    if (supplierEmail && organizationId) {
      const result = await this.sendEmail({
        tipo: 'EMAIL',
        destinatario: supplierEmail,
        assunto,
        mensagem,
        organizationId,
      });
      results.push(result);
    }

    if (supplierWhatsapp && organizationId) {
      const result = await this.sendWhatsApp({
        tipo: 'WHATSAPP',
        destinatario: supplierWhatsapp,
        mensagem,
        organizationId,
      });
      results.push(result);
    }

    return results;
  }

  // ========== GET NOTIFICATION HISTORY ==========
  async getHistory(organizationId: string, limit = 50) {
    return this.prisma.commsLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getStats(organizationId: string) {
    const [total, byType, byStatus] = await Promise.all([
      this.prisma.commsLog.count({ where: { organizationId } }),
      this.prisma.commsLog.groupBy({
        by: ['tipo'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.commsLog.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.reduce((acc, item) => ({ ...acc, [item.tipo]: item._count }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
    };
  }

  // ========== NOTIFICATION SETTINGS ==========
  async getSettings(organizationId: string) {
    return {
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: true,
      notifyOnKanbanMove: true,
      notifyOnPOApproval: true,
      notifyOnPOSent: true,
      notifyOnPOReceived: true,
      emailProvider: 'simulated',
      whatsappProvider: 'simulated',
      smsProvider: 'simulated',
    };
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
