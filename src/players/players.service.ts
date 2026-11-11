import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity.js';
import { CreatePlayerDto } from './dto/create-player.dto.js';
import { UpdatePlayerDto } from './dto/update-player.dto.js';
import { validateImageUpload, deleteUploadedFile, discardUpload } from '../common/upload.utils.js';
import { paginate, type PaginatedResult } from '../common/interfaces/paginated.interface.js';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly repo: Repository<Player>,
  ) {}

  private async assertTeamExists(teamId?: string | null): Promise<void> {
    if (!teamId) return;
    const rows = await this.repo.manager.query(`SELECT 1 FROM teams WHERE id = $1`, [teamId]);
    if (rows.length === 0) throw new BadRequestException('Equipe não encontrada.');
  }

  async create(dto: CreatePlayerDto): Promise<Player> {
    await this.assertTeamExists(dto.team_id);
    const saved = await this.repo.save(this.repo.create(dto));
    return this.findOne(saved.id); // re-lê sem document_number
  }

  async findAll(
    filters: { search?: string; position?: string; team_id?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Player>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.team', 'team')
      .orderBy('p.full_name', 'ASC');

    if (filters.search) {
      qb.andWhere('unaccent(p.full_name) ILIKE unaccent(:search)', { search: `%${filters.search}%` });
    }
    if (filters.position) {
      qb.andWhere('p.position = :position', { position: filters.position });
    }

    // team_id=none lista os jogadores sem equipe; senão filtra pelo elenco da equipe
    if (filters.team_id === 'none') {
      qb.andWhere('p.team_id IS NULL');
    } else if (filters.team_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.team_id)) {
        throw new BadRequestException('team_id inválido.');
      }
      qb.andWhere('p.team_id = :teamId', { teamId: filters.team_id });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  /** Admin version — includes document_number */
  async findOneAdmin(id: string): Promise<Player> {
    const player = await this.repo.findOne({
      where: { id },
      select: {
        id: true,
        full_name: true,
        birth_date: true,
        document_number: true,
        position: true,
        photo_url: true,
        team_id: true,
        shirt_number: true,
        created_at: true,
        updated_at: true,
      },
      relations: { team: true },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado.');
    return player;
  }

  /** Public version — omits document_number */
  async findOne(id: string): Promise<Player> {
    const player = await this.repo.findOne({ where: { id }, relations: { team: true } });
    if (!player) throw new NotFoundException('Jogador não encontrado.');
    return player;
  }

  /** Elenco da equipe. */
  async findByTeam(teamId: string): Promise<Player[]> {
    return this.repo.find({ where: { team_id: teamId }, order: { full_name: 'ASC' } });
  }

  async update(id: string, dto: UpdatePlayerDto): Promise<Player> {
    const player = await this.findOneAdmin(id);
    if (dto.team_id !== undefined) await this.assertTeamExists(dto.team_id);
    Object.assign(player, dto);
    // `team` carregado pela relação sobrescreveria o team_id na gravação
    (player as { team?: unknown }).team = undefined;
    await this.repo.save(player);
    return this.findOne(id); // nunca devolve document_number
  }

  async remove(id: string): Promise<void> {
    const player = await this.findOne(id);
    const [{ count }] = await this.repo.manager.query(
      `SELECT count(*)::int AS count FROM competition_players WHERE player_id = $1`,
      [id],
    );
    if (count > 0) {
      throw new ConflictException(
        `O jogador está inscrito em ${count} competição(ões). Remova as inscrições antes de excluí-lo.`,
      );
    }
    await this.repo.remove(player);
    await deleteUploadedFile(player.photo_url); // só apaga o arquivo depois do registro
  }

  async uploadPhoto(id: string, file: Express.Multer.File): Promise<Player> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    try {
      validateImageUpload(file);
      const player = await this.findOneAdmin(id);
      const previous = player.photo_url;
      player.photo_url = `/uploads/${file.filename}`;
      await this.repo.save(player);
      await deleteUploadedFile(previous);
      return this.findOne(id); // sem document_number
    } catch (err) {
      await discardUpload(file);
      throw err;
    }
  }

  async removePhoto(id: string): Promise<Player> {
    const player = await this.findOneAdmin(id);
    await deleteUploadedFile(player.photo_url);
    player.photo_url = null;
    return this.repo.save(player);
  }
}
