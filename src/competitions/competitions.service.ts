import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from './entities/competition.entity.js';
import { CreateCompetitionDto } from './dto/create-competition.dto.js';
import { UpdateCompetitionDto } from './dto/update-competition.dto.js';
import { validateImageUpload, deleteUploadedFile, discardUpload } from '../common/upload.utils.js';
import { paginate, type PaginatedResult } from '../common/interfaces/paginated.interface.js';

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectRepository(Competition)
    private readonly repo: Repository<Competition>,
  ) {}

  async create(dto: CreateCompetitionDto): Promise<Competition> {
    if (dto.start_date && dto.end_date && dto.start_date > dto.end_date) {
      throw new BadRequestException('A data de início não pode ser posterior à data de término.');
    }

    const competition = this.repo.create(dto);
    return this.repo.save(competition);
  }

  async findAll(
    onlyPublished = false,
    filters: { search?: string; status?: string; category?: string; format?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Competition>> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.start_date', 'DESC');

    if (onlyPublished) qb.andWhere('c.is_published = true');
    if (filters.search) {
      qb.andWhere('unaccent(c.name) ILIKE unaccent(:search)', { search: `%${filters.search}%` });
    }
    if (filters.status) qb.andWhere('c.status = :status', { status: filters.status });
    if (filters.category) {
      qb.andWhere('unaccent(c.category) ILIKE unaccent(:category)', { category: `%${filters.category}%` });
    }
    if (filters.format) qb.andWhere('c.format = :format', { format: filters.format });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, onlyPublished = false): Promise<Competition> {
    const where = onlyPublished ? { id, is_published: true } : { id };
    const competition = await this.repo.findOne({ where });
    if (!competition) throw new NotFoundException('Competição não encontrada.');
    return competition;
  }

  async update(id: string, dto: UpdateCompetitionDto): Promise<Competition> {
    const competition = await this.findOne(id);

    const startDate = dto.start_date ?? competition.start_date;
    const endDate = dto.end_date ?? competition.end_date;
    if (startDate > endDate) {
      throw new BadRequestException('A data de início não pode ser posterior à data de término.');
    }

    Object.assign(competition, dto);
    return this.repo.save(competition);
  }

  async publish(id: string): Promise<Competition> {
    const competition = await this.findOne(id);
    competition.is_published = true;
    return this.repo.save(competition);
  }

  async unpublish(id: string): Promise<Competition> {
    const competition = await this.findOne(id);
    competition.is_published = false;
    return this.repo.save(competition);
  }

  async uploadLogo(id: string, file: Express.Multer.File): Promise<Competition> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    try {
      validateImageUpload(file);
      const competition = await this.findOne(id);
      const previous = competition.logo_url;
      competition.logo_url = `/uploads/${file.filename}`;
      const saved = await this.repo.save(competition);
      await deleteUploadedFile(previous);
      return saved;
    } catch (err) {
      await discardUpload(file);
      throw err;
    }
  }

  async removeLogo(id: string): Promise<Competition> {
    const competition = await this.findOne(id);
    await deleteUploadedFile(competition.logo_url);
    competition.logo_url = null;
    return this.repo.save(competition);
  }

  async remove(id: string): Promise<void> {
    const competition = await this.findOne(id);
    const photos: { image_url: string }[] = await this.repo.manager.query(
      `SELECT p.image_url FROM photos p
         JOIN photo_albums a ON a.id = p.album_id
        WHERE a.competition_id = $1`,
      [id],
    );

    // Inscrições têm FK RESTRICT; o resto (fases, jogos, súmulas, disciplina, álbuns) cai em cascata.
    await this.repo.manager.transaction(async (em) => {
      await em.query(`DELETE FROM competition_players WHERE competition_id = $1`, [id]);
      await em.query(`DELETE FROM competition_teams WHERE competition_id = $1`, [id]);
      await em.delete(Competition, { id });
    });

    // Arquivos só são apagados depois que o banco confirmou a exclusão
    await deleteUploadedFile(competition.logo_url);
    for (const p of photos) await deleteUploadedFile(p.image_url);
  }
}
