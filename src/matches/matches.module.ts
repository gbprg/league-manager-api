import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity.js';
import { CompetitionTeam } from '../enrollments/entities/competition-team.entity.js';
import { CompetitionPhase } from '../phases/entities/competition-phase.entity.js';
import { CompetitionGroup } from '../groups/entities/competition-group.entity.js';
import { CompetitionGroupTeam } from '../groups/entities/competition-group-team.entity.js';
import { MatchesService } from './matches.service.js';
import { MatchesController } from './matches.controller.js';
import { CompetitionsModule } from '../competitions/competitions.module.js';
import { StandingsModule } from '../standings/standings.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      CompetitionTeam,
      CompetitionPhase,
      CompetitionGroup,
      CompetitionGroupTeam,
    ]),
    CompetitionsModule,
    StandingsModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
