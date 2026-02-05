import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class UpdateCardDto {
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Título deve ter no máximo 200 caracteres' })
  titulo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Descrição deve ter no máximo 1000 caracteres' })
  descricao?: string;

  @IsUUID('4', { message: 'purchaseOrderId deve ser um UUID válido' })
  @IsOptional()
  purchaseOrderId?: string;
}
