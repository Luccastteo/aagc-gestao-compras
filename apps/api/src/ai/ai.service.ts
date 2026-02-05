import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  tokens: number;
  model: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseURL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4-turbo-preview');
    this.baseURL = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY não configurada - funcionalidades de LLM desabilitadas');
    }
  }

  async chat(messages: ChatMessage[], maxTokens = 1000): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseURL}/chat/completions`,
          {
            model: this.model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const choice = response.data.choices[0];
      return {
        content: choice.message.content,
        tokens: response.data.usage.total_tokens,
        model: response.data.model,
      };
    } catch (error) {
      this.logger.error('Erro ao chamar OpenAI API', error);
      throw error;
    }
  }

  async explainPurchaseDecision(context: {
    itemName: string;
    currentStock: number;
    minStock: number;
    suggestedQty: number;
    estimatedCost: number;
    supplierName?: string;
    urgencyScore: number;
    demandForecast?: number[];
  }): Promise<string> {
    const systemPrompt = `Você é um assistente de compras especializado. 
Seu papel é explicar decisões de compra de forma clara e profissional em português do Brasil.
Seja conciso mas informativo, focando em justificativas práticas.`;

    const userPrompt = `Explique porque estamos sugerindo esta compra:

Item: ${context.itemName}
Estoque atual: ${context.currentStock} unidades
Estoque mínimo: ${context.minStock} unidades
Quantidade sugerida: ${context.suggestedQty} unidades
Custo estimado: R$ ${context.estimatedCost.toFixed(2)}
${context.supplierName ? `Fornecedor: ${context.supplierName}` : ''}
Score de urgência: ${context.urgencyScore}/100
${context.demandForecast ? `Previsão de consumo (próximos 30 dias): ${context.demandForecast.slice(0, 5).join(', ')}...` : ''}

Forneça uma explicação de 2-3 parágrafos justificando esta compra.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 300);

    return response.content;
  }

  async generatePurchaseMessage(context: {
    supplierName: string;
    items: Array<{ name: string; qty: number; unitPrice?: number }>;
    total: number;
    poCode: string;
    deadline?: string;
  }): Promise<string> {
    const systemPrompt = `Você é um assistente que escreve mensagens profissionais para fornecedores.
Seja educado, claro e objetivo. Use português do Brasil formal.`;

    const itemsList = context.items.map(
      (item, i) => `${i + 1}. ${item.name} - ${item.qty} unidades${item.unitPrice ? ` (R$ ${item.unitPrice.toFixed(2)}/un)` : ''}`
    ).join('\n');

    const userPrompt = `Crie uma mensagem de pedido de compra para o fornecedor:

Fornecedor: ${context.supplierName}
Pedido: ${context.poCode}
Valor total: R$ ${context.total.toFixed(2)}
${context.deadline ? `Prazo de entrega: ${context.deadline}` : ''}

Itens:
${itemsList}

A mensagem deve:
1. Cumprimentar cordialmente
2. Referir o código do pedido
3. Listar os itens
4. Solicitar confirmação de disponibilidade e prazo
5. Encerrar profissionalmente

Máximo 150 palavras.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 250);

    return response.content;
  }

  async analyzeException(context: {
    type: 'PRICE_SPIKE' | 'LEAD_TIME_EXCEEDED' | 'QUALITY_ISSUE' | 'SUPPLIER_UNRELIABLE';
    details: string;
    historicalData?: any;
  }): Promise<{ severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; recommendation: string; reasoning: string }> {
    const systemPrompt = `Você é um analista de exceções em processos de compra.
Avalie situações anormais e recomende ações. Seja direto e focado em soluções.`;

    const userPrompt = `Analise esta exceção:

Tipo: ${context.type}
Detalhes: ${context.details}
${context.historicalData ? `Dados históricos: ${JSON.stringify(context.historicalData)}` : ''}

Forneça:
1. Severidade (LOW/MEDIUM/HIGH/CRITICAL)
2. Recomendação (ação específica a tomar)
3. Raciocínio (1 parágrafo)

Formato: JSON
{
  "severity": "...",
  "recommendation": "...",
  "reasoning": "..."
}`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 300);

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        severity: 'MEDIUM',
        recommendation: 'Revisar manualmente a situação',
        reasoning: response.content,
      };
    }
  }
}
