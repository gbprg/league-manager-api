import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { CompetitionPhase } from '../../phases/entities/competition-phase.entity.js';
import { CompetitionGroupTeam } from './competition-group-team.entity.js';

@Entity('competition_groups')
export class CompetitionGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  phase_id: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // String-based entity name avoids ESM circular import with emitDecoratorMetadata
  @ManyToOne('CompetitionPhase', 'groups', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phase_id' })
  phase: Relation<CompetitionPhase>;

  @OneToMany(() => CompetitionGroupTeam, (gt) => gt.group)
  group_teams: CompetitionGroupTeam[];
}
