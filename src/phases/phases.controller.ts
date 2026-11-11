import { PublicCompetition } from '../common/guards/competition-visibility.guard.js';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PhasesService } from './phases.service.js';
import { CreatePhaseDto } from './dto/create-phase.dto.js';
import { UpdatePhaseDto } from './dto/update-phase.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { IsArray, IsUUID } from 'class-validator';

class ReorderDto {
  @IsArray()
  @IsUUID('all', { each: true })
  ids: string[];
}

class SetRuleDto {
  rule_value: Record<string, unknown>;
}

@Controller()
export class PhasesController {
  constructor(private readonly service: PhasesService) {}

  @Post('competitions/:competitionId/phases')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: CreatePhaseDto,
  ) {
    return this.service.create(competitionId, dto);
  }

  @Get('competitions/:competitionId/phases')
  @PublicCompetition()
  findAll(@Param('competitionId', ParseUUIDPipe) competitionId: string) {
    return this.service.findAll(competitionId);
  }

  @Get('phases/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch('phases/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePhaseDto) {
    return this.service.update(id, dto);
  }

  @Delete('phases/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Patch('competitions/:competitionId/phases/reorder')
  @UseGuards(JwtAuthGuard)
  reorder(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.service.reorderPhases(competitionId, dto.ids);
  }

  // ─── Rules ─────────────────────────────────────────────────────────────

  @Get('competitions/:competitionId/rules')
  @PublicCompetition()
  getRules(@Param('competitionId', ParseUUIDPipe) competitionId: string) {
    return this.service.getRules(competitionId);
  }

  @Patch('competitions/:competitionId/rules/:ruleType')
  @UseGuards(JwtAuthGuard)
  setRule(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Param('ruleType') ruleType: string,
    @Body() dto: SetRuleDto,
  ) {
    return this.service.setRule(competitionId, ruleType, dto.rule_value);
  }
}
