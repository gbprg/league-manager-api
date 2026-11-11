import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity.js';

export enum PlayerPosition {
  GOLEIRO = 'GOLEIRO',
  DEFESA = 'DEFESA',
  MEIO_CAMPO = 'MEIO_CAMPO',
  ATAQUE = 'ATAQUE',
}

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 180 })
  full_name: string;

  @Column({ type: 'date' })
  birth_date: string;

  @Column({ type: 'varchar', length: 50, nullable: true, select: false })
  document_number: string | null;

  @Column({ type: 'varchar', length: 30, default: PlayerPosition.MEIO_CAMPO })
  position: string;

  @Column({ type: 'text', nullable: true })
  photo_url: string | null;

  /** Equipe atual (elenco). Vale para os próximos torneios; a inscrição em cada competição é separada. */
  @Column({ type: 'uuid', nullable: true })
  team_id: string | null;

  /** Camisa padrão no elenco (usada ao inscrever na competição). */
  @Column({ type: 'int', nullable: true })
  shirt_number: number | null;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'team_id' })
  team: Team | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
