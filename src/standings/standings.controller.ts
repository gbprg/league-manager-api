import { PublicCompetition } from '../common/guards/competition-visibility.guard.js';
import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { StandingsService } from './standings.service.js';

@Controller()
export class StandingsController {
  constructor(private readonly service: StandingsService) {}

  @Get('competitions/:competitionId/standings')
  @PublicCompetition()
  getStandings(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Query('group_id') groupId?: string,
    @Query('phase_id') phaseId?: string,
  ) {
    return this.service.getStandings(competitionId, groupId, phaseId);
  }

  @Get('competitions/:competitionId/top-scorers')
  @PublicCompetition()
  getTopScorers(@Param('competitionId', ParseUUIDPipe) competitionId: string) {
    return this.service.getTopScorers(competitionId);
  }

  @Get('competitions/:competitionId/goalkeepers')
  @PublicCompetition()
  getGoalkeepers(@Param('competitionId', ParseUUIDPipe) competitionId: string) {
    return this.service.getGoalkeepers(competitionId);
  }

  @Get('competitions/:competitionId/red-cards')
  @PublicCompetition()
  getRedCards(@Param('competitionId', ParseUUIDPipe) competitionId: string) {
    return this.service.getRedCards(competitionId);
  }

  @Get('competitions/:competitionId/statistics')
  @PublicCompetition()
  getStatistics(@Param('competitionId', ParseUUIDPipe) competitionId: string) {
    return this.service.getStatistics(competitionId);
  }
}
