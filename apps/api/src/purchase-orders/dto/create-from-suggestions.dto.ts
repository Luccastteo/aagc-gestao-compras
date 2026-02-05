import { IsArray, IsOptional, IsUUID, ArrayMinSize } from 'class-validator';

export class CreateFromSuggestionsDto {
  @IsArray({ message: 'suggestionIds deve ser um array' })
  @IsUUID('4', { each: true, message: 'Cada suggestionId deve ser um UUID válido' })
  @ArrayMinSize(1, { message: 'Pelo menos uma sugestão deve ser selecionada' })
  @IsOptional()
  suggestionIds?: string[];

  @IsUUID('4', { message: 'supplierId deve ser um UUID válido' })
  @IsOptional()
  supplierId?: string;
}
