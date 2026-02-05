import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, Min, Max, IsUUID } from 'class-validator';

export class EvaluateDecisionDto {
  @IsUUID('4', { message: 'itemId deve ser um UUID válido' })
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsNumber()
  @Min(0, { message: 'Estoque atual não pode ser negativo' })
  currentStock: number;

  @IsNumber()
  @IsPositive({ message: 'Estoque mínimo deve ser positivo' })
  minStock: number;

  @IsNumber()
  @IsPositive({ message: 'Estoque máximo deve ser positivo' })
  maxStock: number;

  @IsNumber()
  @IsPositive({ message: 'Custo unitário deve ser positivo' })
  @Max(999999, { message: 'Custo unitário muito alto' })
  unitCost: number;

  @IsNumber()
  @IsPositive({ message: 'Lead time deve ser positivo' })
  @Max(365, { message: 'Lead time não pode exceder 365 dias' })
  leadTimeDays: number;

  @IsUUID('4', { message: 'supplierId deve ser um UUID válido' })
  @IsOptional()
  supplierId?: string;
}
