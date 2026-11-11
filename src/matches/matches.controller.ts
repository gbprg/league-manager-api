import { PublicCompetition } from '../common/guards/competition-visibility.guard.js';
import { toPage, toLimit } from '../common/interfaces/paginated.interface.js';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Optional,
} from '@nestjs/common';
import { MatchesService } from './matches.service.js';
import { CreateMatchDto } from './dto/create-match.dto.js';
import { UpdateMatchDto } from './dto/update-match.dto.js';
import { GenerateMatchesDto } from './dto/generate-matches.dto.js';
import { ScheduleMatchesDto } from './dto/schedule-matches.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller()
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Post('competitions/:competitionId/matches')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: CreateMatchDto,
  ) {
    return this.service.create(competitionId, dto);
  }

  @Get('competitions/:competitionId/matches')
  @PublicCompetition()
  findAll(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Query('phase_id') phaseId?: string,
    @Query('group_id') groupId?: string,
    @Query('round_number') roundNumber?: string,
    @Query('status') status?: string,
    @Query('team_id') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      competitionId,
      {
        phase_id: phaseId,
        group_id: groupId,
        round_number: roundNumber ? parseInt(roundNumber) : undefined,
        status,
        team_id: teamId,
      },
      toPage(page),
      toLimit(limit),
    );
  }

  /** Equipes que participam (ou participarão) da fase, com o motivo se ainda não dá para definir. */
  @Get('competitions/:competitionId/phases/:phaseId/participants')
  @UseGuards(JwtAuthGuard)
  participants(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
  ) {
    return this.service.getParticipants(competitionId, phaseId);
  }

  /** Define data/hora e/ou local de várias partidas de uma vez. */
  @Patch('competitions/:competitionId/matches/schedule')
  @UseGuards(JwtAuthGuard)
  schedule(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: ScheduleMatchesDto,
  ) {
    return this.service.scheduleMatches(competitionId, dto);
  }

  @Get('matches/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch('matches/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMatchDto) {
    return this.service.update(id, dto);
  }

  @Delete('matches/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post('competitions/:competitionId/matches/generate')
  @UseGuards(JwtAuthGuard)
  generate(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: GenerateMatchesDto,
  ) {
    return this.service.generateMatches(competitionId, dto);
  }
}
