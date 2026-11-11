import { IsUUID } from 'class-validator';

export class EnrollTeamDto {
  @IsUUID()
  team_id: string;
}
