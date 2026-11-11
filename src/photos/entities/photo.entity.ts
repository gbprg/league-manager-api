import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  type Relation,
} from 'typeorm';
import type { PhotoAlbum } from './photo-album.entity.js';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'album_id', type: 'uuid' })
  album_id: string;

  @Column({ type: 'text' })
  image_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  caption: string | null;

  @ManyToOne('PhotoAlbum', 'photos', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'album_id' })
  album: Relation<PhotoAlbum>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
