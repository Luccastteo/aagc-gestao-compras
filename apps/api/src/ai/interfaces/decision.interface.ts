export interface DecisionContext {
  itemId: string;
  itemName: string;
  organizationId: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  leadTimeDays: number;
  supplierId?: string;
}

export interface DecisionResult {
  decision: 'AUTO_APPROVE' | 'ESCALATE' | 'REJECT';
  confidence: number;
  reasoning: {
    factors: string[];
    weights: Record<string, number>;
    riskAssessment: string;
  };
  suggestedAction: string;
  urgencyScore: number;
}
