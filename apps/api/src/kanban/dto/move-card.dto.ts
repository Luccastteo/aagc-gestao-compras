import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { KanbanStatus } from '@prisma/client';

export class MoveCardDto {
  @IsEnum(KanbanStatus, { message: 'Status deve ser um valor válido: TODO, IN_PROGRESS, REVIEW, DONE' })
  status: KanbanStatus;

  @IsInt({ message: 'Posição deve ser um número inteiro' })
  @Min(0, { message: 'Posição deve ser maior ou igual a 0' })
  @IsOptional()
  position?: number;
}
