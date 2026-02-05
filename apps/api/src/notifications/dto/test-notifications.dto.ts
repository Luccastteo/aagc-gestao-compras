import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';

export class TestNotificationsDto {
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
}
