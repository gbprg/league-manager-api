import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class AddMatchPlayerDto {
  @IsUUID()
  competition_player_id: string;

  @IsBoolean()
  @IsOptional()
  is_starter?: boolean;

  @IsBoolean()
  @IsOptional()
  is_goalkeeper?: boolean;
}
