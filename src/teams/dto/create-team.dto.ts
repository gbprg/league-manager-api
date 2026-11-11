import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { Trim } from '../../common/validators/trim.transform.js';

export class CreateTeamDto {
  @Trim()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  manager_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
