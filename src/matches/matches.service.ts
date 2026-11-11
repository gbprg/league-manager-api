import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from './entities/match.entity.js';
import { paginate, type PaginatedResult } from '../common/interfaces/paginated.interface.js';
import { CreateMatchDto } from './dto/create-match.dto.js';
import { UpdateMatchDto } from './dto/update-match.dto.js';
import { GenerateMatchesDto } from './dto/generate-matches.dto.js';
import { ScheduleMatchesDto } from './dto/schedule-matches.dto.js';
import { CompetitionTeam, TeamRegistrationStatus } from '../enrollments/entities/competition-team.entity.js';
import { CompetitionPhase, PhaseType } from '../phases/entities/competition-phase.entity.js';
import { CompetitionGroup } from '../groups/entities/competition-group.entity.js';
import { CompetitionGroupTeam } from '../groups/entities/competition-group-team.entity.js';
import { CompetitionsService } from '../competitions/competitions.service.js';
import { StandingsService } from '../standings/standings.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(CompetitionTeam)
    private readonly ctRepo: Repository<CompetitionTeam>,
    @InjectRepository(CompetitionPhase)
    private readonly phaseRepo: Repository<CompetitionPhase>,
    @InjectRepository(CompetitionGroup)
    private readonly groupRepo: Repository<CompetitionGroup>,
    @InjectRepository(CompetitionGroupTeam)
    private readonly gtRepo: Repository<CompetitionGroupTeam>,
    private readonly competitionsService: CompetitionsService,
    private readonly standingsService: StandingsService,
  ) {}

  // ─── Validation helpers ───────────────────────────────────────────────

  private async assertTeamInCompetition(competitionId: string, teamId: string): Promise<void> {
    const ct = await this.ctRepo.findOne({
      where: {
        competition_id: competitionId,
        team_id: teamId,
        registration_status: TeamRegistrationStatus.ATIVA,
      },
    });
    if (!ct) {
      throw new BadRequestException(`Equipe ${teamId} não está inscrita ativamente nesta competição.`);
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────

  async create(competitionId: string, dto: CreateMatchDto): Promise<Match> {
    await this.competitionsService.findOne(competitionId);

    if (dto.home_team_id === dto.away_team_id) {
      throw new BadRequestException('Mandante e visitante devem ser equipes diferentes.');
    }

    await this.assertTeamInCompetition(competitionId, dto.home_team_id);
    await this.assertTeamInCompetition(competitionId, dto.away_team_id);

    // Verify phase belongs to competition
    const phase = await this.phaseRepo.findOne({ where: { id: dto.phase_id, competition_id: competitionId } });
    if (!phase) throw new BadRequestException('Fase não pertence a esta competição.');

    // If group provided, verify it belongs to phase
    if (dto.group_id) {
      const group = await this.groupRepo.findOne({ where: { id: dto.group_id, phase_id: dto.phase_id } });
      if (!group) throw new BadRequestException('Grupo não pertence a esta fase.');
    }

    const match = this.matchRepo.create({
      ...dto,
      competition_id: competitionId,
      leg_number: dto.leg_number ?? 1,
    });

    const saved = await this.matchRepo.save(match);
    return this.findOne(saved.id);
  }

  async findAll(
    competitionId: string,
    filters: {
      phase_id?: string;
      group_id?: string;
      round_number?: number;
      status?: string;
      team_id?: string;
    } = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Match>> {
    const qb = this.matchRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.phase', 'phase')
      .leftJoinAndSelect('m.group', 'grp')
      .leftJoinAndSelect('m.home_team', 'ht')
      .leftJoinAndSelect('m.away_team', 'at')
      .where('m.competition_id = :competitionId', { competitionId })
      .orderBy('m.scheduled_at', 'ASC', 'NULLS LAST')
      .addOrderBy('m.round_number', 'ASC', 'NULLS LAST')
      .addOrderBy('m.created_at', 'ASC');

    if (filters.phase_id) qb.andWhere('m.phase_id = :phase_id', { phase_id: filters.phase_id });
    if (filters.group_id) qb.andWhere('m.group_id = :group_id', { group_id: filters.group_id });
    if (filters.round_number) qb.andWhere('m.round_number = :round_number', { round_number: filters.round_number });
    if (filters.status) qb.andWhere('m.status = :status', { status: filters.status });
    if (filters.team_id) {
      qb.andWhere('(m.home_team_id = :team_id OR m.away_team_id = :team_id)', { team_id: filters.team_id });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: string): Promise<Match> {
    const match = await this.matchRepo.findOne({
      where: { id },
      relations: { phase: true, group: true, home_team: true, away_team: true },
    });
    if (!match) throw new NotFoundException('Partida não encontrada.');
    return match;
  }

  async update(id: string, dto: UpdateMatchDto): Promise<Match> {
    const match = await this.matchRepo.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Partida não encontrada.');

    // Partida encerrada só aceita ajuste de data/local; o resto muda pela correção de resultado
    if (match.status === MatchStatus.FINALIZADA || match.status === MatchStatus.WO) {
      const allowed = new Set(['scheduled_at', 'location']);
      const blocked = Object.entries(dto)
        .filter(([k, v]) => v !== undefined && !allowed.has(k))
        .map(([k]) => k);
      if (blocked.length > 0) {
        throw new BadRequestException(
          'Partida encerrada: só data e local podem ser editados. Use a correção de resultado para alterar o placar.',
        );
      }
    }

    if (dto.home_team_id || dto.away_team_id) {
      const homeId = dto.home_team_id ?? match.home_team_id;
      const awayId = dto.away_team_id ?? match.away_team_id;
      if (homeId === awayId) {
        throw new BadRequestException('Mandante e visitante devem ser equipes diferentes.');
      }
      if (dto.home_team_id) await this.assertTeamInCompetition(match.competition_id, dto.home_team_id);
      if (dto.away_team_id) await this.assertTeamInCompetition(match.competition_id, dto.away_team_id);
    }

    Object.assign(match, dto);
    const saved = await this.matchRepo.save(match);
    return this.findOne(saved.id);
  }

  /**
   * Define data/hora e/ou local de várias partidas de uma vez (ex.: uma rodada inteira).
   * Só altera partidas ainda não encerradas. Com `interval_minutes`, cada jogo
   * sai X minutos depois do anterior.
   */
  async scheduleMatches(competitionId: string, dto: ScheduleMatchesDto): Promise<{ updated: number }> {
    if (!dto.scheduled_at && dto.location === undefined) {
      throw new BadRequestException('Informe data/hora e/ou local.');
    }
    const qb = this.matchRepo
      .createQueryBuilder('m')
      .where('m.competition_id = :competitionId', { competitionId })
      .andWhere('m.phase_id = :phaseId', { phaseId: dto.phase_id })
      .andWhere('m.status IN (:...statuses)', {
        statuses: [MatchStatus.AGENDADA, MatchStatus.ADIADA],
      })
      .orderBy('m.created_at', 'ASC')
      .addOrderBy('m.id', 'ASC');
    if (dto.group_id) qb.andWhere('m.group_id = :groupId', { groupId: dto.group_id });
    if (dto.round_number) qb.andWhere('m.round_number = :round', { round: dto.round_number });

    const matches = await qb.getMany();
    const base = dto.scheduled_at ? new Date(dto.scheduled_at).getTime() : null;
    const step = (dto.interval_minutes ?? 0) * 60_000;

    matches.forEach((m, i) => {
      if (base !== null) m.scheduled_at = new Date(base + i * step);
      if (dto.location !== undefined) m.location = dto.location;
    });
    await this.matchRepo.save(matches);
    return { updated: matches.length };
  }

  async remove(id: string): Promise<void> {
    const match = await this.matchRepo.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Partida não encontrada.');

    if (match.status === MatchStatus.FINALIZADA) {
      throw new BadRequestException('Não é possível excluir uma partida finalizada.');
    }

    await this.matchRepo.remove(match);
  }

  // ─── Calendar generation ──────────────────────────────────────────────

  async generateMatches(competitionId: string, dto: GenerateMatchesDto): Promise<Match[]> {
    await this.competitionsService.findOne(competitionId);

    const phase = await this.phaseRepo.findOne({
      where: { id: dto.phase_id, competition_id: competitionId },
    });
    if (!phase) throw new BadRequestException('Fase não pertence a esta competição.');

    switch (phase.phase_type as PhaseType) {
      case PhaseType.GROUP:
        return this.generateGroupPhaseMatches(competitionId, phase, dto);
      case PhaseType.LEAGUE:
        return this.generateLeagueMatches(competitionId, phase, dto);
      case PhaseType.KNOCKOUT:
        return this.generateKnockoutRound(competitionId, phase, dto);
      case PhaseType.SWISS:
        return this.generateSwissRound(competitionId, phase, dto);
      default:
        throw new BadRequestException('Tipo de fase não suportado para geração automática.');
    }
  }

  // ─── Knockout ─────────────────────────────────────────────────────────

  /**
   * Mata-mata em chaveamento:
   *  - Sem jogos na fase: sorteia os confrontos da 1ª rodada entre os classificados da fase anterior
   *    (evitando, quando possível, enfrentar quem era do mesmo grupo).
   *  - Com jogos: exige a rodada atual encerrada e cruza os vencedores na ordem do chaveamento
   *    (vencedor do jogo 1 × vencedor do jogo 2, e assim por diante).
   * Ida e volta (legs = 2): o vencedor sai do agregado dos dois jogos.
   */
  private async generateKnockoutRound(
    competitionId: string,
    phase: CompetitionPhase,
    dto: GenerateMatchesDto,
  ): Promise<Match[]> {
    const existing = await this.matchRepo.find({
      where: { phase_id: phase.id },
      relations: { home_team: true, away_team: true },
      order: { created_at: 'ASC' },
    });

    if (existing.length === 0) {
      const { teamIds, groupOf } = await this.getQualifiedTeams(competitionId, phase);
      this.assertPowerOfTwo(teamIds.length, 'classificadas');
      const pairs = this.drawPairs(teamIds, groupOf);
      return this.createKnockoutRound(competitionId, phase, 1, pairs, dto);
    }

    const lastRound = Math.max(...existing.map((m) => m.round_number ?? 1));
    const roundMatches = existing.filter((m) => (m.round_number ?? 1) === lastRound);
    const winners = this.resolveWinners(roundMatches, phase.legs ?? 1, lastRound);

    if (winners.length < 2) {
      throw new BadRequestException('A fase eliminatória já tem um campeão definido.');
    }
    const pairs: [string, string][] = [];
    for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]);
    return this.createKnockoutRound(competitionId, phase, lastRound + 1, pairs, dto);
  }

  private assertPowerOfTwo(n: number, what: string): void {
    if (n < 2 || (n & (n - 1)) !== 0) {
      throw new BadRequestException(
        `Há ${n} equipes ${what}. O sorteio exige 2, 4, 8 ou 16 equipes (potência de 2).`,
      );
    }
  }

  /** Classificados da fase anterior (ou todas as equipes ativas, se não houver fase anterior). */
  async getQualifiedTeams(
    competitionId: string,
    phase: CompetitionPhase,
  ): Promise<{ teamIds: string[]; groupOf: Map<string, string>; fromPrevious: boolean }> {
    const groupOf = new Map<string, string>();

    const previous = await this.phaseRepo
      .createQueryBuilder('p')
      .where('p.competition_id = :competitionId', { competitionId })
      .andWhere('p.sequence < :seq', { seq: phase.sequence })
      .orderBy('p.sequence', 'DESC')
      .getOne();

    if (!previous) {
      const teamIds = await this.getPhaseTeamIds(competitionId, phase.id);
      return { teamIds, groupOf, fromPrevious: false };
    }
    if (previous.phase_type === PhaseType.KNOCKOUT || previous.phase_type === PhaseType.SWISS) {
      throw new BadRequestException(
        'A fase anterior é eliminatória/suíça e não define classificados por tabela. Use uma fase de grupos ou pontos corridos antes.',
      );
    }

    const prevMatches = await this.matchRepo.find({ where: { phase_id: previous.id } });
    if (prevMatches.length === 0) {
      throw new BadRequestException('Gere e finalize os jogos da fase anterior antes do sorteio.');
    }
    const open = prevMatches.filter(
      (m) =>
        m.status !== MatchStatus.FINALIZADA &&
        m.status !== MatchStatus.WO &&
        m.status !== MatchStatus.CANCELADA,
    );
    if (open.length > 0) {
      throw new BadRequestException(
        `A fase anterior ainda tem ${open.length} jogo(s) sem resultado.`,
      );
    }
    if (!previous.qualification_count) {
      throw new BadRequestException(
        'Defina o número de classificados na fase anterior (campo "Classificados").',
      );
    }
    const cut = previous.qualification_count;

    const teamIds: string[] = [];
    if (previous.phase_type === PhaseType.GROUP) {
      const groups = await this.groupRepo.find({ where: { phase_id: previous.id } });
      for (const group of groups) {
        const rows = (await this.standingsService.getStandings(competitionId, group.id)).sort(
          (a, b) => a.position - b.position,
        );
        for (const row of rows.slice(0, cut)) {
          teamIds.push(row.team_id);
          groupOf.set(row.team_id, group.id);
        }
      }
    } else {
      const rows = (
        await this.standingsService.getStandings(competitionId, undefined, previous.id)
      ).sort((a, b) => a.position - b.position);
      for (const row of rows.slice(0, cut)) teamIds.push(row.team_id);
    }
    return { teamIds, groupOf, fromPrevious: true };
  }

  /** Sorteio aleatório; tenta evitar confrontos entre equipes do mesmo grupo. */
  private drawPairs(teamIds: string[], groupOf: Map<string, string>): [string, string][] {
    const shuffle = (arr: string[]) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const toPairs = (arr: string[]): [string, string][] => {
      const out: [string, string][] = [];
      for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
      return out;
    };
    const sameGroup = (pairs: [string, string][]) =>
      pairs.some(([a, b]) => groupOf.has(a) && groupOf.get(a) === groupOf.get(b));

    let pairs = toPairs(shuffle(teamIds));
    for (let tries = 0; tries < 500 && sameGroup(pairs); tries++) {
      pairs = toPairs(shuffle(teamIds));
    }
    return pairs;
  }

  /** Vencedores da rodada, na ordem de criação dos confrontos. Lança 400 se algo estiver pendente/empatado. */
  private resolveWinners(roundMatches: Match[], legs: number, round: number): string[] {
    const ties = new Map<string, Match[]>();
    for (const m of roundMatches) {
      const key = m.tie_id ?? m.id;
      if (!ties.has(key)) ties.set(key, []);
      ties.get(key)!.push(m);
    }

    const winners: string[] = [];
    for (const games of ties.values()) {
      const [first] = games;
      const label = `${first.home_team.name} × ${first.away_team.name}`;
      const done = games.every(
        (g) => g.status === MatchStatus.FINALIZADA || g.status === MatchStatus.WO,
      );
      if (games.length < legs || !done) {
        throw new BadRequestException(
          `Finalize todos os jogos da rodada ${round} antes de gerar a próxima (pendente: ${label}). ` +
            'Para sortear novamente, exclua os jogos da rodada.',
        );
      }

      const goals = new Map<string, number>();
      for (const g of games) {
        goals.set(g.home_team_id, (goals.get(g.home_team_id) ?? 0) + (g.home_score ?? 0));
        goals.set(g.away_team_id, (goals.get(g.away_team_id) ?? 0) + (g.away_score ?? 0));
      }
      const [a, b] = [first.home_team_id, first.away_team_id];
      const ga = goals.get(a) ?? 0;
      const gb = goals.get(b) ?? 0;
      if (ga !== gb) {
        winners.push(ga > gb ? a : b);
        continue;
      }

      // Agregado empatado: decide pelos pênaltis do jogo decisivo (o último do confronto)
      const decisive = [...games].sort((x, y) => y.leg_number - x.leg_number)[0];
      if (decisive.home_penalty_score == null || decisive.away_penalty_score == null) {
        throw new BadRequestException(
          `Confronto empatado (${label}): registre a disputa de pênaltis na súmula do jogo.`,
        );
      }
      winners.push(
        decisive.home_penalty_score > decisive.away_penalty_score
          ? decisive.home_team_id
          : decisive.away_team_id,
      );
    }
    return winners;
  }

  private async createKnockoutRound(
    competitionId: string,
    phase: CompetitionPhase,
    round: number,
    pairs: [string, string][],
    dto: GenerateMatchesDto,
  ): Promise<Match[]> {
    const legs = phase.legs ?? 1;
    const toCreate: Partial<Match>[] = [];

    for (const [home, away] of pairs) {
      const tieId = legs > 1 ? uuidv4() : null;
      const base = {
        competition_id: competitionId,
        phase_id: phase.id,
        group_id: null,
        round_number: round,
        tie_id: tieId,
        status: MatchStatus.AGENDADA,
        location: dto.location ?? null,
      };
      toCreate.push({ ...base, home_team_id: home, away_team_id: away, leg_number: 1 });
      if (legs > 1) {
        toCreate.push({ ...base, home_team_id: away, away_team_id: home, leg_number: 2 });
      }
    }
    return this.matchRepo.save(this.matchRepo.create(toCreate as Match[]));
  }

  /**
   * Round-robin within each group (or whole phase if no groups).
   * Each pair plays once (home/away determined by position).
   * With legs=2 each pair plays twice (home+away reversed).
   */
  private async generateGroupPhaseMatches(
    competitionId: string,
    phase: CompetitionPhase,
    dto: GenerateMatchesDto,
  ): Promise<Match[]> {
    // If a specific group is requested, generate only for that group
    const groupFilter = dto.group_id ? { id: dto.group_id, phase_id: phase.id } : { phase_id: phase.id };
    const groups = await this.groupRepo.find({ where: groupFilter });

    if (groups.length === 0) {
      // No groups — use all enrolled teams as one pool
      return this.generateRoundRobin(
        competitionId, phase, null, dto, await this.getPhaseTeamIds(competitionId, phase.id),
      );
    }

    const created: Match[] = [];
    for (const group of groups) {
      const gt = await this.gtRepo.find({
        where: { group_id: group.id },
        relations: { competition_team: true },
      });
      const teamIds = gt.map((g) => g.competition_team.team_id);
      if (teamIds.length < 2) continue;
      const matches = await this.generateRoundRobin(competitionId, phase, group, dto, teamIds);
      created.push(...matches);
    }
    return created;
  }

  /** League format: all enrolled teams play round-robin (no groups). */
  private async generateLeagueMatches(
    competitionId: string,
    phase: CompetitionPhase,
    dto: GenerateMatchesDto,
  ): Promise<Match[]> {
    const teamIds = await this.getPhaseTeamIds(competitionId, phase.id);
    return this.generateRoundRobin(competitionId, phase, null, dto, teamIds);
  }

  private async getPhaseTeamIds(competitionId: string, phaseId: string): Promise<string[]> {
    const cts = await this.ctRepo.find({
      where: { competition_id: competitionId, registration_status: TeamRegistrationStatus.ATIVA },
    });
    return cts.map((ct) => ct.team_id);
  }

  /**
   * Round-robin scheduling: builds rounds using the circle method.
   * Returns created Match entities.
   */
  private async generateRoundRobin(
    competitionId: string,
    phase: CompetitionPhase,
    group: CompetitionGroup | null,
    dto: GenerateMatchesDto,
    teamIds: string[],
  ): Promise<Match[]> {
    const n = teamIds.length;
    if (n < 2) return [];

    const legs = phase.legs ?? 1;

    // Delete existing non-finished matches for this phase/group before regenerating
    const qb = this.matchRepo
      .createQueryBuilder()
      .delete()
      .where('phase_id = :phaseId', { phaseId: phase.id })
      .andWhere('status != :fin', { fin: MatchStatus.FINALIZADA });
    if (group) qb.andWhere('group_id = :gid', { gid: group.id });
    else qb.andWhere('group_id IS NULL');
    await qb.execute();

    const toCreate: Partial<Match>[] = [];
    const teams = [...teamIds];

    // Pad to even number with a "bye" slot (null)
    const padded: (string | null)[] = teams.length % 2 === 0 ? teams : [...teams, null];
    const half = padded.length / 2;

    const numRounds = padded.length - 1;

    for (let round = 0; round < numRounds; round++) {
      const roundNumber = round + 1;
      for (let i = 0; i < half; i++) {
        const home = padded[i];
        const away = padded[padded.length - 1 - i];
        if (!home || !away) continue; // bye

        // Leg 1
        const tieId = uuidv4();
        toCreate.push({
          competition_id: competitionId,
          phase_id: phase.id,
          group_id: group?.id ?? null,
          home_team_id: home,
          away_team_id: away,
          round_number: roundNumber,
          tie_id: legs > 1 ? tieId : null,
          leg_number: 1,
          status: MatchStatus.AGENDADA,
          location: dto.location ?? null,
        });

        // Leg 2 (return fixture)
        if (legs > 1) {
          toCreate.push({
            competition_id: competitionId,
            phase_id: phase.id,
            group_id: group?.id ?? null,
            home_team_id: away,
            away_team_id: home,
            round_number: numRounds + roundNumber,
            tie_id: tieId,
            leg_number: 2,
            status: MatchStatus.AGENDADA,
            location: dto.location ?? null,
          });
        }
      }

      // Rotate: fix position 0, rotate the rest clockwise
      const last = padded.pop()!;
      padded.splice(1, 0, last);
    }

    const entities = this.matchRepo.create(toCreate as Match[]);
    return this.matchRepo.save(entities);
  }

  // ─── Suíço (eliminação por derrotas) ──────────────────────────────────

  /** Vencedor de um jogo encerrado (placar, ou pênaltis se empatou). null se não houver decisão. */
  private matchWinner(m: Match): string | null {
    const h = m.home_score ?? 0;
    const a = m.away_score ?? 0;
    if (h !== a) return h > a ? m.home_team_id : m.away_team_id;
    if (m.home_penalty_score != null && m.away_penalty_score != null) {
      return m.home_penalty_score > m.away_penalty_score ? m.home_team_id : m.away_team_id;
    }
    return null;
  }

  /**
   * Suíço com eliminação: cada rodada cruza as equipes ainda vivas com campanhas parecidas
   * (vencedor × vencedor, perdedor × perdedor). Quem chega a `max_losses` derrotas está eliminado.
   * Número ímpar de equipes vivas: uma folga na rodada (a que menos folgou). Termina com 1 equipe viva.
   */
  private async generateSwissRound(
    competitionId: string,
    phase: CompetitionPhase,
    dto: GenerateMatchesDto,
  ): Promise<Match[]> {
    const maxLosses = phase.max_losses ?? 2;
    const { teamIds } = await this.getQualifiedTeams(competitionId, phase);
    if (teamIds.length < 2) {
      throw new BadRequestException('O suíço precisa de pelo menos 2 equipes.');
    }

    const existing = await this.matchRepo.find({
      where: { phase_id: phase.id },
      relations: { home_team: true, away_team: true },
      order: { created_at: 'ASC' },
    });

    const record = new Map<string, { wins: number; losses: number; played: number; opponents: Set<string> }>();
    for (const id of teamIds) record.set(id, { wins: 0, losses: 0, played: 0, opponents: new Set() });

    let lastRound = 0;
    if (existing.length > 0) {
      lastRound = Math.max(...existing.map((m) => m.round_number ?? 1));
      const pending = existing.filter(
        (m) =>
          (m.round_number ?? 1) === lastRound &&
          m.status !== MatchStatus.FINALIZADA &&
          m.status !== MatchStatus.WO,
      );
      if (pending.length > 0) {
        const m = pending[0];
        throw new BadRequestException(
          `Finalize todos os jogos da rodada ${lastRound} antes de gerar a próxima (pendente: ${m.home_team.name} × ${m.away_team.name}). ` +
            'Para sortear novamente, exclua os jogos da rodada.',
        );
      }

      for (const m of existing) {
        if (m.status !== MatchStatus.FINALIZADA && m.status !== MatchStatus.WO) continue;
        const winner = this.matchWinner(m);
        if (!winner) {
          throw new BadRequestException(
            `Jogo empatado (${m.home_team.name} × ${m.away_team.name}): registre a disputa de pênaltis na súmula.`,
          );
        }
        for (const [team, opp] of [
          [m.home_team_id, m.away_team_id],
          [m.away_team_id, m.home_team_id],
        ] as const) {
          const r = record.get(team) ?? { wins: 0, losses: 0, played: 0, opponents: new Set<string>() };
          record.set(team, r);
          r.played++;
          r.opponents.add(opp);
          if (team === winner) r.wins++;
          else r.losses++;
        }
      }
    }

    const active = [...record.entries()].filter(([, r]) => r.losses < maxLosses).map(([id]) => id);
    if (active.length <= 1) {
      const champion = active[0] ? await this.teamName(active[0]) : null;
      throw new BadRequestException(
        champion
          ? `A fase terminou: ${champion} é a única equipe sem eliminação.`
          : 'A fase terminou: todas as equipes foram eliminadas.',
      );
    }

    // Ordem: menos derrotas primeiro, mais vitórias, depois aleatório
    const jitter = new Map(active.map((id) => [id, Math.random()]));
    const ordered = [...active].sort((a, b) => {
      const ra = record.get(a)!;
      const rb = record.get(b)!;
      return (
        ra.losses - rb.losses ||
        rb.wins - ra.wins ||
        (jitter.get(a) ?? 0) - (jitter.get(b) ?? 0)
      );
    });

    // Quantidade ímpar: folga para quem mais jogou (menos folgou), pior campanha primeiro
    let bye: string | null = null;
    if (ordered.length % 2 === 1) {
      const candidates = [...ordered].reverse(); // pior campanha primeiro
      bye = candidates.reduce((best, id) =>
        record.get(id)!.played > record.get(best)!.played ? id : best,
      );
      ordered.splice(ordered.indexOf(bye), 1);
    }

    const pairs = this.pairAvoidingRematches(ordered, record);
    const round = lastRound + 1;
    const toCreate = pairs.map(([home, away]) => ({
      competition_id: competitionId,
      phase_id: phase.id,
      group_id: null,
      home_team_id: home,
      away_team_id: away,
      round_number: round,
      tie_id: null,
      leg_number: 1,
      status: MatchStatus.AGENDADA,
      location: dto.location ?? null,
    }));
    return this.matchRepo.save(this.matchRepo.create(toCreate as Match[]));
  }

  /** Emparelha a lista (já ordenada por campanha) sem repetir adversário; se não der, aceita revanche. */
  private pairAvoidingRematches(
    ordered: string[],
    record: Map<string, { opponents: Set<string> }>,
  ): [string, string][] {
    const solve = (list: string[], allowRematch: boolean): [string, string][] | null => {
      if (list.length === 0) return [];
      const [first, ...rest] = list;
      for (let i = 0; i < rest.length; i++) {
        const other = rest[i];
        if (!allowRematch && record.get(first)?.opponents.has(other)) continue;
        const remaining = rest.filter((_, idx) => idx !== i);
        const tail = solve(remaining, allowRematch);
        if (tail) return [[first, other], ...tail];
      }
      return null;
    };
    return solve(ordered, false) ?? solve(ordered, true) ?? [];
  }

  private async teamName(teamId: string): Promise<string> {
    const rows = await this.matchRepo.manager.query(`SELECT name FROM teams WHERE id = $1`, [teamId]);
    return rows[0]?.name ?? 'Equipe';
  }

  // ─── Participantes da fase ────────────────────────────────────────────

  /**
   * Quem participa da fase: se já tem jogos, as equipes dos jogos; senão, as equipes que ela
   * receberá (todas as inscritas, ou as classificadas da fase anterior). `ready=false` explica
   * o que falta (ex.: fase anterior sem terminar).
   */
  async getParticipants(competitionId: string, phaseId: string) {
    const phase = await this.phaseRepo.findOne({ where: { id: phaseId, competition_id: competitionId } });
    if (!phase) throw new NotFoundException('Fase não encontrada nesta competição.');

    const nameOf = async (ids: string[]) => {
      if (ids.length === 0) return new Map<string, string>();
      const rows: { id: string; name: string }[] = await this.matchRepo.manager.query(
        `SELECT id, name FROM teams WHERE id = ANY($1::uuid[])`,
        [ids],
      );
      return new Map(rows.map((r) => [r.id, r.name]));
    };

    const matches = await this.matchRepo.find({ where: { phase_id: phaseId } });
    if (matches.length > 0) {
      const ids = [...new Set(matches.flatMap((m) => [m.home_team_id, m.away_team_id]))];
      const names = await nameOf(ids);
      return {
        ready: true,
        started: true,
        from_previous: false,
        teams: ids.map((id) => ({ team_id: id, team_name: names.get(id) ?? '', group_name: null as string | null })),
      };
    }

    try {
      const { teamIds, groupOf, fromPrevious } = await this.getQualifiedTeams(competitionId, phase);
      const names = await nameOf(teamIds);
      const groupIds = [...new Set(groupOf.values())];
      const groupRows: { id: string; name: string }[] = groupIds.length
        ? await this.matchRepo.manager.query(`SELECT id, name FROM competition_groups WHERE id = ANY($1::uuid[])`, [groupIds])
        : [];
      const groupName = new Map(groupRows.map((g) => [g.id, g.name]));
      return {
        ready: true,
        started: false,
        from_previous: fromPrevious,
        teams: teamIds.map((id) => ({
          team_id: id,
          team_name: names.get(id) ?? '',
          group_name: groupOf.has(id) ? groupName.get(groupOf.get(id)!) ?? null : null,
        })),
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        return { ready: false, started: false, from_previous: true, reason: err.message, teams: [] };
      }
      throw err;
    }
  }
}
