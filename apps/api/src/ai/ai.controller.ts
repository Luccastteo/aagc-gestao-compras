import { Controller, Post, Body, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AIService } from './ai.service';
import { RAGService } from './rag.service';
import { DecisionEngineService } from './decision-engine.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SearchResult, DecisionResult, DecisionContext } from './interfaces';
import { ChatDto, EvaluateDecisionDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly ragService: RAGService,
    private readonly decisionEngine: DecisionEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('insights')
  async getInsights(@GetUser() user: any) {
    const organizationId = user.organizationId;

    // Buscar alertas críticos (para demanda)
    const alerts = await this.prisma.inventoryAlert.findMany({
      where: { organizationId, status: { in: ['OPEN', 'ACK'] } },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Buscar sugestões de compra abertas
    const suggestions = await this.prisma.purchaseSuggestion.findMany({
      where: { organizationId, status: 'OPEN' },
      include: { item: true, supplier: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Buscar performance de fornecedores
    const supplierPerformance = await this.prisma.supplierPerformance.findMany({
      where: { organizationId },
      include: { supplier: true },
      orderBy: { qualityScore: 'desc' },
      take: 10,
    });

    // Buscar decisões recentes
    const decisions = await this.prisma.decisionLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Formatar para o frontend
    const demandForecasts = alerts.map((alert, idx) => ({
      itemId: alert.itemId,
      itemName: alert.item.descricao,
      sku: alert.item.sku,
      currentStock: alert.item.saldo,
      predictedDemand30d: alert.item.maximo - alert.item.saldo,
      confidence: 0.80 - (idx * 0.05),
      trend: alert.severity === 'HIGH' ? 'UP' : 'STABLE',
      alertType: alert.reason,
      severity: alert.severity,
    }));

    const supplierRankings = supplierPerformance.map((sp, idx) => ({
      supplierId: sp.supplierId,
      name: sp.supplier.nome,
      score: (Number(sp.qualityScore) + Number(sp.onTimeDeliveryRate) * 100 + Number(sp.priceCompetitiveness) + Number(sp.communicationScore)) / 4 || 0,
      rank: idx + 1,
      factors: {
        onTime: Number(sp.onTimeDeliveryRate) || 0,
        quality: Number(sp.qualityScore) || 0,
        price: Number(sp.priceCompetitiveness) || 0,
        communication: Number(sp.communicationScore) || 70,
      },
      ordersDelivered: sp.completedOrders,
      period: `${sp.dataFrom?.toISOString().slice(0, 10)} a ${sp.dataTo?.toISOString().slice(0, 10)}`,
    }));

    const recentDecisions = decisions.map((d) => ({
      id: d.id,
      type: d.decisionType,
      item: d.llmExplanation || d.decision || 'N/A',
      confidence: Number(d.confidence) || 0,
      result: d.decision || 'PENDING',
      reasoning: d.reasoning,
      timestamp: d.createdAt.toISOString(),
    }));

    // Adicionar sugestões de compra
    const purchaseSuggestions = suggestions.map((s) => ({
      id: s.id,
      itemId: s.itemId,
      itemName: s.item.descricao,
      sku: s.item.sku,
      supplierId: s.supplierId,
      supplierName: s.supplier?.nome || 'Sem fornecedor',
      suggestedQty: s.suggestedQty,
      unitCost: Number(s.unitCost),
      estimatedTotal: Number(s.estimatedTotal),
      urgencyScore: s.suggestedQty,
      status: s.status,
      reason: s.reason,
    }));

    return {
      demandForecasts,
      supplierRankings,
      recentDecisions,
      purchaseSuggestions,
      summary: {
        criticalAlerts: alerts.filter(a => a.severity === 'HIGH').length,
        pendingSuggestions: suggestions.length,
        suppliersEvaluated: supplierPerformance.length,
        decisionsToday: decisions.filter(d => 
          d.createdAt.toDateString() === new Date().toDateString()
        ).length,
      },
    };
  }

  @Post('chat')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async chat(@Body() dto: ChatDto, @GetUser() user: any): Promise<{ answer: string; sources: SearchResult[] }> {
    const result = await this.ragService.answerQuestion(user.organizationId, dto.question);
    return result;
  }

  @Post('knowledge/index')
  @Roles('OWNER', 'MANAGER')
  async indexDocument(
    @Body() body: { type: string; title: string; content: string; tags?: string[] },
    @GetUser() user: any,
  ) {
    const docId = await this.ragService.indexDocument({
      organizationId: user.organizationId,
      type: body.type,
      title: body.title,
      content: body.content,
      tags: body.tags,
      createdBy: user.userId,
    });

    return { documentId: docId, message: 'Documento indexado com sucesso' };
  }

  @Post('decision/evaluate')
  @Roles('OWNER', 'MANAGER')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async evaluateDecision(
    @Body() dto: EvaluateDecisionDto,
    @GetUser() user: any,
  ): Promise<DecisionResult> {
    const result = await this.decisionEngine.evaluatePurchaseDecision({
      ...dto,
      organizationId: user.organizationId,
    });

    return result;
  }
}
