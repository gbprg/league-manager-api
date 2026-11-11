import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Rotas públicas com `:competitionId`: competição NÃO publicada só é visível
 * para o admin autenticado. Para o público responde 404 (não revela que existe).
 */
@Injectable()
export class CompetitionVisibilityGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req.user) return true; // admin autenticado

    const competitionId: string | undefined = req.params?.competitionId;
    if (!competitionId) return true;
    if (!UUID_RE.test(competitionId)) throw new NotFoundException('Competição não encontrada.');

    const rows = await this.dataSource.query(
      `SELECT 1 FROM competitions WHERE id = $1 AND is_published = true`,
      [competitionId],
    );
    if (rows.length === 0) throw new NotFoundException('Competição não encontrada.');
    return true;
  }
}

/** Use em GETs públicos de `competitions/:competitionId/...`. */
export const PublicCompetition = () =>
  applyDecorators(UseGuards(OptionalJwtAuthGuard, CompetitionVisibilityGuard));
