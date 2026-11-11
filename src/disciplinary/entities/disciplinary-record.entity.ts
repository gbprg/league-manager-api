import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Competition } from '../../competitions/entities/competition.entity.js';
import { CompetitionPlayer } from '../../enrollments/entities/competition-player.entity.js';
import { Match } from '../../matches/entities/match.entity.js';
import type { DisciplinarySuspension } from './disciplinary-suspension.entity.js';
import type { Relation } from 'typeorm';

export enum RecordType {
  ADVERTENCIA = 'ADVERTENCIA',
  MULTA = 'MULTA',
  SUSPENSAO = 'SUSPENSAO',
}

@Entity('disciplinary_records')
export class DisciplinaryRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competition_id: string;

  @Column({ name: 'competition_player_id', type: 'uuid' })
  competition_player_id: string;

  @Column({ name: 'match_id', type: 'uuid', nullable: true })
  match_id: string | null;

  @Column({ type: 'enum', enum: RecordType })
  record_type: RecordType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @ManyToOne(() => CompetitionPlayer, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'competition_player_id' })
  competition_player: CompetitionPlayer;

  @ManyToOne(() => Match, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'match_id' })
  match: Match | null;

  @OneToOne('DisciplinarySuspension', 'record', { cascade: true })
  suspension: Relation<DisciplinarySuspension> | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
