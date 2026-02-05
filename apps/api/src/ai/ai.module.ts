import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { RAGService } from './rag.service';
import { DecisionEngineService } from './decision-engine.service';
import { AIController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, ConfigModule, PrismaModule, AuthModule],
  controllers: [AIController],
  providers: [AIService, RAGService, DecisionEngineService],
  exports: [AIService, RAGService, DecisionEngineService],
})
export class AIModule {}
