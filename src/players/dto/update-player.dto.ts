import { PartialType } from '@nestjs/mapped-types';
import { CreatePlayerDto } from './create-player.dto.js';

export class UpdatePlayerDto extends PartialType(CreatePlayerDto) {}
