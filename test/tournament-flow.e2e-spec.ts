/**
 * Teste de fluxo: fase de grupos + mata-mata (E2E com banco real)
 *
 * Cenário:
 *  - 8 equipes, 2 grupos (A e B) com 4 equipes cada
 *  - Fase de grupos: todos contra todos dentro do grupo (4 equipes → 3 rodadas)
 *  - Classificam os 2 primeiros de cada grupo
 *  - Fase eliminatória: semifinais sorteadas pela API entre os classificados e final
 *    gerada com os vencedores; quem perde está eliminado, quem ganha avança
 *
 * Resultados são determinísticos: a equipe de menor "força" (rank) sempre vence.
 *
 * Pré-requisito: banco rodando e migrações aplicadas (ver flow.e2e-spec.ts).
 * Execução: npm run test:e2e
 *
 * Os dados NÃO são apagados ao final. Os nomes usam timestamp para evitar conflito.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';

// ─── Estado compartilhado ────────────────────────────────────────────────────

let app: INestApplication;
let token: string;
const ts = Date.now();

interface TeamInfo {
  label: string; // ex.: "A1"
  group: 'A' | 'B';
  rank: number; // 1 = mais forte (sempre vence)
  teamId: string;
  playerId: string;
}

// Rank global: A1=1, B1=2, A2=3, B2=4, A3=5, B3=6, A4=7, B4=8
const TEAMS: TeamInfo[] = [];
for (let i = 1; i <= 4; i++) {
  TEAMS.push({ label: `A${i}`, group: 'A', rank: 2 * i - 1, teamId: '', playerId: '' });
  TEAMS.push({ label: `B${i}`, group: 'B', rank: 2 * i, teamId: '', playerId: '' });
}
const byTeamId = (id: string) => TEAMS.find((t) => t.teamId === id)!;
const byLabel = (label: string) => TEAMS.find((t) => t.label === label)!;

let competitionId: string;
let groupPhaseId: string;
let knockoutPhaseId: string;
const groupIds: Record<'A' | 'B', string> = { A: '', B: '' };
const competitionTeamIds: Record<string, string> = {};

interface MatchRow {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round_number: number | null;
  group_id: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const http = () => request(app.getHttpServer());
const authed = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

async function listMatches(phaseId: string): Promise<MatchRow[]> {
  const res = await http()
    .get(`/api/competitions/${competitionId}/matches?phase_id=${phaseId}&limit=1000`)
    .expect(200);
  return res.body.data;
}

/** A equipe de menor rank vence por 2 × 0. Retorna { winner, loser } (ids de equipe). */
async function playMatch(match: MatchRow): Promise<{ winnerId: string; loserId: string }> {
  const home = byTeamId(match.home_team_id);
  const away = byTeamId(match.away_team_id);
  const homeWins = home.rank < away.rank;

  await authed(http().post(`/api/matches/${match.id}/result`))
    .send({ home_score: homeWins ? 2 : 0, away_score: homeWins ? 0 : 2 })
    .expect(201);

  return homeWins
    ? { winnerId: match.home_team_id, loserId: match.away_team_id }
    : { winnerId: match.away_team_id, loserId: match.home_team_id };
}

async function groupStandings(group: 'A' | 'B') {
  const res = await http()
    .get(`/api/competitions/${competitionId}/standings?group_id=${groupIds[group]}`)
    .expect(200);
  return res.body as Array<{
    team_id: string;
    position: number;
    played: number;
    points: number;
    wins: number;
    losses: number;
  }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  const ds = app.get<DataSource>(getDataSourceToken());
  const existing = await ds.query(`SELECT id FROM admin_users WHERE email = $1`, [
    'admin@example.com',
  ]);
  if (existing.length === 0) {
    const hash = await argon2.hash('change-me-in-production');
    await ds.query(`INSERT INTO admin_users (name, email, password_hash) VALUES ($1, $2, $3)`, [
      'Administrador',
      'admin@example.com',
      hash,
    ]);
  }
}, 30_000);

afterAll(async () => {
  await app.close();
});

// ─── 1. Preparação: competição, equipes e jogadores ─────────────────────────

