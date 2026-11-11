import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionTeam } from './entities/competition-team.entity.js';
import { CompetitionPlayer } from './entities/competition-player.entity.js';
import { EnrollmentsService } from './enrollments.service.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { CompetitionsModule } from '../competitions/competitions.module.js';
import { TeamsModule } from '../teams/teams.module.js';
import { PlayersModule } from '../players/players.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionTeam, CompetitionPlayer]),
    CompetitionsModule,
    TeamsModule,
    PlayersModule,
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
})
export class EnrollmentsModule {}
