import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsNotEmpty, IsUUID, IsInt, Min, Max, MaxLength } from 'class-validator';
import { IsBirthDate } from '../../common/validators/dates.validator.js';
import { Trim } from '../../common/validators/trim.transform.js';
import { IsCpf, onlyDigits } from '../../common/validators/is-cpf.validator.js';
import { PlayerPosition } from '../entities/player.entity.js';

export class CreatePlayerDto {
  @Trim()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  @MaxLength(180)
  full_name: string;

  @IsBirthDate()
  birth_date: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? onlyDigits(value) : value))
  @IsString()
  @IsCpf()
  document_number?: string;

  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  /** Equipe do elenco. `null` remove o jogador do elenco. */
  @IsOptional()
  @IsUUID()
  team_id?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  shirt_number?: number | null;
}
