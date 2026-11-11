import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';

export class EnrollPlayerDto {
  @IsUUID()
  player_id: string;

  @IsUUID()
  team_id: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  shirt_number?: number;
}
