import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionPhase } from './entities/competition-phase.entity.js';
import { CompetitionRule } from './entities/competition-rule.entity.js';
import { PhasesService } from './phases.service.js';
import { PhasesController } from './phases.controller.js';
import { CompetitionsModule } from '../competitions/competitions.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionPhase, CompetitionRule]),
    CompetitionsModule,
  ],
  controllers: [PhasesController],
  providers: [PhasesService],
  exports: [PhasesService],
})
export class PhasesModule {}
