import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity.js';
import { Team } from '../../teams/entities/team.entity.js';
import type { MatchPlayer } from './match-player.entity.js';

export enum EventType {
  GOAL = 'GOAL',
  OWN_GOAL = 'OWN_GOAL',
  RED_CARD = 'RED_CARD',
  YELLOW_CARD = 'YELLOW_CARD',
  PENALTY_MISS = 'PENALTY_MISS',
}

@Entity('match_events')
export class MatchEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  match_id: string;

  @Column({ type: 'uuid', nullable: true })
  match_player_id: string | null;

  @Column({ type: 'uuid' })
  team_id: string;

  @Column({ type: 'varchar', length: 30 })
  event_type: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  // String-based to avoid ESM circular import with match-player.entity.ts
  @ManyToOne('MatchPlayer', 'events', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'match_player_id' })
  match_player: Relation<MatchPlayer> | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
