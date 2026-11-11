import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { RecordType } from '../entities/disciplinary-record.entity.js';

export class CreateDisciplinaryRecordDto {
  @IsUUID()
  competition_player_id: string;

  @IsOptional()
  @IsUUID()
  match_id?: string;

  @IsEnum(RecordType)
  record_type: RecordType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  games_total?: number;
}
