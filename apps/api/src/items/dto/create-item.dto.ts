import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU é obrigatório' })
  sku: string;

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  descricao: string;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsString()
  @IsOptional()
  unidade?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  saldo?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimo?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maximo?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  custoUnitario?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  leadTimeDays?: number;

  @IsString()
  @IsOptional()
  localizacao?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;
}
