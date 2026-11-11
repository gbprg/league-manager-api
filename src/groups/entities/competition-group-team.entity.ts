import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { CompetitionGroup } from './competition-group.entity.js';
import { CompetitionTeam } from '../../enrollments/entities/competition-team.entity.js';

@Entity('competition_group_teams')
export class CompetitionGroupTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  group_id: string;

  @Column({ type: 'uuid' })
  competition_team_id: string;

  // Use string-based entity name to avoid ESM circular import with emitDecoratorMetadata
  @ManyToOne('CompetitionGroup', 'group_teams', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Relation<CompetitionGroup>;

  @ManyToOne(() => CompetitionTeam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_team_id' })
  competition_team: CompetitionTeam;
}
