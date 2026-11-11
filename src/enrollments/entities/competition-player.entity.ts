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
import { Team } from '../../teams/entities/team.entity.js';
import { Player } from '../../players/entities/player.entity.js';

export enum PlayerRegistrationStatus {
  PENDENTE = 'PENDENTE',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
}

@Entity('competition_players')
export class CompetitionPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  competition_id: string;

  @Column({ type: 'uuid' })
  team_id: string;

  @Column({ type: 'uuid' })
  player_id: string;

  @Column({ type: 'varchar', length: 30, default: PlayerRegistrationStatus.PENDENTE })
  registration_status: string;

  @Column({ type: 'int', nullable: true })
  shirt_number: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Competition, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_id' })
  player: Player;
}
