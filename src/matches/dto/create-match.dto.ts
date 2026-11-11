import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { MatchStatus } from '../entities/match.entity.js';

export class CreateMatchDto {
  @IsUUID()
  phase_id: string;

  @IsUUID()
  @IsOptional()
  group_id?: string;

  @IsUUID()
  home_team_id: string;

  @IsUUID()
  away_team_id: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  round_number?: number;

  @IsUUID()
  @IsOptional()
  tie_id?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  leg_number?: number;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  location?: string;
}
