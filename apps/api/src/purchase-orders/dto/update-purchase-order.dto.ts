import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class UpdatePurchaseOrderItemDto {
  @IsUUID('4', { message: 'itemId deve ser um UUID válido' })
  itemId: string;

  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(1, { message: 'Quantidade mínima é 1' })
  quantidade: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço unitário deve ter no máximo 2 casas decimais' })
  @Min(0.01, { message: 'Preço unitário mínimo é 0.01' })
  precoUnitario: number;
}

export class UpdatePurchaseOrderDto {
  @IsUUID('4', { message: 'supplierId deve ser um UUID válido' })
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'Observações devem ter no máximo 2000 caracteres' })
  observacoes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseOrderItemDto)
  @IsOptional()
  items?: UpdatePurchaseOrderItemDto[];
}
