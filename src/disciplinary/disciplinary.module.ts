import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinaryRecord } from './entities/disciplinary-record.entity.js';
import { DisciplinarySuspension } from './entities/disciplinary-suspension.entity.js';
import { DisciplinaryService } from './disciplinary.service.js';
import { DisciplinaryController } from './disciplinary.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([DisciplinaryRecord, DisciplinarySuspension])],
  controllers: [DisciplinaryController],
  providers: [DisciplinaryService],
})
export class DisciplinaryModule {}
