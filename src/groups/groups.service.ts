import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetitionGroup } from './entities/competition-group.entity.js';
import { CompetitionGroupTeam } from './entities/competition-group-team.entity.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { AddGroupTeamDto } from './dto/add-group-team.dto.js';
import { PhasesService } from '../phases/phases.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { AutoGroupsDto } from './dto/auto-groups.dto.js';
import { CompetitionTeam, TeamRegistrationStatus } from '../enrollments/entities/competition-team.entity.js';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(CompetitionGroup)
    private readonly groupRepo: Repository<CompetitionGroup>,
    @InjectRepository(CompetitionGroupTeam)
    private readonly gtRepo: Repository<CompetitionGroupTeam>,
    @InjectRepository(CompetitionTeam)
    private readonly ctRepo: Repository<CompetitionTeam>,
    private readonly phasesService: PhasesService,
    private readonly matchesService: MatchesService,
  ) {}

  async create(phaseId: string, dto: CreateGroupDto): Promise<CompetitionGroup> {
    await this.phasesService.findOne(phaseId);
    const group = this.groupRepo.create({ phase_id: phaseId, name: dto.name });
    return this.groupRepo.save(group);
  }

  /**
   * Monta os grupos de uma vez: cria `groups_count` grupos e distribui as equipes que
   * participam da fase (todas as inscritas na 1ª fase; as classificadas nas seguintes).
   */
  async autoCreate(phaseId: string, dto: AutoGroupsDto): Promise<CompetitionGroup[]> {
    const phase = await this.phasesService.findOne(phaseId);
    if (phase.phase_type !== 'GROUP') {
      throw new BadRequestException('Só fases de grupos podem ter grupos.');
    }
    if (phase.groups.length > 0) {
      throw new ConflictException('A fase já tem grupos. Exclua-os para montar de novo.');
    }

    const { teamIds } = await this.matchesService.getQualifiedTeams(phase.competition_id, phase);
    if (teamIds.length < dto.groups_count * 2) {
      throw new BadRequestException(
        `${teamIds.length} equipe(s) para ${dto.groups_count} grupo(s): cada grupo precisa de pelo menos 2 equipes.`,
      );
    }

    const cts = await this.ctRepo.find({
      where: { competition_id: phase.competition_id, registration_status: TeamRegistrationStatus.ATIVA },
    });
    const ctByTeam = new Map(cts.map((ct) => [ct.team_id, ct.id]));
    let order = teamIds.filter((id) => ctByTeam.has(id));
    if (dto.shuffle !== false) {
      order = [...order];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }

    // Distribui em "serpentina" para os grupos ficarem equilibrados em tamanho
    const groups: CompetitionGroup[] = [];
    for (let g = 0; g < dto.groups_count; g++) {
      groups.push(
        await this.groupRepo.save(
          this.groupRepo.create({ phase_id: phaseId, name: `Grupo ${String.fromCharCode(65 + g)}` }),
        ),
      );
    }
    const links = order.map((teamId, i) =>
      this.gtRepo.create({
        group_id: groups[i % groups.length].id,
        competition_team_id: ctByTeam.get(teamId)!,
      }),
    );
    await this.gtRepo.save(links);
    return this.findAll(phaseId);
  }

  async findAll(phaseId: string): Promise<CompetitionGroup[]> {
    return this.groupRepo.find({
      where: { phase_id: phaseId },
      relations: { group_teams: { competition_team: { team: true } } },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CompetitionGroup> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: { group_teams: { competition_team: { team: true } } },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado.');
    return group;
  }

  async update(id: string, dto: UpdateGroupDto): Promise<CompetitionGroup> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Grupo não encontrado.');
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Grupo não encontrado.');
    await this.groupRepo.remove(group);
  }

  // ─── Group teams ─────────────────────────────────────────────────────────

  async addTeam(groupId: string, dto: AddGroupTeamDto): Promise<CompetitionGroupTeam> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: { phase: true },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado.');

    // Verify competition_team exists and belongs to same competition
    const ct = await this.ctRepo.findOne({
      where: { id: dto.competition_team_id, registration_status: TeamRegistrationStatus.ATIVA },
    });
    if (!ct) throw new NotFoundException('Inscrição de equipe não encontrada ou inativa.');

    if (ct.competition_id !== group.phase.competition_id) {
      throw new BadRequestException('A equipe não pertence à competição desta fase.');
    }

    // A team cannot be in two groups of the same phase
    const existingInPhase = await this.gtRepo
      .createQueryBuilder('gt')
      .innerJoin('competition_groups', 'g', 'g.id = gt.group_id')
      .where('g.phase_id = :phaseId', { phaseId: group.phase_id })
      .andWhere('gt.competition_team_id = :ctId', { ctId: dto.competition_team_id })
      .getOne();

    if (existingInPhase) {
      throw new ConflictException('Esta equipe já está em outro grupo desta fase.');
    }

    // Duplicate in same group
    const existingInGroup = await this.gtRepo.findOne({
      where: { group_id: groupId, competition_team_id: dto.competition_team_id },
    });
    if (existingInGroup) throw new ConflictException('Equipe já está neste grupo.');

    const gt = this.gtRepo.create({
      group_id: groupId,
      competition_team_id: dto.competition_team_id,
    });
    return this.gtRepo.save(gt);
  }

  async removeTeam(groupId: string, competitionTeamId: string): Promise<void> {
    const gt = await this.gtRepo.findOne({
      where: { group_id: groupId, competition_team_id: competitionTeamId },
    });
    if (!gt) throw new NotFoundException('Equipe não encontrada neste grupo.');
    await this.gtRepo.remove(gt);
  }
}
