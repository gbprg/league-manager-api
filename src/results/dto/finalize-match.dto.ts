import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class FinalizeMatchDto {
  @IsInt()
  @Min(0)
  home_score: number;

  @IsInt()
  @Min(0)
  away_score: number;

  /** Pênaltis (mata-mata empatado). Devem ser informados os dois e não podem empatar. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  home_penalty_score?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  away_penalty_score?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  override_home_score?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  override_away_score?: number;
}
