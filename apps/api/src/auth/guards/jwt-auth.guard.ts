import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '../auth.guard';

/**
 * JWT Auth Guard - Alias para o AuthGuard existente
 * Mantém compatibilidade com a nomenclatura padrão NestJS
 */
@Injectable()
export class JwtAuthGuard extends PassportAuthGuard {}
