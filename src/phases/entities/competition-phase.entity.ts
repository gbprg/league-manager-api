import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Competition } from '../../competitions/entities/competition.entity.js';
import type { CompetitionGroup } from '../../groups/entities/competition-group.entity.js';

export enum PhaseType {
  GROUP = 'GROUP',
  KNOCKOUT = 'KNOCKOUT',
  LEAGUE = 'LEAGUE',
  /** Suíço com eliminação por derrotas: a cada rodada se enfrentam equipes com campanha parecida. */
  SWISS = 'SWISS',
}

@Entity('competition_phases')
export class CompetitionPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  competition_id: string;

  @Column({ type: 'varchar', length: 30, default: PhaseType.GROUP })
  phase_type: string;

  @Column({ type: 'int', default: 1 })
  sequence: number;

  @Column({ type: 'int', nullable: true })
  qualification_count: number | null;

  @Column({ type: 'int', default: 1 })
  legs: number;

  /** Só SWISS: número de derrotas que elimina a equipe (padrão 2). */
  @Column({ type: 'int', nullable: true })
  max_losses: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  // String-based entity name avoids ESM circular import with emitDecoratorMetadata
  @OneToMany('CompetitionGroup', 'phase')
  groups: CompetitionGroup[];
}
