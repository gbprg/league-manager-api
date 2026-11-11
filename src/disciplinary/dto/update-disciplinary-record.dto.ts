import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateDisciplinaryRecordDto {
  @IsOptional()
  @IsString()
  description?: string;
}

export class ServeGameDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  games_served?: number;
}
