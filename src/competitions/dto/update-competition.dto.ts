import { PartialType } from '@nestjs/mapped-types';
import { CreateCompetitionDto } from './create-competition.dto.js';

export class UpdateCompetitionDto extends PartialType(CreateCompetitionDto) {}
