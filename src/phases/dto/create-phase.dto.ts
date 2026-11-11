import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { PhaseType } from '../entities/competition-phase.entity.js';

export class CreatePhaseDto {
  @IsOptional()
  @IsEnum(PhaseType)
  phase_type?: PhaseType;

  @IsOptional()
  @IsInt()
  @Min(1)
  sequence?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  qualification_count?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  legs?: number;

  /** Só para fase SWISS: derrotas que eliminam a equipe (1–5; padrão 2). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  max_losses?: number;
}
