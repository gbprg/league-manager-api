import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MatchPlayer } from './entities/match-player.entity.js';
import { MatchEvent, EventType } from './entities/match-event.entity.js';
import { Match, MatchStatus } from '../matches/entities/match.entity.js';
import { CompetitionPlayer, PlayerRegistrationStatus } from '../enrollments/entities/competition-player.entity.js';
import { AddMatchPlayerDto } from './dto/add-match-player.dto.js';
import { CreateMatchEventDto } from './dto/create-match-event.dto.js';
import { FinalizeMatchDto } from './dto/finalize-match.dto.js';
import { UpdateMatchPlayerDto } from './dto/update-match-player.dto.js';
import { WalkoverDto } from './dto/walkover.dto.js';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(MatchPlayer)
    private readonly mpRepo: Repository<MatchPlayer>,
    @InjectRepository(MatchEvent)
    private readonly meRepo: Repository<MatchEvent>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(CompetitionPlayer)
    private readonly cpRepo: Repository<CompetitionPlayer>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────

  private async getMatch(matchId: string): Promise<Match> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: { home_team: true, away_team: true, phase: true },
    });
    if (!match) throw new NotFoundException('Partida não encontrada.');
    return match;
  }

  private assertEditable(match: Match): void {
    if (match.status === MatchStatus.CANCELADA) {
      throw new BadRequestException('Partida cancelada não pode ser editada.');
    }
  }

  /** Validate that cp belongs to the match's competition and team (home or away). */
  private async validatePlayerBelongsToMatch(
    match: Match,
    cpId: string,
  ): Promise<CompetitionPlayer> {
    const cp = await this.cpRepo.findOne({
      where: { id: cpId, competition_id: match.competition_id },
    });
    if (!cp) {
      throw new BadRequestException('Jogador não inscrito nesta competição.');
    }
    if (cp.registration_status !== PlayerRegistrationStatus.APROVADA) {
      throw new BadRequestException('Jogador não está aprovado nesta competição.');
    }
    if (cp.team_id !== match.home_team_id && cp.team_id !== match.away_team_id) {
      throw new BadRequestException('Jogador não pertence a nenhuma das equipes da partida.');
    }
    return cp;
  }

  // ─── Match players ────────────────────────────────────────────────────

  async getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
    await this.getMatch(matchId);
    return this.mpRepo.find({
      where: { match_id: matchId },
      relations: { competition_player: { player: true, team: true } },
      order: { created_at: 'ASC' },
    });
  }

  async addMatchPlayer(matchId: string, dto: AddMatchPlayerDto): Promise<MatchPlayer> {
    const match = await this.getMatch(matchId);
    this.assertEditable(match);

    await this.validatePlayerBelongsToMatch(match, dto.competition_player_id);

    const existing = await this.mpRepo.findOne({
      where: { match_id: matchId, competition_player_id: dto.competition_player_id },
    });
    if (existing) throw new ConflictException('Jogador já relacionado nesta partida.');

    const mp = this.mpRepo.create({
      match_id: matchId,
      competition_player_id: dto.competition_player_id,
      is_starter: dto.is_starter ?? true,
      is_goalkeeper: dto.is_goalkeeper ?? false,
    });
    const saved = await this.mpRepo.save(mp);
    return this.mpRepo.findOne({
      where: { id: saved.id },
      relations: { competition_player: { player: true, team: true } },
    }) as Promise<MatchPlayer>;
  }

  /** Relaciona de uma vez todos os jogadores aprovados da equipe que ainda não estão na súmula. */
  async addTeamPlayers(matchId: string, teamId: string): Promise<{ added: number }> {
    const match = await this.getMatch(matchId);
    this.assertEditable(match);
    if (teamId !== match.home_team_id && teamId !== match.away_team_id) {
      throw new BadRequestException('A equipe não participa desta partida.');
    }

    const [approved, related] = await Promise.all([
      this.cpRepo.find({
        where: {
          competition_id: match.competition_id,
          team_id: teamId,
          registration_status: PlayerRegistrationStatus.APROVADA,
        },
      }),
      this.mpRepo.find({ where: { match_id: matchId } }),
    ]);
    const relatedIds = new Set(related.map((r) => r.competition_player_id));
    const toAdd = approved.filter((cp) => !relatedIds.has(cp.id));

    if (toAdd.length > 0) {
      await this.mpRepo.save(
        toAdd.map((cp) =>
          this.mpRepo.create({
            match_id: matchId,
            competition_player_id: cp.id,
            is_starter: true,
            is_goalkeeper: false,
          }),
        ),
      );
    }
    return { added: toAdd.length };
  }

  async updateMatchPlayer(
    matchId: string,
    matchPlayerId: string,
    dto: UpdateMatchPlayerDto,
  ): Promise<MatchPlayer> {
    const match = await this.getMatch(matchId);
    this.assertEditable(match);
    const mp = await this.mpRepo.findOne({
      where: { id: matchPlayerId, match_id: matchId },
      relations: { competition_player: { player: true, team: true } },
    });
    if (!mp) throw new NotFoundException('Relação jogador-partida não encontrada.');
    Object.assign(mp, dto);
    return this.mpRepo.save(mp);
  }

  async removeMatchPlayer(matchId: string, matchPlayerId: string): Promise<void> {
    const match = await this.getMatch(matchId);
    this.assertEditable(match);
    if (match.status === MatchStatus.FINALIZADA) {
      throw new BadRequestException('Não é possível remover jogador de partida finalizada.');
    }
    const mp = await this.mpRepo.findOne({ where: { id: matchPlayerId, match_id: matchId } });
    if (!mp) throw new NotFoundException('Relação jogador-partida não encontrada.');
    await this.mpRepo.remove(mp);
  }

  // ─── Match events ─────────────────────────────────────────────────────

  async getMatchEvents(matchId: string): Promise<MatchEvent[]> {
    await this.getMatch(matchId);
    return this.meRepo.find({
      where: { match_id: matchId },
      relations: { match_player: { competition_player: { player: true } }, team: true },
      order: { created_at: 'ASC' },
    });
  }

  async addMatchEvent(matchId: string, dto: CreateMatchEventDto): Promise<MatchEvent> {
    const match = await this.getMatch(matchId);
    this.assertEditable(match);

    // Validate team belongs to match
    if (dto.team_id !== match.home_team_id && dto.team_id !== match.away_team_id) {
      throw new BadRequestException('A equipe não participa desta partida.');
    }

    // Validate match_player if provided
    if (dto.match_player_id) {
      const mp = await this.mpRepo.findOne({
        where: { id: dto.match_player_id, match_id: matchId },
      });
      if (!mp) throw new BadRequestException('Jogador não está relacionado nesta partida.');
    }

    // Todo evento é de um jogador relacionado na súmula
    if (!dto.match_player_id) {
      throw new BadRequestException(
        `Eventos do tipo ${dto.event_type} requerem um jogador relacionado.`,
      );
    }

    const event = this.meRepo.create({
      match_id: matchId,
      match_player_id: dto.match_player_id ?? null,
      team_id: dto.team_id,
      event_type: dto.event_type,
      description: dto.description ?? null,
    });
    const saved = await this.meRepo.save(event);
    return this.meRepo.findOne({
      where: { id: saved.id },
      relations: { match_player: { competition_player: { player: true } }, team: true },
    }) as Promise<MatchEvent>;
  }

  async removeMatchEvent(eventId: string): Promise<void> {
    const event = await this.meRepo.findOne({
      where: { id: eventId },
      relations: { match: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    this.assertEditable(event.match);
    await this.meRepo.remove(event);
  }

  // ─── Finalize / result ────────────────────────────────────────────────

  /**
   * Finalize a match in a single transaction:
   * 1. Validate placar consistency with goal events (warning only — allowed by spec)
   * 2. Set home_score, away_score, status = FINALIZADA
   */
  async finalizeMatch(matchId: string, dto: FinalizeMatchDto): Promise<Match> {
    const match = await this.getMatch(matchId);
    if (match.status === MatchStatus.FINALIZADA || match.status === MatchStatus.WO) {
      throw new BadRequestException(
        'Partida já encerrada. Use a correção de resultado para alterá-la.',
      );
    }
    return this.applyResult(match, dto);
  }

  private async applyResult(match: Match, dto: FinalizeMatchDto): Promise<Match> {
    const matchId = match.id;
    if (match.status === MatchStatus.CANCELADA) {
      throw new BadRequestException('Partida cancelada não pode ser finalizada.');
    }

    // Count goals from events to validate
    const events = await this.meRepo.find({ where: { match_id: matchId } });
    const homeGoals = events.filter(
      (e) =>
        (e.event_type === EventType.GOAL && e.team_id === match.home_team_id) ||
        (e.event_type === EventType.OWN_GOAL && e.team_id === match.away_team_id),
    ).length;
    const awayGoals = events.filter(
      (e) =>
        (e.event_type === EventType.GOAL && e.team_id === match.away_team_id) ||
        (e.event_type === EventType.OWN_GOAL && e.team_id === match.home_team_id),
    ).length;

    // Spec allows override for admin corrections — use dto scores directly
    const finalHome = dto.override_home_score ?? dto.home_score;
    const finalAway = dto.override_away_score ?? dto.away_score;

    const penalties = await this.resolvePenalties(match, finalHome, finalAway, dto);

    // Run in transaction
    await this.dataSource.transaction(async (em) => {
      await em.update(Match, matchId, {
        home_score: finalHome,
        away_score: finalAway,
        home_penalty_score: penalties.home,
        away_penalty_score: penalties.away,
        status: MatchStatus.FINALIZADA,
      });
    });

    return this.matchRepo.findOne({
      where: { id: matchId },
      relations: { home_team: true, away_team: true, phase: true },
    }) as Promise<Match>;
  }

  /** Registra W.O.: a partida vai para status WO com placar para a equipe vencedora (padrão 3 × 0). */
  async registerWalkover(matchId: string, dto: WalkoverDto): Promise<Match> {
    const match = await this.getMatch(matchId);
    if (match.status === MatchStatus.CANCELADA) {
      throw new BadRequestException('Partida cancelada não pode receber W.O.');
    }
    if (match.status === MatchStatus.FINALIZADA || match.status === MatchStatus.WO) {
      throw new BadRequestException(
        'Partida já encerrada. Use a correção de resultado para alterá-la.',
      );
    }
    const isHome = dto.winner_team_id === match.home_team_id;
    if (!isHome && dto.winner_team_id !== match.away_team_id) {
      throw new BadRequestException('A equipe vencedora não participa desta partida.');
    }
    const goals = dto.winner_goals ?? 3;
    await this.matchRepo.update(matchId, {
      status: MatchStatus.WO,
      home_score: isHome ? goals : 0,
      away_score: isHome ? 0 : goals,
      home_penalty_score: null,
      away_penalty_score: null,
    });
    return this.getMatch(matchId);
  }

  /**
   * Pênaltis só existem no mata-mata, quando o jogo decisivo do confronto termina empatado
   * (jogo único, ou 2º jogo com agregado empatado). Nesse caso são obrigatórios e não podem empatar.
   */
  private async resolvePenalties(
    match: Match,
    homeGoals: number,
    awayGoals: number,
    dto: FinalizeMatchDto,
  ): Promise<{ home: number | null; away: number | null }> {
    const hp = dto.home_penalty_score;
    const ap = dto.away_penalty_score;
    if ((hp == null) !== (ap == null)) {
      throw new BadRequestException('Informe os pênaltis dos dois times.');
    }

    let needsShootout = false;
    if (match.phase?.phase_type === 'KNOCKOUT' || match.phase?.phase_type === 'SWISS') {
      const legs = match.phase.legs ?? 1;
      if (legs === 1 || !match.tie_id) {
        needsShootout = homeGoals === awayGoals;
      } else if (match.leg_number >= legs) {
        const others = await this.matchRepo.find({
          where: { tie_id: match.tie_id },
        });
        const previous = others.filter((o) => o.id !== match.id);
        const allDone = previous.every(
          (o) => o.status === MatchStatus.FINALIZADA || o.status === MatchStatus.WO,
        );
        if (allDone) {
          let home = homeGoals;
          let away = awayGoals;
          for (const o of previous) {
            home += o.home_team_id === match.home_team_id ? (o.home_score ?? 0) : (o.away_score ?? 0);
            away += o.home_team_id === match.away_team_id ? (o.home_score ?? 0) : (o.away_score ?? 0);
          }
          needsShootout = home === away;
        }
      }
    }

    if (hp == null || ap == null) {
      if (needsShootout) {
        throw new BadRequestException(
          'Empate em jogo eliminatório: informe o resultado da disputa de pênaltis.',
        );
      }
      return { home: null, away: null };
    }
    if (!needsShootout) {
      throw new BadRequestException(
        'Pênaltis só podem ser informados em mata-mata decidido por empate no tempo normal.',
      );
    }
    if (hp === ap) {
      throw new BadRequestException('A disputa de pênaltis não pode terminar empatada.');
    }
    return { home: hp, away: ap };
  }

  /** Re-open a finalized match for correction, then re-finalize. */
  async correctResult(matchId: string, dto: FinalizeMatchDto): Promise<Match> {
    const match = await this.getMatch(matchId);
    if (match.status !== MatchStatus.FINALIZADA && match.status !== MatchStatus.WO) {
      throw new BadRequestException('Somente partidas finalizadas ou W.O. podem ter o resultado corrigido.');
    }
    return this.applyResult(match, dto);
  }

  /** Get full súmula (match + players + events). */
  async getSumula(matchId: string) {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: {
        home_team: true,
        away_team: true,
        phase: true,
        group: true,
      },
    });
    if (!match) throw new NotFoundException('Partida não encontrada.');

    const [players, events] = await Promise.all([
      this.getMatchPlayers(matchId),
      this.getMatchEvents(matchId),
    ]);

    return { match, players, events };
  }
}
