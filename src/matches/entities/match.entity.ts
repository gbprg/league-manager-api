import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Competition } from '../../competitions/entities/competition.entity.js';
import { CompetitionPhase } from '../../phases/entities/competition-phase.entity.js';
import { CompetitionGroup } from '../../groups/entities/competition-group.entity.js';
import { Team } from '../../teams/entities/team.entity.js';

export enum MatchStatus {
  AGENDADA = 'AGENDADA',
  FINALIZADA = 'FINALIZADA',
  ADIADA = 'ADIADA',
  CANCELADA = 'CANCELADA',
  WO = 'WO',
}

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  competition_id: string;

  @Column({ type: 'uuid' })
  phase_id: string;

  @Column({ type: 'uuid', nullable: true })
  group_id: string | null;

  @Column({ type: 'uuid' })
  home_team_id: string;

  @Column({ type: 'uuid' })
  away_team_id: string;

  @Column({ type: 'int', nullable: true })
  round_number: number | null;

  @Column({ type: 'uuid', nullable: true })
  tie_id: string | null;

  @Column({ type: 'int', default: 1 })
  leg_number: number;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string | null;

  @Column({ type: 'int', nullable: true })
  home_score: number | null;

  @Column({ type: 'int', nullable: true })
  away_score: number | null;

  /** Disputa de pênaltis (só mata-mata decidido nos pênaltis; não conta como gols). */
  @Column({ type: 'int', nullable: true })
  home_penalty_score: number | null;

  @Column({ type: 'int', nullable: true })
  away_penalty_score: number | null;

  @Column({ type: 'varchar', length: 30, default: MatchStatus.AGENDADA })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ─── Relations ────────────────────────────────────────────────────────

  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @ManyToOne(() => CompetitionPhase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phase_id' })
  phase: CompetitionPhase;

  @ManyToOne(() => CompetitionGroup, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: CompetitionGroup | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'home_team_id' })
  home_team: Team;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'away_team_id' })
  away_team: Team;
}
