import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AutoGroupsDto {
  /** Quantidade de grupos (Grupo A, Grupo B, ...). */
  @IsInt()
  @Min(1)
  @Max(26)
  groups_count: number;

  /** Sorteia as equipes entre os grupos (padrão: sim). Sem sorteio, segue a ordem das inscrições. */
  @IsBoolean()
  @IsOptional()
  shuffle?: boolean;
}
