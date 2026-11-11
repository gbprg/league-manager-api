import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAlbumDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAlbumDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
