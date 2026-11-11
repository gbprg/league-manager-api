import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchPlayer } from './entities/match-player.entity.js';
import { MatchEvent } from './entities/match-event.entity.js';
import { Match } from '../matches/entities/match.entity.js';
import { CompetitionPlayer } from '../enrollments/entities/competition-player.entity.js';
import { ResultsService } from './results.service.js';
import { ResultsController } from './results.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchPlayer, MatchEvent, Match, CompetitionPlayer]),
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
