/**
 * Fluxos de fases flexíveis (E2E com banco real):
 *  A) 6 equipes, 2 grupos de 3 (montados automaticamente), classificam 2 por grupo (4 avançam)
 *     e a fase eliminatória é sorteada com os classificados; os 2 eliminados nos grupos não aparecem.
 *  B) Suíço com eliminação por 2 derrotas, 8 equipes, rodada a rodada até sobrar uma equipe.
 *
 * Resultados determinísticos: a equipe de menor rank sempre vence.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';

let app: INestApplication;
let token: string;
const ts = Date.now();

const http = () => request(app.getHttpServer());
const authed = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

interface Team {
  label: string;
  rank: number;
  teamId: string;
}
interface MatchRow {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round_number: number | null;
  group_id: string | null;
  status: string;
}

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  const ds = app.get<DataSource>(getDataSourceToken());
  const existing = await ds.query(`SELECT id FROM admin_users WHERE email = $1`, ['admin@example.com']);
  if (existing.length === 0) {
    const hash = await argon2.hash('change-me-in-production');
    await ds.query(`INSERT INTO admin_users (name, email, password_hash) VALUES ($1, $2, $3)`, [
      'Administrador',
      'admin@example.com',
      hash,
    ]);
  }
  const res = await http()
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'change-me-in-production' });
  token = res.body.access_token;
}, 30_000);

afterAll(async () => {
  await app.close();
});

/** Cria competição + N equipes (1 jogador aprovado cada) já inscritas no torneio. */
async function setup(label: string, count: number) {
  const c = await authed(http().post('/api/competitions'))
    .send({
      name: `PF ${label} ${ts}`,
      start_date: '2026-01-01',
      end_date: '2026-06-01',
      format: 'FASE_DE_GRUPOS',
    })
    .expect(201);
  const competitionId = c.body.id as string;

  const teams: Team[] = [];
  for (let i = 1; i <= count; i++) {
    const t = await authed(http().post('/api/teams')).send({ name: `PF ${label} T${i} ${ts}` }).expect(201);
    const teamId = t.body.id as string;
    await authed(http().post('/api/players'))
      .send({ full_name: `PF ${label} J${i} ${ts}`, birth_date: '2010-01-01', team_id: teamId })
      .expect(201);
    await authed(http().post(`/api/competitions/${competitionId}/teams`)).send({ team_id: teamId }).expect(201);
    await authed(http().patch(`/api/competitions/${competitionId}/teams/${teamId}/players/approve-all`)).expect(200);
    await authed(http().post(`/api/competitions/${competitionId}/teams/${teamId}/activate`)).expect(200);
    teams.push({ label: `T${i}`, rank: i, teamId });
  }
  return { competitionId, teams };
}

async function listMatches(competitionId: string, phaseId: string): Promise<MatchRow[]> {
  const r = await authed(
    http().get(`/api/competitions/${competitionId}/matches?phase_id=${phaseId}&limit=1000`),
  ).expect(200);
  return r.body.data;
}

/** A equipe de menor rank vence por 2 × 0. */
async function play(teams: Team[], m: MatchRow) {
  const rank = (id: string) => teams.find((t) => t.teamId === id)!.rank;
  const homeWins = rank(m.home_team_id) < rank(m.away_team_id);
  await authed(http().post(`/api/matches/${m.id}/result`))
    .send({ home_score: homeWins ? 2 : 0, away_score: homeWins ? 0 : 2 })
    .expect(201);
  return homeWins
    ? { winner: m.home_team_id, loser: m.away_team_id }
    : { winner: m.away_team_id, loser: m.home_team_id };
}

async function cleanup(competitionId: string, teams: Team[]) {
  await authed(http().delete(`/api/competitions/${competitionId}`)).expect(204);
  for (const t of teams) {
    const players = await http().get(`/api/players?team_id=${t.teamId}&limit=100`).expect(200);
    for (const p of players.body.data) await authed(http().delete(`/api/players/${p.id}`)).expect(204);
    await authed(http().delete(`/api/teams/${t.teamId}`)).expect(204);
  }
}

// ─── A) 6 equipes, 2 grupos de 3, 4 classificam ─────────────────────────────

