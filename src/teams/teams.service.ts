import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { validateImageUpload, deleteUploadedFile, discardUpload } from '../common/upload.utils.js';
import { paginate, type PaginatedResult } from '../common/interfaces/paginated.interface.js';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly repo: Repository<Team>,
  ) {}

  async create(dto: CreateTeamDto): Promise<Team> {
    const team = this.repo.create(dto);
    return this.repo.save(team);
  }

  async findAll(
    filters: { search?: string; city?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Team>> {
    const qb = this.repo.createQueryBuilder('t').orderBy('t.name', 'ASC');

    if (filters.search) {
      qb.andWhere('unaccent(t.name) ILIKE unaccent(:search)', { search: `%${filters.search}%` });
    }
    if (filters.city) {
      qb.andWhere('unaccent(t.city) ILIKE unaccent(:city)', { city: `%${filters.city}%` });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.repo.findOne({ where: { id } });
    if (!team) throw new NotFoundException('Equipe não encontrada.');
    return team;
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);

    Object.assign(team, dto);
    return this.repo.save(team);
  }

  async uploadLogo(id: string, file: Express.Multer.File): Promise<Team> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    try {
      validateImageUpload(file);
      const team = await this.findOne(id);
      const previous = team.logo_url;
      team.logo_url = `/uploads/${file.filename}`;
      const saved = await this.repo.save(team);
      await deleteUploadedFile(previous);
      return saved;
    } catch (err) {
      await discardUpload(file);
      throw err;
    }
  }

  async removeLogo(id: string): Promise<Team> {
    const team = await this.findOne(id);
    await deleteUploadedFile(team.logo_url);
    team.logo_url = null;
    return this.repo.save(team);
  }

  async remove(id: string): Promise<void> {
    const team = await this.findOne(id);
    const [{ enrolled, matches }] = await this.repo.manager.query(
      `SELECT
         (SELECT count(*)::int FROM competition_teams WHERE team_id = $1) AS enrolled,
         (SELECT count(*)::int FROM matches WHERE home_team_id = $1 OR away_team_id = $1) AS matches`,
      [id],
    );
    if (enrolled > 0 || matches > 0) {
      throw new ConflictException(
        'A equipe está inscrita em competições ou tem partidas e não pode ser excluída.',
      );
    }
    await this.repo.remove(team);
    await deleteUploadedFile(team.logo_url); // só apaga o arquivo depois do registro
  }
}
