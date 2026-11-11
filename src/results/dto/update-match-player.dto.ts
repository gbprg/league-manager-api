import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMatchPlayerDto {
  @IsBoolean()
  @IsOptional()
  is_starter?: boolean;

  @IsBoolean()
  @IsOptional()
  is_goalkeeper?: boolean;
}
