import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class SendWhatsAppDto {
  @IsString()
  @IsNotEmpty({ message: 'Destinatário é obrigatório' })
  @Matches(/^\d{10,15}$/, { message: 'Destinatário deve ser um número de telefone válido (10-15 dígitos)' })
  destinatario: string;

  @IsString()
  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  @MaxLength(4096, { message: 'Mensagem deve ter no máximo 4096 caracteres' })
  mensagem: string;
}
