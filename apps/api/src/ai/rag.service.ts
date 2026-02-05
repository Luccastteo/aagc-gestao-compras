import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from './ai.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SearchResult } from './interfaces';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private readonly apiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      this.logger.warn('OpenAI API key não configurada - embeddings desabilitados');
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/embeddings',
          {
            model: 'text-embedding-3-small',
            input: text,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.data[0].embedding;
    } catch (error) {
      this.logger.error('Erro ao gerar embedding', error);
      throw error;
    }
  }

  async indexDocument(params: {
    organizationId: string;
    type: string;
    title: string;
    content: string;
    tags?: string[];
    createdBy: string;
  }): Promise<string> {
    // Por enquanto, criar documento sem embedding (pgvector não instalado)
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId: params.organizationId,
        type: params.type,
        title: params.title,
        content: params.content,
        tags: params.tags || [],
        createdBy: params.createdBy,
      },
    });

    this.logger.log(`Documento indexado: ${params.title}`);
    return doc.id;
  }

  async semanticSearch(
    organizationId: string,
    query: string,
    limit = 5,
  ): Promise<SearchResult[]> {
    // Fallback: busca por texto simples se pgvector não estiver disponível
    const results = await this.prisma.knowledgeDocument.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      type: r.type,
    }));
  }

  async answerQuestion(
    organizationId: string,
    question: string,
  ): Promise<{ answer: string; sources: SearchResult[] }> {
    const sources = await this.semanticSearch(organizationId, question, 3);

    if (sources.length === 0) {
      return {
        answer: 'Desculpe, não encontrei informações relevantes na base de conhecimento.',
        sources: [],
      };
    }

    const context = sources
      .map((s, i) => `[Documento ${i + 1}: ${s.title}]\n${s.content}`)
      .join('\n\n');

    const systemPrompt = `Você é um assistente interno que responde perguntas usando APENAS as informações fornecidas nos documentos.
Se a informação não estiver nos documentos, diga claramente que não sabe.
Cite os documentos usados.`;

    const userPrompt = `Documentos disponíveis:
${context}

Pergunta: ${question}

Responda citando os documentos usados.`;

    const response = await this.aiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return {
      answer: response.content,
      sources,
    };
  }
}
