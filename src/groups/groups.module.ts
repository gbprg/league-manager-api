import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionGroup } from './entities/competition-group.entity.js';
import { CompetitionGroupTeam } from './entities/competition-group-team.entity.js';
import { CompetitionTeam } from '../enrollments/entities/competition-team.entity.js';
import { GroupsService } from './groups.service.js';
import { GroupsController } from './groups.controller.js';
import { PhasesModule } from '../phases/phases.module.js';
import { MatchesModule } from '../matches/matches.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionGroup, CompetitionGroupTeam, CompetitionTeam]),
    PhasesModule,
    MatchesModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
