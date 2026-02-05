import { IsString, IsNotEmpty, IsEmail, MaxLength } from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { message: 'Destinatário deve ser um email válido' })
  @IsNotEmpty({ message: 'Destinatário é obrigatório' })
  destinatario: string;

  @IsString()
  @IsNotEmpty({ message: 'Assunto é obrigatório' })
  @MaxLength(200, { message: 'Assunto deve ter no máximo 200 caracteres' })
  assunto: string;

  @IsString()
  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  @MaxLength(10000, { message: 'Mensagem deve ter no máximo 10000 caracteres' })
  mensagem: string;
}
