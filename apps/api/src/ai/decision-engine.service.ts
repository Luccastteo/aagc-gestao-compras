import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DecisionContext, DecisionResult } from './interfaces';

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8001');
  }

  async evaluatePurchaseDecision(context: DecisionContext): Promise<DecisionResult> {
    const policy = await this.prisma.purchasePolicy.findUnique({
      where: { organizationId: context.organizationId },
    });

    if (!policy) {
      // Política padrão se não configurada
      return this.defaultDecision(context);
    }

    const consumption = await this.getAverageDailyConsumption(
      context.organizationId,
      context.itemId,
    );

    let urgencyScore = 50;

    try {
      const urgencyResponse = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/ml/urgency/score`, {
          organization_id: context.organizationId,
          item_id: context.itemId,
          current_stock: context.currentStock,
          min_stock: context.minStock,
          avg_daily_consumption: consumption,
          lead_time_days: context.leadTimeDays,
        }),
      );

      urgencyScore = urgencyResponse.data.urgency_score;
    } catch (_error) {
      this.logger.warn('ML Service indisponível, usando score padrão');
    }

    let supplierScore = 50;
    if (context.supplierId) {
      const performance = await this.prisma.supplierPerformance.findUnique({
        where: {
          organizationId_supplierId: {
            organizationId: context.organizationId,
            supplierId: context.supplierId,
          },
        },
      });

      if (performance) {
        supplierScore = (
          performance.onTimeDeliveryRate * 30 +
          performance.qualityScore * 0.25 +
          performance.priceCompetitiveness * 0.25 +
          performance.communicationScore * 0.20
        );
      }
    }

    const suggestedQty = Math.max(1, context.maxStock - context.currentStock);
    const estimatedTotal = suggestedQty * context.unitCost;

    const factors: string[] = [];
    const weights: Record<string, number> = {
      urgency: urgencyScore,
      supplier: supplierScore,
      value: estimatedTotal,
      policy: 0,
    };

    let decision: 'AUTO_APPROVE' | 'ESCALATE' | 'REJECT' = 'ESCALATE';
    let confidence = 0.5;
    let riskAssessment = '';

    if (estimatedTotal > policy.autoApproveThreshold) {
      factors.push(`Valor R$ ${estimatedTotal.toFixed(2)} excede limite de auto-aprovação`);
      weights.policy = 100;
      decision = 'ESCALATE';
      riskAssessment = 'Valor requer aprovação gerencial';
    } else if (urgencyScore >= 80 && policy.enableAutoApproval) {
      factors.push(`Urgência crítica (${urgencyScore}/100)`);
      decision = 'AUTO_APPROVE';
      confidence = 0.85;
      riskAssessment = 'Risco de ruptura iminente';
    } else if (supplierScore < 40 && context.supplierId) {
      factors.push(`Fornecedor com performance baixa (${supplierScore.toFixed(1)}/100)`);
      decision = 'ESCALATE';
      riskAssessment = 'Fornecedor não confiável';
    } else if (policy.enableAutoApproval && urgencyScore >= 50) {
      factors.push('Condições normais de reposição');
      decision = 'AUTO_APPROVE';
      confidence = 0.7;
      riskAssessment = 'Risco baixo';
    } else {
      factors.push('Situação requer revisão manual');
      decision = 'ESCALATE';
      riskAssessment = 'Múltiplos fatores a considerar';
    }

    let suggestedAction = '';
    if (decision === 'AUTO_APPROVE') {
      suggestedAction = 'Processar pedido de compra automaticamente';
    } else if (decision === 'ESCALATE') {
      suggestedAction = 'Enviar para aprovação de gerente';
    } else {
      suggestedAction = 'Bloquear pedido e revisar política';
    }

    return {
      decision,
      confidence,
      reasoning: { factors, weights, riskAssessment },
      suggestedAction,
      urgencyScore,
    };
  }

  private async getAverageDailyConsumption(
    organizationId: string,
    itemId: string,
  ): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.consumptionHistory.aggregate({
      where: {
        organizationId,
        itemId,
        date: { gte: thirtyDaysAgo },
      },
      _avg: { quantity: true },
    });

    return result._avg.quantity || 0;
  }

  private defaultDecision(_context: DecisionContext): DecisionResult {
    return {
      decision: 'ESCALATE',
      confidence: 0.5,
      reasoning: {
        factors: ['Política de compras não configurada'],
        weights: {},
        riskAssessment: 'Sem política definida',
      },
      suggestedAction: 'Configure a política de compras antes de automatizar',
      urgencyScore: 50,
    };
  }

  async logDecision(params: {
    organizationId: string;
    decisionType: string;
    entity: string;
    entityId: string;
    inputData: any;
    reasoning: any;
    decision: string;
    confidence: number;
    llmExplanation?: string;
  }): Promise<void> {
    await this.prisma.decisionLog.create({ data: params });
    this.logger.log(`Decisão registrada: ${params.decisionType} - ${params.decision}`);
  }
}