describe('1. Preparação', () => {
  it('faz login', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'change-me-in-production' })
      .expect(200);
    token = res.body.access_token;
    expect(token).toBeDefined();
  });

  it('cria a competição', async () => {
    const res = await authed(http().post('/api/competitions'))
      .send({
        name: `Copa Mata-Mata ${ts}`,
        start_date: '2026-01-10',
        end_date: '2026-03-30',
        location: 'Campo Central',
        category: 'Sub-15',
        format: 'FASE_DE_GRUPOS',
        max_teams: 8,
      })
      .expect(201);
    competitionId = res.body.id;
  });

  it('competição em rascunho: público recebe 404 nas listagens, admin enxerga', async () => {
    for (const path of ['teams', 'players', 'phases', 'matches', 'standings', 'statistics', 'albums']) {
      await http().get(`/api/competitions/${competitionId}/${path}`).expect(404);
      await authed(http().get(`/api/competitions/${competitionId}/${path}`)).expect(200);
    }
    // registros disciplinares completos nunca são públicos
    await http().get(`/api/competitions/${competitionId}/disciplinary`).expect(401);
  });

  it('publica a competição (listagens passam a ser públicas)', async () => {
    await authed(http().patch(`/api/competitions/${competitionId}/publish`)).expect(200);
    await http().get(`/api/competitions/${competitionId}/matches`).expect(200);
    await http().get(`/api/competitions/${competitionId}/disciplinary`).expect(401);
    await http().get(`/api/competitions/${competitionId}/disciplinary/suspensions/active`).expect(200);
  });

  it('cria 8 equipes com 1 jogador cada, aprova e inscreve no torneio', async () => {
    for (const t of TEAMS) {
      const team = await authed(http().post('/api/teams'))
        .send({ name: `${t.label} FC ${ts}`, city: 'São Paulo' })
        .expect(201);
      t.teamId = team.body.id;

      const player = await authed(http().post('/api/players'))
        .send({
          full_name: `Jogador ${t.label} ${ts}`,
          birth_date: '2010-05-10',
          position: 'ATAQUE',
        })
        .expect(201);
      t.playerId = player.body.id;

      // 1) adiciona a equipe (fica PENDENTE)
      const ct = await authed(http().post(`/api/competitions/${competitionId}/teams`))
        .send({ team_id: t.teamId })
        .expect(201);
      expect(ct.body.registration_status).toBe('PENDENTE');
      competitionTeamIds[t.label] = ct.body.id;

      // 2) inscreve o jogador (PENDENTE) e aprova todos de uma vez
      await authed(http().post(`/api/competitions/${competitionId}/players`))
        .send({ player_id: t.playerId, team_id: t.teamId, shirt_number: 10 })
        .expect(201);
      const approved = await authed(
        http().patch(`/api/competitions/${competitionId}/teams/${t.teamId}/players/approve-all`),
      ).expect(200);
      expect(approved.body.approved).toBe(1);

      // 3) agora a equipe pode ser inscrita no torneio
      const active = await authed(
        http().post(`/api/competitions/${competitionId}/teams/${t.teamId}/activate`),
      ).expect(200);
      expect(active.body.registration_status).toBe('ATIVA');
    }
  });
});

// ─── 2. Fase de grupos ───────────────────────────────────────────────────────

