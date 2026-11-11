import { IsUUID, IsOptional, IsDateString, IsString, MaxLength } from 'class-validator';

export class GenerateMatchesDto {
  @IsUUID()
  phase_id: string;

  @IsUUID()
  @IsOptional()
  group_id?: string;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  location?: string;
}
