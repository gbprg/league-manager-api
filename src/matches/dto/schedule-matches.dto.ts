import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';

/** Define data/hora e/ou local de várias partidas de uma vez. */
export class ScheduleMatchesDto {
  @IsUUID()
  phase_id: string;

  @IsUUID()
  @IsOptional()
  group_id?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  round_number?: number;

  /** Horário do 1º jogo (ISO). Os demais somam `interval_minutes` cada. */
  @IsDateString()
  @IsOptional()
  scheduled_at?: string;

  /** Intervalo entre jogos consecutivos; 0 ou ausente = mesmo horário. */
  @IsInt()
  @Min(0)
  @Max(600)
  @IsOptional()
  interval_minutes?: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  location?: string;
}