describe('2. Fase de grupos (2 grupos × 4 equipes)', () => {
  it('cria a fase de grupos classificando 2 por grupo', async () => {
    const res = await authed(http().post(`/api/competitions/${competitionId}/phases`))
      .send({ phase_type: 'GROUP', sequence: 1, legs: 1, qualification_count: 2 })
      .expect(201);
    groupPhaseId = res.body.id;
    expect(res.body.qualification_count).toBe(2);
  });

  it('cria os grupos A e B e distribui as equipes', async () => {
    for (const g of ['A', 'B'] as const) {
      const res = await authed(http().post(`/api/phases/${groupPhaseId}/groups`))
        .send({ name: `Grupo ${g}` })
        .expect(201);
      groupIds[g] = res.body.id;
    }

    for (const t of TEAMS) {
      await authed(http().post(`/api/groups/${groupIds[t.group]}/teams`))
        .send({ competition_team_id: competitionTeamIds[t.label] })
        .expect(201);
    }
  });

  it('não permite a mesma equipe em dois grupos da fase', async () => {
    await authed(http().post(`/api/groups/${groupIds.B}/teams`))
      .send({ competition_team_id: competitionTeamIds['A1'] })
      .expect(409);
  });

  it('gera o calendário: 3 rodadas, 6 jogos por grupo (12 no total)', async () => {
    const res = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: groupPhaseId })
      .expect(201);
    expect(res.body).toHaveLength(12);

    const matches = await listMatches(groupPhaseId);
    expect(matches).toHaveLength(12);

    for (const g of ['A', 'B'] as const) {
      const inGroup = matches.filter((m) => m.group_id === groupIds[g]);
      expect(inGroup).toHaveLength(6);
      // cada equipe joga exatamente 3 vezes
      for (const t of TEAMS.filter((x) => x.group === g)) {
        const games = inGroup.filter(
          (m) => m.home_team_id === t.teamId || m.away_team_id === t.teamId,
        );
        expect(games).toHaveLength(3);
      }
    }
    expect(new Set(matches.map((m) => m.round_number))).toEqual(new Set([1, 2, 3]));
  });

  it('joga rodada a rodada e a tabela evolui', async () => {
    const matches = await listMatches(groupPhaseId);

    for (const round of [1, 2, 3]) {
      const roundMatches = matches.filter((m) => m.round_number === round);
      expect(roundMatches).toHaveLength(4); // 2 jogos por grupo

      for (const m of roundMatches) await playMatch(m);

      for (const g of ['A', 'B'] as const) {
        const table = await groupStandings(g);
        expect(table).toHaveLength(4);
        for (const row of table) expect(row.played).toBe(round);
      }
    }
  });

  it('classificação final de cada grupo: 9, 6, 3 e 0 pontos', async () => {
    for (const g of ['A', 'B'] as const) {
      const table = await groupStandings(g);
      const order = table.sort((a, b) => a.position - b.position);

      expect(order.map((r) => byTeamId(r.team_id).label)).toEqual(
        [1, 2, 3, 4].map((i) => `${g}${i}`),
      );
      expect(order.map((r) => r.points)).toEqual([9, 6, 3, 0]);
    }
  });

  it('todos os jogos da fase estão finalizados', async () => {
    const matches = await listMatches(groupPhaseId);
    expect(matches.every((m) => m.status === 'FINALIZADA')).toBe(true);
  });
});

// ─── 3. Mata-mata ────────────────────────────────────────────────────────────

