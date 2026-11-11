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
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service.js';
import { EnrollTeamDto } from './dto/enroll-team.dto.js';
import { EnrollPlayerDto } from './dto/enroll-player.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller()
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  // ─── Teams ────────────────────────────────────────────────────────────────

  @Post('competitions/:competitionId/teams')
  @UseGuards(JwtAuthGuard)
  enrollTeam(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: EnrollTeamDto,
  ) {
    return this.service.enrollTeam(competitionId, dto);
  }

  @Get('competitions/:competitionId/teams')
  @PublicCompetition()
  listTeams(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listTeams(
      competitionId,
      { search, status },
      toPage(page),
      toLimit(limit),
    );
  }

  /** Inscreve a equipe no torneio (exige jogador aprovado). */
  @Post('competitions/:competitionId/teams/:teamId/activate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  activateTeam(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.service.activateTeam(competitionId, teamId);
  }

  /** Inscreve o elenco da equipe que ainda não está na competição. */
  @Post('competitions/:competitionId/teams/:teamId/players/sync-roster')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  syncRoster(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.service.syncTeamRoster(competitionId, teamId);
  }

  /** Aprova todos os jogadores pendentes da equipe. */
  @Patch('competitions/:competitionId/teams/:teamId/players/approve-all')
  @UseGuards(JwtAuthGuard)
  approveAllPlayers(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.service.approveAllPlayers(competitionId, teamId);
  }

  @Delete('competitions/:competitionId/teams/:teamId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTeam(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.service.removeTeam(competitionId, teamId);
  }

  // ─── Players ─────────────────────────────────────────────────────────────

  @Post('competitions/:competitionId/players')
  @UseGuards(JwtAuthGuard)
  enrollPlayer(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: EnrollPlayerDto,
  ) {
    return this.service.enrollPlayer(competitionId, dto);
  }

  @Get('competitions/:competitionId/players')
  @PublicCompetition()
  listPlayers(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Query('team_id') teamId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listPlayers(
      competitionId,
      { team_id: teamId, status, search },
      toPage(page),
      toLimit(limit),
    );
  }

  @Patch('competition-players/:id/approve')
  @UseGuards(JwtAuthGuard)
  approvePlayer(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.approvePlayer(id);
  }

  @Delete('competition-players/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlayer(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removePlayerEnrollment(id);
  }

  @Patch('competition-players/:id/reject')
  @UseGuards(JwtAuthGuard)
  rejectPlayer(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.rejectPlayer(id);
  }
}
