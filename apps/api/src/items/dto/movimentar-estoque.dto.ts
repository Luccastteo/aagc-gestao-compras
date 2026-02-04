import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class MovimentarEstoqueDto {
  @IsIn(['ENTRADA', 'SAIDA', 'AJUSTE'])
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';

  @IsInt()
  @Min(1)
  quantidade: number;

  @IsString()
  @IsNotEmpty()
  motivo: string;
}