describe('3. Fase eliminatória', () => {
  let qualified: Record<'A' | 'B', string[]>; // ids das 2 primeiras de cada grupo (1º, 2º)
  let eliminatedInSemis: string[] = [];

  it('classifica os 2 primeiros de cada grupo (qualification_count da fase)', async () => {
    const phases = await http().get(`/api/competitions/${competitionId}/phases`).expect(200);
    const phase = phases.body.find((p: { id: string }) => p.id === groupPhaseId);
    const cut = phase.qualification_count as number;
    expect(cut).toBe(2);

    qualified = { A: [], B: [] };
    for (const g of ['A', 'B'] as const) {
      const table = (await groupStandings(g)).sort((a, b) => a.position - b.position);
      qualified[g] = table.slice(0, cut).map((r) => r.team_id);
    }

    expect(qualified.A.map((id) => byTeamId(id).label)).toEqual(['A1', 'A2']);
    expect(qualified.B.map((id) => byTeamId(id).label)).toEqual(['B1', 'B2']);
  });

  it('cria a fase eliminatória', async () => {
    const res = await authed(http().post(`/api/competitions/${competitionId}/phases`))
      .send({ phase_type: 'KNOCKOUT', sequence: 2, legs: 1 })
      .expect(201);
    knockoutPhaseId = res.body.id;
  });

  it('sorteia as semifinais com os 4 classificados (sem repetir confrontos do mesmo grupo)', async () => {
    const res = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: knockoutPhaseId })
      .expect(201);
    expect(res.body).toHaveLength(2);

    const semis = res.body as MatchRow[];
    const used = semis.flatMap((m) => [m.home_team_id, m.away_team_id]);
    expect(new Set(used)).toEqual(new Set([...qualified.A, ...qualified.B]));

    // o sorteio evita cruzar equipes do mesmo grupo na 1ª rodada
    for (const m of semis) {
      expect(byTeamId(m.home_team_id).group).not.toBe(byTeamId(m.away_team_id).group);
      expect(m.round_number).toBe(1);
    }
  });

  it('não gera a próxima rodada enquanto as semifinais estão pendentes', async () => {
    await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: knockoutPhaseId })
      .expect(400);
  });

  it('semifinais: perdedor é eliminado, vencedor avança (uma delas decidida nos pênaltis)', async () => {
    const semis = (await listMatches(knockoutPhaseId)).filter((m) => m.round_number === 1);
    expect(semis).toHaveLength(2);

    // ── 1ª semifinal: 1 × 1 no tempo normal, decidida nos pênaltis ──
    const [penaltyMatch, normalMatch] = semis;
    const home = byTeamId(penaltyMatch.home_team_id);
    const away = byTeamId(penaltyMatch.away_team_id);
    const strongIsHome = home.rank < away.rank;
    const draw = { home_score: 1, away_score: 1 };

    // empate em mata-mata sem pênaltis é recusado
    await authed(http().post(`/api/matches/${penaltyMatch.id}/result`)).send(draw).expect(400);
    // pênaltis não podem empatar
    await authed(http().post(`/api/matches/${penaltyMatch.id}/result`))
      .send({ ...draw, home_penalty_score: 3, away_penalty_score: 3 })
      .expect(400);
    // pênaltis informados pela metade
    await authed(http().post(`/api/matches/${penaltyMatch.id}/result`))
      .send({ ...draw, home_penalty_score: 3 })
      .expect(400);
    // pênaltis em jogo que não terminou empatado
    await authed(http().post(`/api/matches/${penaltyMatch.id}/result`))
      .send({ home_score: 2, away_score: 0, home_penalty_score: 5, away_penalty_score: 4 })
      .expect(400);

    // a rodada ainda não pode avançar (o jogo continua pendente)
    await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: knockoutPhaseId })
      .expect(400);

    // o mais forte vence nos pênaltis por 5 × 4
    const fin = await authed(http().post(`/api/matches/${penaltyMatch.id}/result`))
      .send({
        ...draw,
        home_penalty_score: strongIsHome ? 5 : 4,
        away_penalty_score: strongIsHome ? 4 : 5,
      })
      .expect(201);
    expect(fin.body.home_penalty_score).toBe(strongIsHome ? 5 : 4);
    expect(fin.body.away_penalty_score).toBe(strongIsHome ? 4 : 5);
    eliminatedInSemis.push(strongIsHome ? penaltyMatch.away_team_id : penaltyMatch.home_team_id);

    // ── 2ª semifinal: vitória no tempo normal ──
    const { loserId } = await playMatch(normalMatch);
    eliminatedInSemis.push(loserId);
    expect(eliminatedInSemis).toHaveLength(2);
  });

  it('gera a final automaticamente só com os vencedores das semifinais', async () => {
    const res = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: knockoutPhaseId })
      .expect(201);
    expect(res.body).toHaveLength(1);

    const final = res.body[0] as MatchRow;
    expect(final.round_number).toBe(2);

    const inFinal = [final.home_team_id, final.away_team_id];
    for (const out of eliminatedInSemis) expect(inFinal).not.toContain(out);

    // o campeão é sempre a A1 (a mais forte)
    const { winnerId } = await playMatch(final);
    expect(byTeamId(winnerId).label).toBe('A1');
  });

  it('com o campeão definido não há próxima rodada', async () => {
    await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: knockoutPhaseId })
      .expect(400);
  });

  it('a fase eliminatória tem 3 jogos, todos finalizados, e a tabela dos grupos não mudou', async () => {
    const matches = await listMatches(knockoutPhaseId);
    expect(matches).toHaveLength(3);
    expect(matches.every((m) => m.status === 'FINALIZADA')).toBe(true);
    expect(matches.filter((m) => m.round_number === 1)).toHaveLength(2);
    expect(matches.filter((m) => m.round_number === 2)).toHaveLength(1);

    // a classificação do grupo (filtrada por grupo) continua só com os jogos da fase de grupos
    for (const g of ['A', 'B'] as const) {
      const table = await groupStandings(g);
      for (const row of table) expect(row.played).toBe(3);
    }

    console.log(`  Campeão: ${byLabel('A1').label} (competição ${competitionId})`);
  });
});
