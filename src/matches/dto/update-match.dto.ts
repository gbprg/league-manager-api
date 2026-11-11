import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateMatchDto } from './create-match.dto.js';
import { MatchStatus } from '../entities/match.entity.js';

/**
 * Edição de dados da partida. Placar e encerramento (FINALIZADA/WO) NÃO passam por aqui:
 * use `POST /matches/:id/result`, `PATCH /matches/:id/result` e `POST /matches/:id/walkover`.
 */
export class UpdateMatchDto extends PartialType(CreateMatchDto) {
  @IsIn([MatchStatus.AGENDADA, MatchStatus.ADIADA, MatchStatus.CANCELADA])
  @IsOptional()
  status?: MatchStatus;
}
