import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CompetitionStatus {
  PLANEJADA = 'PLANEJADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

export enum CompetitionFormat {
  FASE_DE_GRUPOS = 'FASE_DE_GRUPOS',
  MATA_MATA = 'MATA_MATA',
  GRUPOS_MATA_MATA = 'GRUPOS_MATA_MATA',
  PONTOS_CORRIDOS = 'PONTOS_CORRIDOS',
  ELIMINATORIA_SIMPLES = 'ELIMINATORIA_SIMPLES',
  ELIMINATORIA_IDA_VOLTA = 'ELIMINATORIA_IDA_VOLTA',
}

@Entity('competitions')
export class Competition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  logo_url: string | null;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  location: string;

  @Column({ type: 'text', nullable: true })
  regulation: string | null;

  @Column({ type: 'int', nullable: true })
  max_teams: number | null;

  @Column({ type: 'varchar', length: 100, default: '' })
  category: string;

  @Column({ type: 'varchar', length: 50, default: CompetitionFormat.PONTOS_CORRIDOS })
  format: string;

  @Column({ type: 'varchar', length: 30, default: CompetitionStatus.PLANEJADA })
  status: string;

  @Column({ type: 'int', default: 3 })
  points_win: number;

  @Column({ type: 'int', default: 1 })
  points_draw: number;

  @Column({ type: 'int', default: 0 })
  points_loss: number;

  @Column({ type: 'boolean', default: false })
  is_published: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
