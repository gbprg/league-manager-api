import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CompetitionTeam, TeamRegistrationStatus } from './entities/competition-team.entity.js';
import { CompetitionPlayer, PlayerRegistrationStatus } from './entities/competition-player.entity.js';
import { EnrollTeamDto } from './dto/enroll-team.dto.js';
import { EnrollPlayerDto } from './dto/enroll-player.dto.js';
import { CompetitionsService } from '../competitions/competitions.service.js';
import { TeamsService } from '../teams/teams.service.js';
import { PlayersService } from '../players/players.service.js';
import { paginate, type PaginatedResult } from '../common/interfaces/paginated.interface.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(CompetitionTeam)
    private readonly ctRepo: Repository<CompetitionTeam>,
    @InjectRepository(CompetitionPlayer)
    private readonly cpRepo: Repository<CompetitionPlayer>,
    private readonly competitionsService: CompetitionsService,
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
  ) {}

  // ─── Teams ───────────────────────────────────────────────────────────────

  /**
   * Adiciona a equipe à competição como PENDENTE. Ela só passa a participar
   * (ATIVA) depois que tiver jogador aprovado — ver activateTeam().
   */
  async enrollTeam(competitionId: string, dto: EnrollTeamDto): Promise<CompetitionTeam> {
    await this.competitionsService.findOne(competitionId);
    await this.teamsService.findOne(dto.team_id);

    const existing = await this.ctRepo.findOne({
      where: { competition_id: competitionId, team_id: dto.team_id },
    });

    if (existing) {
      if (existing.registration_status !== TeamRegistrationStatus.REMOVIDA) {
        throw new ConflictException('Equipe já adicionada a esta competição.');
      }
      // Re-adiciona equipe removida anteriormente (jogadores já inscritos são mantidos)
      existing.registration_status = TeamRegistrationStatus.PENDENTE;
      const saved = await this.ctRepo.save(existing);
      await this.syncRoster(competitionId, dto.team_id);
      return saved;
    }

    const enrollment = this.ctRepo.create({
      competition_id: competitionId,
      team_id: dto.team_id,
      registration_status: TeamRegistrationStatus.PENDENTE,
    });
    const saved = await this.ctRepo.save(enrollment);
    // O elenco da equipe já entra como PENDENTE: só falta aprovar
    await this.syncRoster(competitionId, dto.team_id);
    return saved;
  }

  /**
   * Inscreve (como PENDENTE) os jogadores do elenco que ainda não estão na competição.
   * Ignora quem já está inscrito aqui (por esta ou por outra equipe).
   */
  async syncRoster(competitionId: string, teamId: string): Promise<{ enrolled: number }> {
    const [roster, existing] = await Promise.all([
      this.playersService.findByTeam(teamId),
      this.cpRepo.find({ where: { competition_id: competitionId } }),
    ]);
    const already = new Set(existing.map((e) => e.player_id));
    const toEnroll = roster.filter((p) => !already.has(p.id));

    if (toEnroll.length > 0) {
      await this.cpRepo.save(
        toEnroll.map((p) =>
          this.cpRepo.create({
            competition_id: competitionId,
            team_id: teamId,
            player_id: p.id,
            shirt_number: p.shirt_number ?? null,
            registration_status: PlayerRegistrationStatus.PENDENTE,
          }),
        ),
      );
    }
    return { enrolled: toEnroll.length };
  }

  /** Endpoint: inscreve o elenco que ainda não está na competição (ex.: atleta adicionado depois). */
  async syncTeamRoster(competitionId: string, teamId: string): Promise<{ enrolled: number }> {
    const enrollment = await this.ctRepo.findOne({
      where: {
        competition_id: competitionId,
        team_id: teamId,
        registration_status: In([TeamRegistrationStatus.PENDENTE, TeamRegistrationStatus.ATIVA]),
      },
    });
    if (!enrollment) throw new NotFoundException('Equipe não adicionada a esta competição.');
    return this.syncRoster(competitionId, teamId);
  }

  /** Inscreve a equipe no torneio: exige ao menos um jogador aprovado. */
  async activateTeam(competitionId: string, teamId: string): Promise<CompetitionTeam> {
    const competition = await this.competitionsService.findOne(competitionId);
    const enrollment = await this.ctRepo.findOne({
      where: { competition_id: competitionId, team_id: teamId },
      relations: { team: true },
    });
    if (!enrollment || enrollment.registration_status === TeamRegistrationStatus.REMOVIDA) {
      throw new NotFoundException('Equipe não adicionada a esta competição.');
    }
    if (enrollment.registration_status === TeamRegistrationStatus.ATIVA) {
      throw new ConflictException('Equipe já inscrita no torneio.');
    }

    const approved = await this.cpRepo.count({
      where: {
        competition_id: competitionId,
        team_id: teamId,
        registration_status: PlayerRegistrationStatus.APROVADA,
      },
    });
    if (approved === 0) {
      throw new BadRequestException(
        'A equipe precisa de ao menos um jogador aprovado para ser inscrita no torneio.',
      );
    }

    if (competition.max_teams) {
      const activeCount = await this.ctRepo.count({
        where: { competition_id: competitionId, registration_status: TeamRegistrationStatus.ATIVA },
      });
      if (activeCount >= competition.max_teams) {
        throw new BadRequestException(
          `Limite de ${competition.max_teams} equipes atingido para esta competição.`,
        );
      }
    }

    enrollment.registration_status = TeamRegistrationStatus.ATIVA;
    return this.ctRepo.save(enrollment);
  }

  async listTeams(
    competitionId: string,
    filters: { search?: string; status?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<CompetitionTeam>> {
    const qb = this.ctRepo
      .createQueryBuilder('ct')
      .leftJoinAndSelect('ct.team', 't')
      .where('ct.competition_id = :competitionId', { competitionId })
      .orderBy('t.name', 'ASC');

    // Public view: only active teams. Admin can pass status to override.
    // Aceita lista separada por vírgula (ex.: "ATIVA,PENDENTE").
    const statuses = (filters.status ?? TeamRegistrationStatus.ATIVA)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    qb.andWhere('ct.registration_status IN (:...statuses)', { statuses });

    if (filters.search) {
      qb.andWhere('unaccent(t.name) ILIKE unaccent(:search)', { search: `%${filters.search}%` });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async removeTeam(competitionId: string, teamId: string): Promise<void> {
    const enrollment = await this.ctRepo.findOne({
      where: { competition_id: competitionId, team_id: teamId },
    });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada.');

    // Equipe com partidas não pode sair: os jogos, a classificação e a súmula ficariam órfãos
    const [{ count }] = await this.ctRepo.manager.query(
      `SELECT count(*)::int AS count FROM matches
        WHERE competition_id = $1 AND (home_team_id = $2 OR away_team_id = $2)`,
      [competitionId, teamId],
    );
    if (count > 0) {
      throw new ConflictException(
        `A equipe tem ${count} partida(s) nesta competição. Exclua as partidas antes de removê-la.`,
      );
    }

    // Libera a vaga nos grupos
    await this.ctRepo.manager.query(
      `DELETE FROM competition_group_teams WHERE competition_team_id = $1`,
      [enrollment.id],
    );
    enrollment.registration_status = TeamRegistrationStatus.REMOVIDA;
    await this.ctRepo.save(enrollment);
  }

  // ─── Players ─────────────────────────────────────────────────────────────

  async enrollPlayer(competitionId: string, dto: EnrollPlayerDto): Promise<CompetitionPlayer> {
    await this.competitionsService.findOne(competitionId);
    await this.teamsService.findOne(dto.team_id);
    const player = await this.playersService.findOne(dto.player_id);

    // Quem pertence ao elenco de outra equipe precisa ser transferido antes
    if (player.team_id && player.team_id !== dto.team_id) {
      throw new ConflictException(
        `O jogador pertence ao elenco de "${player.team?.name ?? 'outra equipe'}". Transfira-o para esta equipe no cadastro antes de inscrevê-lo.`,
      );
    }

    // Team must be enrolled in competition
    const teamEnrollment = await this.ctRepo.findOne({
      where: {
        competition_id: competitionId,
        team_id: dto.team_id,
        registration_status: In([TeamRegistrationStatus.PENDENTE, TeamRegistrationStatus.ATIVA]),
      },
    });
    if (!teamEnrollment) {
      throw new BadRequestException('A equipe informada não foi adicionada a esta competição.');
    }

    // Player cannot be in two teams in the same competition
    const existingPlayer = await this.cpRepo.findOne({
      where: { competition_id: competitionId, player_id: dto.player_id },
    });
    if (existingPlayer) {
      const sameTeam = existingPlayer.team_id === dto.team_id;
      throw new ConflictException(
        sameTeam
          ? 'Jogador já inscrito nesta equipe.'
          : 'Jogador já inscrito nesta competição por outra equipe. Remova a inscrição anterior para inscrevê-lo aqui.',
      );
    }

    const enrollment = this.cpRepo.create({
      competition_id: competitionId,
      team_id: dto.team_id,
      player_id: dto.player_id,
      shirt_number: dto.shirt_number ?? player.shirt_number ?? null,
      registration_status: PlayerRegistrationStatus.PENDENTE,
    });
    return this.cpRepo.save(enrollment);
  }

  async listPlayers(
    competitionId: string,
    filters: { team_id?: string; status?: string; search?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<CompetitionPlayer>> {
    const qb = this.cpRepo
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.player', 'p')
      .leftJoinAndSelect('cp.team', 't')
      .where('cp.competition_id = :competitionId', { competitionId })
      .orderBy('t.name', 'ASC')
      .addOrderBy('p.full_name', 'ASC');

    if (filters.team_id) {
      qb.andWhere('cp.team_id = :team_id', { team_id: filters.team_id });
    }
    if (filters.status) {
      qb.andWhere('cp.registration_status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('unaccent(p.full_name) ILIKE unaccent(:search)', { search: `%${filters.search}%` });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async approvePlayer(id: string): Promise<CompetitionPlayer> {
    const enrollment = await this.cpRepo.findOne({ where: { id }, relations: { player: true, team: true } });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada.');

    enrollment.registration_status = PlayerRegistrationStatus.APROVADA;
    enrollment.approved_at = new Date();
    return this.cpRepo.save(enrollment);
  }

  /**
   * Remove a inscrição de um jogador (ex.: inscrito na equipe errada).
   * Bloqueada se o jogador já foi relacionado em alguma súmula ou tem registro disciplinar.
   */
  async removePlayerEnrollment(id: string): Promise<void> {
    const enrollment = await this.cpRepo.findOne({ where: { id } });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada.');

    const [{ in_match }] = await this.cpRepo.manager.query(
      `SELECT count(*)::int AS in_match FROM match_players WHERE competition_player_id = $1`,
      [id],
    );
    const [{ records }] = await this.cpRepo.manager.query(
      `SELECT count(*)::int AS records FROM disciplinary_records WHERE competition_player_id = $1`,
      [id],
    );
    if (in_match > 0 || records > 0) {
      throw new ConflictException(
        'O jogador já tem súmula ou registro disciplinar nesta competição. Rejeite a inscrição em vez de remover.',
      );
    }

    await this.assertTeamKeepsApprovedPlayer(enrollment);
    await this.cpRepo.remove(enrollment);
  }

  /** Equipe inscrita no torneio precisa manter ao menos um jogador aprovado. */
  private async assertTeamKeepsApprovedPlayer(enrollment: CompetitionPlayer): Promise<void> {
    if (enrollment.registration_status !== PlayerRegistrationStatus.APROVADA) return;
    const team = await this.ctRepo.findOne({
      where: {
        competition_id: enrollment.competition_id,
        team_id: enrollment.team_id,
        registration_status: TeamRegistrationStatus.ATIVA,
      },
    });
    if (!team) return;
    const approved = await this.cpRepo.count({
      where: {
        competition_id: enrollment.competition_id,
        team_id: enrollment.team_id,
        registration_status: PlayerRegistrationStatus.APROVADA,
      },
    });
    if (approved <= 1) {
      throw new BadRequestException(
        'A equipe inscrita no torneio precisa manter ao menos um jogador aprovado.',
      );
    }
  }

  /** Aprova de uma vez todos os jogadores PENDENTES da equipe na competição. */
  async approveAllPlayers(competitionId: string, teamId: string): Promise<{ approved: number }> {
    const result = await this.cpRepo.update(
      {
        competition_id: competitionId,
        team_id: teamId,
        registration_status: PlayerRegistrationStatus.PENDENTE,
      },
      { registration_status: PlayerRegistrationStatus.APROVADA, approved_at: new Date() },
    );
    return { approved: result.affected ?? 0 };
  }

  async rejectPlayer(id: string): Promise<CompetitionPlayer> {
    const enrollment = await this.cpRepo.findOne({ where: { id }, relations: { player: true, team: true } });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada.');

    // Equipe inscrita no torneio não pode ficar sem jogador aprovado
    if (enrollment.registration_status === PlayerRegistrationStatus.APROVADA) {
      const team = await this.ctRepo.findOne({
        where: {
          competition_id: enrollment.competition_id,
          team_id: enrollment.team_id,
          registration_status: TeamRegistrationStatus.ATIVA,
        },
      });
      if (team) {
        const approved = await this.cpRepo.count({
          where: {
            competition_id: enrollment.competition_id,
            team_id: enrollment.team_id,
            registration_status: PlayerRegistrationStatus.APROVADA,
          },
        });
        if (approved <= 1) {
          throw new BadRequestException(
            'A equipe inscrita no torneio precisa manter ao menos um jogador aprovado.',
          );
        }
      }
    }

    enrollment.registration_status = PlayerRegistrationStatus.REJEITADA;
    enrollment.approved_at = null;
    return this.cpRepo.save(enrollment);
  }
}
