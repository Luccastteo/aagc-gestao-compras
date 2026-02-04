import { IsEmail, IsOptional, IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'Código é obrigatório' })
  @MaxLength(50)
  codigo: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(120)
  nome: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  telefone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  whatsapp?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  endereco?: string;

  @IsString()
  @IsOptional()
  @MinLength(11)
  @MaxLength(18)
  cnpj?: string;
}