describe('A) Grupos de 3 → eliminatória com 4 classificados', () => {
  let competitionId: string;
  let teams: Team[];
  let groupPhaseId: string;
  let koPhaseId: string;

  it('prepara 6 equipes e a fase de grupos (classificam 2 por grupo)', async () => {
    ({ competitionId, teams } = await setup('A', 6));
    const p = await authed(http().post(`/api/competitions/${competitionId}/phases`))
      .send({ phase_type: 'GROUP', sequence: 1, legs: 1, qualification_count: 2 })
      .expect(201);
    groupPhaseId = p.body.id;

    const part = await authed(
      http().get(`/api/competitions/${competitionId}/phases/${groupPhaseId}/participants`),
    ).expect(200);
    expect(part.body.ready).toBe(true);
    expect(part.body.teams).toHaveLength(6);
  });

  it('monta 2 grupos de 3 automaticamente (e recusa montar de novo)', async () => {
    const res = await authed(http().post(`/api/phases/${groupPhaseId}/groups/auto`))
      .send({ groups_count: 2 })
      .expect(201);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((g: { name: string }) => g.name)).toEqual(['Grupo A', 'Grupo B']);
    for (const g of res.body) expect(g.group_teams).toHaveLength(3);

    await authed(http().post(`/api/phases/${groupPhaseId}/groups/auto`)).send({ groups_count: 2 }).expect(409);
  });

  it('recusa grupos demais para o número de equipes', async () => {
    const other = await authed(http().post(`/api/competitions/${competitionId}/phases`))
      .send({ phase_type: 'GROUP', sequence: 9 })
      .expect(201);
    await authed(http().post(`/api/phases/${other.body.id}/groups/auto`)).send({ groups_count: 4 }).expect(400);
    await authed(http().delete(`/api/phases/${other.body.id}`)).expect(204);
  });

  it('gera 6 jogos (3 por grupo, em 3 rodadas)', async () => {
    const gen = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: groupPhaseId })
      .expect(201);
    expect(gen.body).toHaveLength(6);
    const rounds = new Set(gen.body.map((m: MatchRow) => m.round_number));
    expect(rounds).toEqual(new Set([1, 2, 3]));
  });

  it('eliminatória: antes do fim dos grupos mostra o motivo; depois lista os 4 classificados', async () => {
    const k = await authed(http().post(`/api/competitions/${competitionId}/phases`))
      .send({ phase_type: 'KNOCKOUT', sequence: 2, legs: 1 })
      .expect(201);
    koPhaseId = k.body.id;

    const blocked = await authed(
      http().get(`/api/competitions/${competitionId}/phases/${koPhaseId}/participants`),
    ).expect(200);
    expect(blocked.body.ready).toBe(false);
    expect(blocked.body.reason).toMatch(/sem resultado/);
    await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: koPhaseId })
      .expect(400);

    for (const m of await listMatches(competitionId, groupPhaseId)) await play(teams, m);

    const ready = await authed(
      http().get(`/api/competitions/${competitionId}/phases/${koPhaseId}/participants`),
    ).expect(200);
    expect(ready.body.ready).toBe(true);
    expect(ready.body.from_previous).toBe(true);
    expect(ready.body.teams).toHaveLength(4);
    expect(ready.body.teams.every((t: { group_name: string }) => t.group_name)).toBe(true);
  });

  it('sorteia semifinais e final: só os 4 classificados jogam; os 2 eliminados nos grupos ficam de fora', async () => {
    const semis = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: koPhaseId })
      .expect(201);
    expect(semis.body).toHaveLength(2);
    for (const m of semis.body as MatchRow[]) await play(teams, m);

    const final = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: koPhaseId })
      .expect(201);
    expect(final.body).toHaveLength(1);
    await play(teams, final.body[0]);

    const koTeams = new Set(
      (await listMatches(competitionId, koPhaseId)).flatMap((m) => [m.home_team_id, m.away_team_id]),
    );
    expect(koTeams.size).toBe(4);

    // quem terminou em 3º no seu grupo (T5 e T6 por rank) não passa
    for (const out of [teams[4], teams[5]]) expect(koTeams.has(out.teamId)).toBe(false);

    // campeão: a de menor rank
    const matches = await listMatches(competitionId, koPhaseId);
    const finalMatch = matches.find((m) => m.round_number === 2)!;
    expect([finalMatch.home_team_id, finalMatch.away_team_id]).toContain(teams[0].teamId);
  });

  it('limpa os dados', async () => {
    await cleanup(competitionId, teams);
  });
});

// ─── B) Suíço com eliminação por 2 derrotas ─────────────────────────────────

describe('B) Suíço: eliminado com 2 derrotas', () => {
  let competitionId: string;
  let teams: Team[];
  let phaseId: string;

  it('prepara 8 equipes e a fase suíça (padrão: 2 derrotas)', async () => {
    ({ competitionId, teams } = await setup('B', 8));
    const p = await authed(http().post(`/api/competitions/${competitionId}/phases`))
      .send({ phase_type: 'SWISS', sequence: 1 })
      .expect(201);
    phaseId = p.body.id;
    expect(p.body.max_losses).toBe(2);
    expect(p.body.legs).toBe(1);
  });

  it('joga rodada a rodada: eliminados não voltam e a fase termina com 1 equipe viva', async () => {
    const losses = new Map(teams.map((t) => [t.teamId, 0]));
    let rounds = 0;

    for (; rounds < 12; rounds++) {
      const res = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`)).send({
        phase_id: phaseId,
      });
      if (res.status === 400) break; // fase terminou
      expect(res.status).toBe(201);

      const created = res.body as MatchRow[];
      // ninguém eliminado (2 derrotas) joga de novo
      for (const m of created) {
        expect(losses.get(m.home_team_id)!).toBeLessThan(2);
        expect(losses.get(m.away_team_id)!).toBeLessThan(2);
      }
      // a rodada seguinte só sai com a atual encerrada
      await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
        .send({ phase_id: phaseId })
        .expect(400);

      for (const m of created) {
        const { loser } = await play(teams, m);
        losses.set(loser, losses.get(loser)! + 1);
      }
    }

    expect(rounds).toBeGreaterThanOrEqual(3);
    expect(rounds).toBeLessThan(12);

    // resta exatamente uma equipe com menos de 2 derrotas: a mais forte
    const alive = teams.filter((t) => losses.get(t.teamId)! < 2);
    expect(alive).toHaveLength(1);
    expect(alive[0].rank).toBe(1);
    // ninguém passou de 2 derrotas
    for (const l of losses.values()) expect(l).toBeLessThanOrEqual(2);
  });

  it('limpa os dados', async () => {
    await cleanup(competitionId, teams);
  });
});
