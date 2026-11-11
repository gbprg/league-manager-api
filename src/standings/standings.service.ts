import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from '../matches/entities/match.entity.js';
import { MatchEvent, EventType } from '../results/entities/match-event.entity.js';
import { MatchPlayer } from '../results/entities/match-player.entity.js';
import { CompetitionPlayer } from '../enrollments/entities/competition-player.entity.js';
import { Competition } from '../competitions/entities/competition.entity.js';
import { CompetitionRule } from '../phases/entities/competition-rule.entity.js';
import { CompetitionGroup } from '../groups/entities/competition-group.entity.js';
import { CompetitionGroupTeam } from '../groups/entities/competition-group-team.entity.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StandingRow {
  team_id: string;
  team_name: string;
  group_id: string | null;
  group_name: string | null;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

export interface TopScorer {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  goals: number;
}

export interface GoalkeeperStat {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  matches_played: number;
  goals_conceded: number;
  clean_sheets: number;
}

export interface RedCardStat {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  red_cards: number;
}

export interface Statistics {
  top_scorers: TopScorer[];
  goalkeepers: GoalkeeperStat[];
  red_cards: RedCardStat[];
  most_wins: { team_id: string; team_name: string; wins: number }[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class StandingsService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchEvent)
    private readonly eventRepo: Repository<MatchEvent>,
    @InjectRepository(MatchPlayer)
    private readonly mpRepo: Repository<MatchPlayer>,
    @InjectRepository(CompetitionPlayer)
    private readonly cpRepo: Repository<CompetitionPlayer>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionRule)
    private readonly ruleRepo: Repository<CompetitionRule>,
    @InjectRepository(CompetitionGroup)
    private readonly groupRepo: Repository<CompetitionGroup>,
    @InjectRepository(CompetitionGroupTeam)
    private readonly gtRepo: Repository<CompetitionGroupTeam>,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────

  private async getCompetition(competitionId: string): Promise<Competition> {
    const c = await this.competitionRepo.findOne({ where: { id: competitionId } });
    if (!c) throw new NotFoundException('Competição não encontrada.');
    return c;
  }

  private async getPointsConfig(competitionId: string): Promise<{ win: number; draw: number; loss: number }> {
    const comp = await this.getCompetition(competitionId);
    return { win: comp.points_win, draw: comp.points_draw, loss: comp.points_loss };
  }

  private async getFinishedMatches(competitionId: string): Promise<Match[]> {
    return this.matchRepo.find({
      where: [
        { competition_id: competitionId, status: MatchStatus.FINALIZADA },
        { competition_id: competitionId, status: MatchStatus.WO },
      ],
      relations: { home_team: true, away_team: true, group: true, phase: true },
    });
  }

  /** Todos os jogos (qualquer status): as equipes aparecem na tabela mesmo antes de jogar. */
  private async getAllMatches(competitionId: string): Promise<Match[]> {
    return this.matchRepo.find({
      where: { competition_id: competitionId },
      relations: { home_team: true, away_team: true, group: true, phase: true },
    });
  }

  private async getEvents(competitionId: string): Promise<MatchEvent[]> {
    return this.eventRepo
      .createQueryBuilder('ev')
      .innerJoin('ev.match', 'm', 'm.competition_id = :cid', { cid: competitionId })
      .andWhere('m.status IN (:...statuses)', { statuses: [MatchStatus.FINALIZADA, MatchStatus.WO] })
      .leftJoinAndSelect('ev.match_player', 'mp')
      .leftJoinAndSelect('mp.competition_player', 'cp')
      .leftJoinAndSelect('cp.player', 'p')
      .leftJoinAndSelect('ev.team', 'team')
      .getMany();
  }

  /**
   * Tiebreakers applied in order (configurable via competition_rules):
   * 1. Points  2. Goal diff  3. Goals for  4. Wins  5. Name
   */
  private async getTiebreakerOrder(competitionId: string): Promise<string[]> {
    const rule = await this.ruleRepo.findOne({
      where: { competition_id: competitionId, rule_type: 'tiebreaker_order' },
    });
    if (rule?.rule_value && Array.isArray((rule.rule_value as any).order)) {
      return (rule.rule_value as any).order as string[];
    }
    return ['points', 'goal_diff', 'goals_for', 'wins', 'name'];
  }

  private sortByTiebreaker(rows: StandingRow[], order: string[]): StandingRow[] {
    return [...rows].sort((a, b) => {
      for (const criterion of order) {
        let diff = 0;
        switch (criterion) {
          case 'points':     diff = b.points - a.points; break;
          case 'goal_diff':  diff = b.goal_diff - a.goal_diff; break;
          case 'goals_for':  diff = b.goals_for - a.goals_for; break;
          case 'wins':       diff = b.wins - a.wins; break;
          case 'name':       diff = a.team_name.localeCompare(b.team_name); break;
        }
        if (diff !== 0) return diff;
      }
      return 0;
    });
  }

  // ─── Standings ────────────────────────────────────────────────────────

  /**
   * Classificação (tabela). Considera só fases de pontos corridos/grupos — jogos de
   * mata-mata não entram na tabela. `phaseId` restringe a uma fase específica.
   */
  async getStandings(
    competitionId: string,
    groupId?: string,
    phaseId?: string,
  ): Promise<StandingRow[]> {
    const [comp, matches, pts, tiebreakerOrder] = await Promise.all([
      this.getCompetition(competitionId),
      this.getAllMatches(competitionId),
      this.getPointsConfig(competitionId),
      this.getTiebreakerOrder(competitionId),
    ]);

    // Build a map of teamId → row; if group mode, scope to group teams
    const rowMap = new Map<string, StandingRow>();

    const getOrCreate = (teamId: string, teamName: string, gId: string | null, gName: string | null): StandingRow => {
      if (!rowMap.has(teamId)) {
        rowMap.set(teamId, {
          team_id: teamId,
          team_name: teamName,
          group_id: gId,
          group_name: gName,
          position: 0,
          played: 0, wins: 0, draws: 0, losses: 0,
          goals_for: 0, goals_against: 0, goal_diff: 0, points: 0,
        });
      }
      return rowMap.get(teamId)!;
    };

    for (const m of matches) {
      // Skip if filtering by group and match doesn't belong to it
      if (groupId && m.group_id !== groupId) continue;
      if (phaseId && m.phase_id !== phaseId) continue;
      if (m.phase?.phase_type === 'KNOCKOUT') continue;

      // A equipe entra na tabela assim que tem jogo marcado; só jogos encerrados somam pontos
      const homeRow = getOrCreate(m.home_team_id, m.home_team.name, m.group_id, m.group?.name ?? null);
      const awayRow = getOrCreate(m.away_team_id, m.away_team.name, m.group_id, m.group?.name ?? null);
      if (m.status !== MatchStatus.FINALIZADA && m.status !== MatchStatus.WO) continue;

      const hScore = m.home_score ?? 0;
      const aScore = m.away_score ?? 0;

      homeRow.played++;
      awayRow.played++;
      homeRow.goals_for += hScore;
      homeRow.goals_against += aScore;
      awayRow.goals_for += aScore;
      awayRow.goals_against += hScore;

      if (hScore > aScore) {
        homeRow.wins++;
        homeRow.points += pts.win;
        awayRow.losses++;
        awayRow.points += pts.loss;
      } else if (hScore === aScore) {
        homeRow.draws++;
        homeRow.points += pts.draw;
        awayRow.draws++;
        awayRow.points += pts.draw;
      } else {
        homeRow.losses++;
        homeRow.points += pts.loss;
        awayRow.wins++;
        awayRow.points += pts.win;
      }
    }

    // Compute goal diff
    for (const row of rowMap.values()) {
      row.goal_diff = row.goals_for - row.goals_against;
    }

    // Sort per group, then assign positions
    const allRows = Array.from(rowMap.values());

    // Group rows by group_id for independent classification
    const groupedRows = new Map<string | null, StandingRow[]>();
    for (const row of allRows) {
      const key = row.group_id ?? null;
      if (!groupedRows.has(key)) groupedRows.set(key, []);
      groupedRows.get(key)!.push(row);
    }

    const result: StandingRow[] = [];
    for (const [, rows] of groupedRows) {
      const sorted = this.sortByTiebreaker(rows, tiebreakerOrder);
      sorted.forEach((row, i) => { row.position = i + 1; });
      result.push(...sorted);
    }

    return result;
  }

  // ─── Statistics ───────────────────────────────────────────────────────

  async getTopScorers(competitionId: string): Promise<TopScorer[]> {
    await this.getCompetition(competitionId);
    const events = await this.getEvents(competitionId);

    const map = new Map<string, TopScorer>();

    for (const ev of events) {
      if (ev.event_type !== EventType.GOAL) continue; // exclude OWN_GOAL from artilharia
      if (!ev.match_player_id || !ev.match_player?.competition_player?.player) continue;

      const cp = ev.match_player.competition_player;
      const key = cp.player_id;
      if (!map.has(key)) {
        map.set(key, {
          player_id: cp.player_id,
          player_name: cp.player.full_name,
          team_id: cp.team_id,
          team_name: ev.team.name,
          goals: 0,
        });
      }
      map.get(key)!.goals++;
    }

    return [...map.values()].sort((a, b) => b.goals - a.goals || a.player_name.localeCompare(b.player_name));
  }

  async getRedCards(competitionId: string): Promise<RedCardStat[]> {
    await this.getCompetition(competitionId);
    const events = await this.getEvents(competitionId);

    const map = new Map<string, RedCardStat>();

    for (const ev of events) {
      if (ev.event_type !== EventType.RED_CARD) continue;
      if (!ev.match_player?.competition_player?.player) continue;

      const cp = ev.match_player.competition_player;
      const key = cp.player_id;
      if (!map.has(key)) {
        map.set(key, {
          player_id: cp.player_id,
          player_name: cp.player.full_name,
          team_id: cp.team_id,
          team_name: ev.team.name,
          red_cards: 0,
        });
      }
      map.get(key)!.red_cards++;
    }

    return [...map.values()].sort((a, b) => b.red_cards - a.red_cards || a.player_name.localeCompare(b.player_name));
  }

  async getGoalkeepers(competitionId: string): Promise<GoalkeeperStat[]> {
    await this.getCompetition(competitionId);
    const matches = await this.getFinishedMatches(competitionId);

    // Get all match_players that are goalkeepers, with their competition_player loaded
    const gkPlayers = await this.mpRepo
      .createQueryBuilder('mp')
      .innerJoin('mp.match', 'm', 'm.competition_id = :cid', { cid: competitionId })
      .andWhere('m.status IN (:...statuses)', { statuses: [MatchStatus.FINALIZADA, MatchStatus.WO] })
      .andWhere('mp.is_goalkeeper = true')
      .leftJoinAndSelect('mp.competition_player', 'cp')
      .leftJoinAndSelect('cp.player', 'p')
      .leftJoinAndSelect('cp.team', 't')
      .getMany();

    const map = new Map<string, GoalkeeperStat>();
    const matchMap = new Map(matches.map((m) => [m.id, m]));

    for (const mp of gkPlayers) {
      if (!mp.competition_player?.player) continue;
      const match = matchMap.get(mp.match_id);
      if (!match) continue;

      const cp = mp.competition_player;
      const key = `${cp.player_id}`;

      if (!map.has(key)) {
        map.set(key, {
          player_id: cp.player_id,
          player_name: cp.player.full_name,
          team_id: cp.team_id,
          team_name: cp.team.name,
          matches_played: 0,
          goals_conceded: 0,
          clean_sheets: 0,
        });
      }

      const stat = map.get(key)!;
      stat.matches_played++;

      // Goals conceded = goals scored AGAINST the goalkeeper's team
      const isHome = match.home_team_id === cp.team_id;
      const conceded = isHome ? (match.away_score ?? 0) : (match.home_score ?? 0);
      stat.goals_conceded += conceded;
      if (conceded === 0) stat.clean_sheets++;
    }

    return [...map.values()].sort(
      (a, b) =>
        a.goals_conceded - b.goals_conceded ||
        b.clean_sheets - a.clean_sheets ||
        b.matches_played - a.matches_played ||
        a.player_name.localeCompare(b.player_name),
    );
  }

  async getStatistics(competitionId: string): Promise<Statistics> {
    const [top_scorers, goalkeepers, red_cards, matches] = await Promise.all([
      this.getTopScorers(competitionId),
      this.getGoalkeepers(competitionId),
      this.getRedCards(competitionId),
      this.getFinishedMatches(competitionId),
    ]);

    // Most wins per team
    const winsMap = new Map<string, { team_id: string; team_name: string; wins: number }>();
    for (const m of matches) {
      const homeScore = m.home_score ?? 0;
      const awayScore = m.away_score ?? 0;

      const ensureTeam = (id: string, name: string) => {
        if (!winsMap.has(id)) winsMap.set(id, { team_id: id, team_name: name, wins: 0 });
      };
      ensureTeam(m.home_team_id, m.home_team.name);
      ensureTeam(m.away_team_id, m.away_team.name);

      if (homeScore > awayScore) winsMap.get(m.home_team_id)!.wins++;
      else if (awayScore > homeScore) winsMap.get(m.away_team_id)!.wins++;
    }

    const most_wins = [...winsMap.values()].sort((a, b) => b.wins - a.wins || a.team_name.localeCompare(b.team_name));

    return { top_scorers, goalkeepers, red_cards, most_wins };
  }
}
