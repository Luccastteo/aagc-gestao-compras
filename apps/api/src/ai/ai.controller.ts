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

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly ragService: RAGService,
    private readonly decisionEngine: DecisionEngineService,
  ) {}

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
