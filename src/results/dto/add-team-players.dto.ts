import { IsUUID } from 'class-validator';

export class AddTeamPlayersDto {
  @IsUUID()
  team_id: string;
}
