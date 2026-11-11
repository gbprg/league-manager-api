import { IsUUID } from 'class-validator';

export class AddGroupTeamDto {
  @IsUUID()
  competition_team_id: string;
}
