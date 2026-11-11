import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity.js';
import { MatchEvent } from '../results/entities/match-event.entity.js';
import { MatchPlayer } from '../results/entities/match-player.entity.js';
import { CompetitionPlayer } from '../enrollments/entities/competition-player.entity.js';
import { Competition } from '../competitions/entities/competition.entity.js';
import { CompetitionRule } from '../phases/entities/competition-rule.entity.js';
import { CompetitionGroup } from '../groups/entities/competition-group.entity.js';
import { CompetitionGroupTeam } from '../groups/entities/competition-group-team.entity.js';
import { StandingsService } from './standings.service.js';
import { StandingsController } from './standings.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      MatchEvent,
      MatchPlayer,
      CompetitionPlayer,
      Competition,
      CompetitionRule,
      CompetitionGroup,
      CompetitionGroupTeam,
    ]),
  ],
  controllers: [StandingsController],
  providers: [StandingsService],
  exports: [StandingsService],
})
export class StandingsModule {}
