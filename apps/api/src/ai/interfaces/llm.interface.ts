export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PurchaseDecisionContext {
  itemName: string;
  currentStock: number;
  minStock: number;
  avgConsumption: number;
  leadTime: number;
  supplierName: string;
  urgencyScore: number;
  decision: string;
  confidence: number;
}

export interface PurchaseMessageContext {
  supplierName: string;
  itemName: string;
  quantity: number;
  expectedDeliveryDate: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ExceptionContext {
  type: string;
  description: string;
  affectedItems: string[];
  impact: string;
}

export interface ExceptionAnalysis {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  reasoning: string;
}
