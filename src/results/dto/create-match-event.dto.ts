import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { EventType } from '../entities/match-event.entity.js';

export class CreateMatchEventDto {
  @IsUUID()
  @IsOptional()
  match_player_id?: string;

  @IsUUID()
  team_id: string;

  @IsEnum(EventType)
  event_type: EventType;

  @IsString()
  @IsOptional()
  description?: string;
}
