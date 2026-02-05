import { IsString, IsOptional, IsEmail, Matches, MaxLength } from 'class-validator';

export class SendAllDto {
  @IsEmail({}, { message: 'Email deve ser um endereço válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{10,15}$/, { message: 'WhatsApp deve ser um número válido (10-15 dígitos)' })
  whatsapp?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{10,15}$/, { message: 'SMS deve ser um número válido (10-15 dígitos)' })
  sms?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Assunto deve ter no máximo 200 caracteres' })
  assunto?: string;

  @IsString()
  @MaxLength(10000, { message: 'Mensagem deve ter no máximo 10000 caracteres' })
  mensagem: string;
}
