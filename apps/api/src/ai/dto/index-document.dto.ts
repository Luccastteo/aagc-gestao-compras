import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum DocumentType {
  POLICY = 'POLICY',
  FAQ = 'FAQ',
  PROCEDURE = 'PROCEDURE',
  GUIDELINE = 'GUIDELINE',
}

export class IndexDocumentDto {
  @IsEnum(DocumentType, { message: 'Tipo de documento inválido' })
  @IsNotEmpty()
  type: DocumentType;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'O título deve ter pelo menos 3 caracteres' })
  @MaxLength(200, { message: 'O título não pode exceder 200 caracteres' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres' })
  @MaxLength(10000, { message: 'O conteúdo não pode exceder 10000 caracteres' })
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
