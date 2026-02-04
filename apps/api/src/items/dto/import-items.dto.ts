import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ImportItemRowDto {
  @IsString()
  @IsNotEmpty()
  SKU: string;

  @IsString()
  @IsNotEmpty()
  Descricao: string;

  @IsOptional()
  @IsString()
  Categoria?: string;

  @IsOptional()
  @IsString()
  Unidade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  Estoque_Atual?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  Estoque_Minimo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  Estoque_Maximo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  Custo_Unitario?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  Lead_Time_Dias?: number;

  @IsOptional()
  @IsString()
  Localizacao?: string;
}

export class ImportItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportItemRowDto)
  items: ImportItemRowDto[];
}

