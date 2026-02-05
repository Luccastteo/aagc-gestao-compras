import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'A pergunta deve ter pelo menos 3 caracteres' })
  @MaxLength(1000, { message: 'A pergunta não pode exceder 1000 caracteres' })
  question: string;
}
