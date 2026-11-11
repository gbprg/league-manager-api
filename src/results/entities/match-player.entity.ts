import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity.js';
import { CompetitionPlayer } from '../../enrollments/entities/competition-player.entity.js';
import type { MatchEvent } from './match-event.entity.js';

@Entity('match_players')
export class MatchPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  match_id: string;

  @Column({ type: 'uuid' })
  competition_player_id: string;

  @Column({ type: 'boolean', default: true })
  is_starter: boolean;

  @Column({ type: 'boolean', default: false })
  is_goalkeeper: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @ManyToOne(() => CompetitionPlayer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_player_id' })
  competition_player: CompetitionPlayer;

  @OneToMany('MatchEvent', 'match_player')
  events: MatchEvent[];
}
