import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

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
  realSend?: boolean;
}

@Injectable()
export class NotificationsService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private emailConfigured = false;

  constructor(private prisma: PrismaService) {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    // Check if email is configured via environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.emailConfigured = true;
      console.log('✅ Email SMTP configurado:', smtpHost);
    } else {
      // Use ethereal for testing (fake SMTP that captures emails)
      console.log('⚠️ SMTP não configurado - emails serão simulados');
      console.log('   Configure: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
    }
  }

  // ========== EMAIL ==========
  async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
    console.log('📧 [EMAIL] Enviando para:', payload.destinatario);
    console.log('   Assunto:', payload.assunto);

    let status = 'SIMULATED';
    let realSend = false;

    // Try to send real email if configured
    if (this.emailConfigured && this.emailTransporter) {
      try {
        const info = await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: payload.destinatario,
          subject: payload.assunto || 'AAGC - Notificação',
          text: payload.mensagem,
          html: this.formatEmailHtml(payload.assunto || '', payload.mensagem),
        });

        console.log('✅ Email enviado com sucesso:', info.messageId);
        status = 'SENT';
        realSend = true;
      } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        status = 'FAILED';
      }
    }

    const log = await this.prisma.commsLog.create({
      data: {
        tipo: 'EMAIL',
        destinatario: payload.destinatario,
        assunto: payload.assunto,
        mensagem: payload.mensagem,
        status,
        organizationId: payload.organizationId,
      },
    });

    return {
      success: status !== 'FAILED',
      type: 'EMAIL',
      logId: log.id,
      message: realSend 
        ? `Email enviado para ${payload.destinatario}` 
        : `Email simulado para ${payload.destinatario}`,
      realSend,
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatEmailHtml(assunto: string, mensagem: string): string {
    const safeAssunto = this.escapeHtml(assunto);
    const safeMensagem = this.escapeHtml(mensagem);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">AAGC</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Gestão Inteligente de Compras</p>
    </div>
    <div class="content">
      <h2>${safeAssunto}</h2>
      <div style="white-space: pre-line;">${safeMensagem}</div>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente pelo sistema AAGC.</p>
      <p>&copy; ${new Date().getFullYear()} AAGC - Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;
  }

  // ========== WHATSAPP ==========
  async sendWhatsApp(payload: NotificationPayload): Promise<NotificationResult> {
    console.log('📱 [WHATSAPP] Enviando para:', payload.destinatario);
    console.log('   Mensagem:', payload.mensagem.substring(0, 50) + '...');

    let status = 'SIMULATED';
    let realSend = false;

    // WhatsApp integration via Twilio or other provider
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (twilioAccountSid && twilioAuthToken && twilioWhatsappFrom) {
      try {
        // Twilio WhatsApp API call
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: `whatsapp:${twilioWhatsappFrom}`,
              To: `whatsapp:${payload.destinatario}`,
              Body: payload.mensagem,
            }),
          }
        );

        if (response.ok) {
          console.log('✅ WhatsApp enviado com sucesso');
          status = 'SENT';
          realSend = true;
        } else {
          console.error('❌ Erro Twilio:', await response.text());
          status = 'FAILED';
        }
      } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
        status = 'FAILED';
      }
    }

    const log = await this.prisma.commsLog.create({
      data: {
        tipo: 'WHATSAPP',
        destinatario: payload.destinatario,
        mensagem: payload.mensagem,
        status,
        organizationId: payload.organizationId,
      },
    });

    return {
      success: status !== 'FAILED',
      type: 'WHATSAPP',
      logId: log.id,
      message: realSend 
        ? `WhatsApp enviado para ${payload.destinatario}` 
        : `WhatsApp simulado para ${payload.destinatario}`,
      realSend,
    };
  }

  // ========== SMS ==========
  async sendSMS(payload: NotificationPayload): Promise<NotificationResult> {
    console.log('💬 [SMS] Enviando para:', payload.destinatario);
    console.log('   Mensagem:', payload.mensagem.substring(0, 50) + '...');

    let status = 'SIMULATED';
    let realSend = false;

    // SMS integration via Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSmsFrom = process.env.TWILIO_SMS_FROM;

    if (twilioAccountSid && twilioAuthToken && twilioSmsFrom) {
      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioSmsFrom,
              To: payload.destinatario,
              Body: payload.mensagem,
            }),
          }
        );

        if (response.ok) {
          console.log('✅ SMS enviado com sucesso');
          status = 'SENT';
          realSend = true;
        } else {
          console.error('❌ Erro Twilio SMS:', await response.text());
          status = 'FAILED';
        }
      } catch (error) {
        console.error('❌ Erro ao enviar SMS:', error);
        status = 'FAILED';
      }
    }

    const log = await this.prisma.commsLog.create({
      data: {
        tipo: 'SMS',
        destinatario: payload.destinatario,
        mensagem: payload.mensagem,
        status,
        organizationId: payload.organizationId,
      },
    });

    return {
      success: status !== 'FAILED',
      type: 'SMS',
      logId: log.id,
      message: realSend 
        ? `SMS enviado para ${payload.destinatario}` 
        : `SMS simulado para ${payload.destinatario}`,
      realSend,
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
    const safeLimit = Math.min(Math.max(1, limit), 200);
    return this.prisma.commsLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
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
  async getSettings(_organizationId: string) {
    return {
      emailEnabled: true,
      emailConfigured: this.emailConfigured,
      whatsappEnabled: true,
      whatsappConfigured: !!process.env.TWILIO_ACCOUNT_SID,
      smsEnabled: true,
      smsConfigured: !!process.env.TWILIO_SMS_FROM,
      notifyOnKanbanMove: true,
      notifyOnPOApproval: true,
      notifyOnPOSent: true,
      notifyOnPOReceived: true,
      emailProvider: this.emailConfigured ? 'smtp' : 'simulated',
      whatsappProvider: process.env.TWILIO_ACCOUNT_SID ? 'twilio' : 'simulated',
      smsProvider: process.env.TWILIO_SMS_FROM ? 'twilio' : 'simulated',
    };
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
