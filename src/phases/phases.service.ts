import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetitionPhase } from './entities/competition-phase.entity.js';
import { CompetitionRule } from './entities/competition-rule.entity.js';
import { CreatePhaseDto } from './dto/create-phase.dto.js';
import { UpdatePhaseDto } from './dto/update-phase.dto.js';
import { CompetitionsService } from '../competitions/competitions.service.js';

@Injectable()
export class PhasesService {
  constructor(
    @InjectRepository(CompetitionPhase)
    private readonly phaseRepo: Repository<CompetitionPhase>,
    @InjectRepository(CompetitionRule)
    private readonly ruleRepo: Repository<CompetitionRule>,
    private readonly competitionsService: CompetitionsService,
  ) {}

  async create(competitionId: string, dto: CreatePhaseDto): Promise<CompetitionPhase> {
    await this.competitionsService.findOne(competitionId);

    // Auto-assign sequence if not provided
    if (!dto.sequence) {
      const last = await this.phaseRepo.findOne({
        where: { competition_id: competitionId },
        order: { sequence: 'DESC' },
      });
      dto.sequence = last ? last.sequence + 1 : 1;
    }

    // Suíço: jogo único e eliminação por derrotas (padrão 2)
    if (dto.phase_type === 'SWISS') {
      dto.legs = 1;
      dto.max_losses = dto.max_losses ?? 2;
    }

    const phase = this.phaseRepo.create({ ...dto, competition_id: competitionId });
    return this.phaseRepo.save(phase);
  }

  async findAll(competitionId: string): Promise<CompetitionPhase[]> {
    return this.phaseRepo.find({
      where: { competition_id: competitionId },
      relations: { groups: { group_teams: { competition_team: { team: true } } } },
      order: { sequence: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CompetitionPhase> {
    const phase = await this.phaseRepo.findOne({
      where: { id },
      relations: { groups: { group_teams: { competition_team: { team: true } } } },
    });
    if (!phase) throw new NotFoundException('Fase não encontrada.');
    return phase;
  }

  async update(id: string, dto: UpdatePhaseDto): Promise<CompetitionPhase> {
    const phase = await this.findOne(id);
    Object.assign(phase, dto);
    return this.phaseRepo.save(phase);
  }

  async remove(id: string): Promise<void> {
    const phase = await this.phaseRepo.findOne({ where: { id } });
    if (!phase) throw new NotFoundException('Fase não encontrada.');
    await this.phaseRepo.remove(phase);
  }

  // ─── Rules ───────────────────────────────────────────────────────────────

  async setRule(
    competitionId: string,
    ruleType: string,
    value: Record<string, unknown>,
  ): Promise<CompetitionRule> {
    await this.competitionsService.findOne(competitionId);

    const existing = await this.ruleRepo.findOne({
      where: { competition_id: competitionId, rule_type: ruleType },
    });

    if (existing) {
      existing.rule_value = value;
      return this.ruleRepo.save(existing);
    }

    const rule = this.ruleRepo.create({
      competition_id: competitionId,
      rule_type: ruleType,
      rule_value: value,
    });
    return this.ruleRepo.save(rule);
  }

  async getRules(competitionId: string): Promise<CompetitionRule[]> {
    return this.ruleRepo.find({ where: { competition_id: competitionId } });
  }

  async reorderPhases(competitionId: string, orderedIds: string[]): Promise<CompetitionPhase[]> {
    await this.competitionsService.findOne(competitionId);

    const phases = await this.phaseRepo.find({ where: { competition_id: competitionId } });
    const phaseMap = new Map(phases.map((p) => [p.id, p]));

    if (orderedIds.length !== phases.length) {
      throw new BadRequestException('O número de IDs não corresponde ao número de fases.');
    }

    const updated: CompetitionPhase[] = [];
    for (let i = 0; i < orderedIds.length; i++) {
      const phase = phaseMap.get(orderedIds[i]);
      if (!phase) throw new BadRequestException(`Fase ${orderedIds[i]} não pertence a esta competição.`);
      phase.sequence = i + 1;
      updated.push(phase);
    }

    return this.phaseRepo.save(updated);
  }
}
