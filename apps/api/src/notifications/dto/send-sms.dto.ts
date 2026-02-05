import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class SendSMSDto {
  @IsString()
  @IsNotEmpty({ message: 'Destinatário é obrigatório' })
  @Matches(/^\d{10,15}$/, { message: 'Destinatário deve ser um número de telefone válido (10-15 dígitos)' })
  destinatario: string;

  @IsString()
  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  @MaxLength(160, { message: 'Mensagem SMS deve ter no máximo 160 caracteres' })
  mensagem: string;
}
