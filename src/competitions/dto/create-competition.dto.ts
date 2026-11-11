import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { IsCalendarDate } from '../../common/validators/dates.validator.js';
import { Trim } from '../../common/validators/trim.transform.js';
import { CompetitionFormat, CompetitionStatus } from '../entities/competition.entity.js';

export class CreateCompetitionDto {
  @Trim()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsCalendarDate()
  start_date: string;

  @IsCalendarDate()
  end_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  regulation?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  max_teams?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(CompetitionFormat)
  format?: CompetitionFormat;

  @IsOptional()
  @IsEnum(CompetitionStatus)
  status?: CompetitionStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  points_win?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  points_draw?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  points_loss?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
