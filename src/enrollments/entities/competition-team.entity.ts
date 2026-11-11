import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Competition } from '../../competitions/entities/competition.entity.js';
import { Team } from '../../teams/entities/team.entity.js';

export enum TeamRegistrationStatus {
  /** Equipe adicionada, aguardando aprovação dos jogadores. Ainda não participa do torneio. */
  PENDENTE = 'PENDENTE',
  ATIVA = 'ATIVA',
  REMOVIDA = 'REMOVIDA',
}

@Entity('competition_teams')
export class CompetitionTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  competition_id: string;

  @Column({ type: 'uuid' })
  team_id: string;

  @Column({ type: 'varchar', length: 30, default: TeamRegistrationStatus.ATIVA })
  registration_status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  registered_at: Date;

  @ManyToOne(() => Competition, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
