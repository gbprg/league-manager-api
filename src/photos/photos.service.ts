import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhotoAlbum } from './entities/photo-album.entity.js';
import { Photo } from './entities/photo.entity.js';
import { CreateAlbumDto, UpdateAlbumDto } from './dto/create-album.dto.js';
import { validateImageUpload, deleteUploadedFile, discardUpload } from '../common/upload.utils.js';
import { paginate, type PaginatedResult } from '../common/interfaces/paginated.interface.js';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(PhotoAlbum)
    private readonly albums: Repository<PhotoAlbum>,
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
  ) {}

  validateUpload(file: Express.Multer.File) {
    validateImageUpload(file);
  }

  // ─── Albums ─────────────────────────────────────────────────────────────

  async createAlbum(competitionId: string, dto: CreateAlbumDto): Promise<PhotoAlbum> {
    const album = this.albums.create({
      competition_id: competitionId,
      title: dto.title,
      description: dto.description ?? null,
    });
    return this.albums.save(album);
  }

  async findAlbums(
    competitionId: string,
    filters: { search?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<PhotoAlbum>> {
    const qb = this.albums
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.photos', 'photos')
      .where('a.competition_id = :competitionId', { competitionId })
      .orderBy('a.created_at', 'DESC');

    if (filters.search) {
      qb.andWhere('unaccent(a.title) ILIKE unaccent(:search)', { search: `%${filters.search}%` });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findAlbum(id: string): Promise<PhotoAlbum> {
    const album = await this.albums.findOne({
      where: { id },
      relations: { photos: true },
    });
    if (!album) throw new NotFoundException('Álbum não encontrado');
    return album;
  }

  async updateAlbum(id: string, dto: UpdateAlbumDto): Promise<PhotoAlbum> {
    const album = await this.findAlbum(id);
    Object.assign(album, dto);
    return this.albums.save(album);
  }

  async removeAlbum(id: string): Promise<void> {
    const album = await this.findAlbum(id);
    await this.albums.remove(album);
    // Arquivos só são apagados depois que o banco confirmou a exclusão
    for (const photo of album.photos) {
      await this.deleteFile(photo.image_url);
    }
  }

  // ─── Photos ─────────────────────────────────────────────────────────────

  async addPhoto(
    albumId: string,
    file: Express.Multer.File,
    caption?: string,
  ): Promise<Photo> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    try {
      await this.findAlbum(albumId); // validates album exists
      this.validateUpload(file);

      const image_url = `/uploads/${file.filename}`;
      const photo = this.photos.create({ album_id: albumId, image_url, caption: caption ?? null });
      return await this.photos.save(photo);
    } catch (err) {
      await discardUpload(file);
      throw err;
    }
  }

  async removePhoto(id: string): Promise<void> {
    const photo = await this.photos.findOne({ where: { id } });
    if (!photo) throw new NotFoundException('Foto não encontrada');
    await this.deleteFile(photo.image_url);
    await this.photos.remove(photo);
  }

  private async deleteFile(imageUrl: string): Promise<void> {
    await deleteUploadedFile(imageUrl);
  }
}
