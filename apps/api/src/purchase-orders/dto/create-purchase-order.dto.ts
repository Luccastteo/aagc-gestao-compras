import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested, IsInt, Min, IsNumber } from 'class-validator';

class CreatePurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsInt()
  @Min(1)
  quantidade: number;

  @IsNumber()
  @Min(0)
  precoUnitario: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}

