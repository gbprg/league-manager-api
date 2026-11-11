import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class WalkoverDto {
  /** Equipe que venceu por W.O. (a outra não compareceu). */
  @IsUUID()
  winner_team_id: string;

  /** Gols atribuídos ao vencedor (padrão 3 × 0). */
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  winner_goals?: number;
}
