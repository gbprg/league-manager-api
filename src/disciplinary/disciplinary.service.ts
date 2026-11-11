import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryRecord, RecordType } from './entities/disciplinary-record.entity.js';
import { DisciplinarySuspension } from './entities/disciplinary-suspension.entity.js';
import { CreateDisciplinaryRecordDto } from './dto/create-disciplinary-record.dto.js';
import { UpdateDisciplinaryRecordDto } from './dto/update-disciplinary-record.dto.js';
import { paginate, type PaginatedResult } from '../common/interfaces/paginated.interface.js';

@Injectable()
export class DisciplinaryService {
  constructor(
    @InjectRepository(DisciplinaryRecord)
    private readonly records: Repository<DisciplinaryRecord>,
    @InjectRepository(DisciplinarySuspension)
    private readonly suspensions: Repository<DisciplinarySuspension>,
  ) {}

  async create(competitionId: string, dto: CreateDisciplinaryRecordDto): Promise<DisciplinaryRecord> {
    if (dto.record_type === RecordType.SUSPENSAO && !dto.games_total) {
      throw new BadRequestException('games_total é obrigatório para suspensões');
    }
    if (dto.record_type !== RecordType.SUSPENSAO && dto.games_total) {
      throw new BadRequestException('games_total só se aplica a suspensões');
    }

    const record = this.records.create({
      competition_id: competitionId,
      competition_player_id: dto.competition_player_id,
      match_id: dto.match_id ?? null,
      record_type: dto.record_type,
      description: dto.description ?? null,
    });

    const saved = await this.records.save(record);

    if (dto.record_type === RecordType.SUSPENSAO) {
      const suspension = this.suspensions.create({
        record_id: saved.id,
        games_total: dto.games_total!,
        games_served: 0,
      });
      await this.suspensions.save(suspension);
    }

    return this.findOne(saved.id);
  }

  async findAll(
    competitionId: string,
    filters: { record_type?: string; team_id?: string; player_id?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<DisciplinaryRecord>> {
    const qb = this.records
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.competition_player', 'cp')
      .leftJoinAndSelect('cp.player', 'p')
      .leftJoinAndSelect('cp.team', 't')
      .leftJoinAndSelect('r.match', 'match')
      .leftJoinAndSelect('r.suspension', 'suspension')
      .where('r.competition_id = :competitionId', { competitionId })
      .orderBy('r.created_at', 'DESC');

    if (filters.record_type) {
      qb.andWhere('r.record_type = :record_type', { record_type: filters.record_type });
    }
    if (filters.team_id) {
      qb.andWhere('cp.team_id = :team_id', { team_id: filters.team_id });
    }
    if (filters.player_id) {
      qb.andWhere('cp.player_id = :player_id', { player_id: filters.player_id });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: string): Promise<DisciplinaryRecord> {
    const record = await this.records.findOne({
      where: { id },
      relations: {
        competition_player: { player: true, team: true },
        match: true,
        suspension: true,
      },
    });
    if (!record) throw new NotFoundException('Registro disciplinar não encontrado');
    return record;
  }

  async update(id: string, dto: UpdateDisciplinaryRecordDto): Promise<DisciplinaryRecord> {
    const record = await this.findOne(id);
    Object.assign(record, dto);
    await this.records.save(record);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findOne(id);
    await this.records.remove(record);
  }

  async serveGame(suspensionId: string): Promise<DisciplinarySuspension> {
    const suspension = await this.suspensions.findOne({
      where: { id: suspensionId },
    });
    if (!suspension) throw new NotFoundException('Suspensão não encontrada');
    if (suspension.games_served >= suspension.games_total) {
      throw new BadRequestException('Suspensão já cumprida integralmente');
    }
    suspension.games_served += 1;
    return this.suspensions.save(suspension);
  }

  async unserveGame(suspensionId: string): Promise<DisciplinarySuspension> {
    const suspension = await this.suspensions.findOne({
      where: { id: suspensionId },
    });
    if (!suspension) throw new NotFoundException('Suspensão não encontrada');
    if (suspension.games_served <= 0) {
      throw new BadRequestException('Nenhum jogo registrado para desfazer');
    }
    suspension.games_served -= 1;
    return this.suspensions.save(suspension);
  }

  async getActiveSuspensions(competitionId: string): Promise<DisciplinaryRecord[]> {
    const records = await this.records
      .createQueryBuilder('r')
      .innerJoin('disciplinary_suspensions', 's', 's.record_id = r.id')
      .innerJoinAndSelect('r.competition_player', 'cp')
      .innerJoinAndSelect('cp.player', 'p')
      .innerJoinAndSelect('cp.team', 't')
      .innerJoinAndSelect('r.suspension', 'suspension')
      .where('r.competition_id = :competitionId', { competitionId })
      .andWhere('s.games_served < s.games_total')
      .orderBy('t.name', 'ASC')
      .addOrderBy('p.full_name', 'ASC')
      .getMany();

    return records;
  }
}
