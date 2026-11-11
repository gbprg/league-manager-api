import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoAlbum } from './entities/photo-album.entity.js';
import { Photo } from './entities/photo.entity.js';
import { PhotosService } from './photos.service.js';
import { PhotosController } from './photos.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([PhotoAlbum, Photo])],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
