import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { DisciplinaryRecord } from './disciplinary-record.entity.js';
import type { Relation } from 'typeorm';

@Entity('disciplinary_suspensions')
export class DisciplinarySuspension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'record_id', type: 'uuid' })
  record_id: string;

  @Column({ name: 'games_total', type: 'int', default: 1 })
  games_total: number;

  @Column({ name: 'games_served', type: 'int', default: 0 })
  games_served: number;

  @OneToOne('DisciplinaryRecord', 'suspension', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'record_id' })
  record: Relation<DisciplinaryRecord>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
