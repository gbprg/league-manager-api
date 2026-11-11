/**
 * Testes de robustez (E2E com banco real): validações, regras de fluxo e exclusões.
 *
 * Cada teste cria os próprios dados (nomes com timestamp) e limpa o que cria
 * (a exclusão da competição é em cascata).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';

let app: INestApplication;
let token: string;
const ts = Date.now();
const UPLOADS = join(process.cwd(), 'uploads');

const http = () => request(app.getHttpServer());
const authed = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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

async function newTeam(label: string): Promise<string> {
  const r = await authed(http().post('/api/teams')).send({ name: `H ${label} ${ts}` }).expect(201);
  return r.body.id;
}
async function newPlayer(label: string): Promise<string> {
  const r = await authed(http().post('/api/players'))
    .send({ full_name: `H ${label} ${ts}`, birth_date: '2010-01-01' })
    .expect(201);
  return r.body.id;
}

// ─── Paginação e validações ──────────────────────────────────────────────────

describe('Paginação e validações', () => {
  it('parâmetros de paginação inválidos não geram 500', async () => {
    for (const q of ['page=abc', 'page=-5&limit=-1', 'limit=abc', 'page=0']) {
      const res = await http().get(`/api/players?${q}`).expect(200);
      expect(res.body.meta.page).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.limit).toBeGreaterThanOrEqual(1);
    }
  });

  it('limite é limitado a 1000', async () => {
    const res = await http().get('/api/players?limit=100000').expect(200);
    expect(res.body.meta.limit).toBe(1000);
  });

  it('rejeita datas inexistentes, nomes vazios e nascimento no futuro', async () => {
    const base = { start_date: '2026-01-01', end_date: '2026-03-01', format: 'FASE_DE_GRUPOS' };
    await authed(http().post('/api/competitions')).send({ ...base, name: `H ${ts}`, start_date: '2026-02-31' }).expect(400);
    await authed(http().post('/api/competitions')).send({ ...base, name: '   ' }).expect(400);
    await authed(http().post('/api/teams')).send({ name: '' }).expect(400);
    await authed(http().post('/api/teams')).send({ name: '   ' }).expect(400);
    await authed(http().post('/api/players')).send({ full_name: '  ', birth_date: '2010-01-01' }).expect(400);
    await authed(http().post('/api/players')).send({ full_name: `H ${ts}`, birth_date: '2099-01-01' }).expect(400);
    await authed(http().post('/api/players')).send({ full_name: `H ${ts}`, birth_date: '2010-02-31' }).expect(400);
  });
});

// ─── Inscrições, exclusões e partidas ────────────────────────────────────────

describe('Fluxo de inscrições, exclusões e partidas', () => {
  let competitionId: string;
  let teamA: string;
  let teamB: string;
  let p1: string;
  let p2: string;
  let p3: string;
  let cp1: string;
  let phaseId: string;
  let matchId: string;

  it('prepara competição, equipes e jogadores', async () => {
    const c = await authed(http().post('/api/competitions'))
      .send({ name: `H Comp ${ts}`, start_date: '2026-01-01', end_date: '2026-03-01', format: 'PONTOS_CORRIDOS' })
      .expect(201);
    competitionId = c.body.id;
    teamA = await newTeam('A');
    teamB = await newTeam('B');
    p1 = await newPlayer('p1');
    p2 = await newPlayer('p2');
    p3 = await newPlayer('p3');
    for (const t of [teamA, teamB]) {
      await authed(http().post(`/api/competitions/${competitionId}/teams`)).send({ team_id: t }).expect(201);
    }
  });

  it('jogador rejeitado não fica preso: remover a inscrição libera para outra equipe', async () => {
    const r = await authed(http().post(`/api/competitions/${competitionId}/players`))
      .send({ player_id: p1, team_id: teamA })
      .expect(201);
    cp1 = r.body.id;

    await authed(http().patch(`/api/competition-players/${cp1}/reject`)).expect(200);
    // continua bloqueado em outra equipe enquanto a inscrição existir
    await authed(http().post(`/api/competitions/${competitionId}/players`))
      .send({ player_id: p1, team_id: teamB })
      .expect(409);

    await authed(http().delete(`/api/competition-players/${cp1}`)).expect(204);
    await authed(http().post(`/api/competitions/${competitionId}/players`))
      .send({ player_id: p1, team_id: teamB })
      .expect(201);
  });

  it('jogador inscrito não pode ser excluído; sem inscrição pode', async () => {
    await authed(http().delete(`/api/players/${p1}`)).expect(409);
    await authed(http().delete(`/api/players/${p3}`)).expect(204);
    await http().get(`/api/players/${p3}`).expect(404);
  });

  it('equipe inscrita não pode ser excluída', async () => {
    await authed(http().delete(`/api/teams/${teamA}`)).expect(409);
  });

  it('equipe com partidas não pode ser removida da competição', async () => {
    await authed(http().post(`/api/competitions/${competitionId}/players`))
      .send({ player_id: p2, team_id: teamA })
      .expect(201);
    for (const t of [teamA, teamB]) {
      await authed(http().patch(`/api/competitions/${competitionId}/teams/${t}/players/approve-all`)).expect(200);
      await authed(http().post(`/api/competitions/${competitionId}/teams/${t}/activate`)).expect(200);
    }
    const phase = await authed(http().post(`/api/competitions/${competitionId}/phases`))
      .send({ phase_type: 'LEAGUE', legs: 1 })
      .expect(201);
    phaseId = phase.body.id;
    const gen = await authed(http().post(`/api/competitions/${competitionId}/matches/generate`))
      .send({ phase_id: phaseId })
      .expect(201);
    matchId = gen.body[0].id;

    await authed(http().delete(`/api/competitions/${competitionId}/teams/${teamA}`)).expect(409);
  });

  it('não finaliza duas vezes; correção é o caminho para alterar', async () => {
    await authed(http().post(`/api/matches/${matchId}/result`)).send({ home_score: 2, away_score: 1 }).expect(201);
    await authed(http().post(`/api/matches/${matchId}/result`)).send({ home_score: 5, away_score: 5 }).expect(400);
    const fix = await authed(http().patch(`/api/matches/${matchId}/result`))
      .send({ home_score: 3, away_score: 1 })
      .expect(200);
    expect(fix.body.home_score).toBe(3);
  });

  it('PATCH da partida não altera placar nem encerra partida', async () => {
    const other = await authed(http().get(`/api/competitions/${competitionId}/matches?limit=50`)).expect(200);
    expect(other.body.data.length).toBe(1);

    // placar/estado de encerramento não são aceitos por PATCH
    await authed(http().patch(`/api/matches/${matchId}`)).send({ home_score: 9 }).expect(400);
    await authed(http().patch(`/api/matches/${matchId}`)).send({ status: 'FINALIZADA' }).expect(400);
    await authed(http().patch(`/api/matches/${matchId}`)).send({ status: 'WO' }).expect(400);
    // partida encerrada: só data/local
    await authed(http().patch(`/api/matches/${matchId}`)).send({ status: 'ADIADA' }).expect(400);
    await authed(http().patch(`/api/matches/${matchId}`))
      .send({ location: 'Campo Novo', scheduled_at: '2026-02-01T15:00:00.000Z' })
      .expect(200);
  });

  it('exclui a competição em cascata (jogos, inscrições) e depois equipes e jogadores', async () => {
    await authed(http().delete(`/api/competitions/${competitionId}`)).expect(204);
    await authed(http().get(`/api/competitions/admin/${competitionId}`)).expect(404);

    // sem inscrições/jogos, equipes e jogadores já podem ser excluídos
    await authed(http().delete(`/api/teams/${teamA}`)).expect(204);
    await authed(http().delete(`/api/teams/${teamB}`)).expect(204);
    await authed(http().delete(`/api/players/${p1}`)).expect(204);
    await authed(http().delete(`/api/players/${p2}`)).expect(204);
  });
});

// ─── Uploads ─────────────────────────────────────────────────────────────────

describe('Uploads de imagem', () => {
  let teamId: string;

  it('cria equipe', async () => {
    teamId = await newTeam('up');
  });

  it('arquivo de tipo inválido é recusado e não fica no disco', async () => {
    const before = readdirSync(UPLOADS).length;
    await authed(http().patch(`/api/teams/${teamId}/logo`))
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.html', contentType: 'text/html' })
      .expect(400);
    expect(readdirSync(UPLOADS).length).toBe(before);
  });

  it('upload para equipe inexistente não deixa arquivo órfão', async () => {
    const before = readdirSync(UPLOADS).length;
    await authed(http().patch(`/api/teams/00000000-0000-4000-8000-000000000000/logo`))
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
      .expect(404);
    expect(readdirSync(UPLOADS).length).toBe(before);
  });

  it('a extensão vem do tipo permitido, não do nome enviado', async () => {
    const res = await authed(http().patch(`/api/teams/${teamId}/logo`))
      .attach('file', PNG, { filename: 'malicioso.html', contentType: 'image/png' })
      .expect(200);
    expect(res.body.logo_url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
    expect(readdirSync(UPLOADS)).toContain(String(res.body.logo_url).replace('/uploads/', ''));
  });

  it('exclui a equipe e o arquivo do logo', async () => {
    const t = await http().get(`/api/teams/${teamId}`).expect(200);
    const file = join(UPLOADS, String(t.body.logo_url).replace('/uploads/', ''));
    expect(readdirSync(UPLOADS)).toContain(String(t.body.logo_url).replace('/uploads/', ''));
    await authed(http().delete(`/api/teams/${teamId}`)).expect(204);
    expect(readdirSync(UPLOADS)).not.toContain(file.split('/').pop());
  });
});

// ─── Elenco da equipe (jogadores pertencem a uma equipe) ─────────────────────

describe('Elenco da equipe', () => {
  let teamA: string;
  let teamB: string;
  const roster: string[] = [];
  let outsider: string;
  let comp1: string;
  let comp2: string;

  async function newCompetition(label: string): Promise<string> {
    const c = await authed(http().post('/api/competitions'))
      .send({ name: `H ${label} ${ts}`, start_date: '2026-01-01', end_date: '2026-03-01', format: 'PONTOS_CORRIDOS' })
      .expect(201);
    return c.body.id;
  }
  async function competitionPlayers(competitionId: string) {
    const r = await authed(http().get(`/api/competitions/${competitionId}/players?limit=1000`)).expect(200);
    return r.body.data as Array<{ player_id: string; team_id: string; shirt_number: number | null; registration_status: string }>;
  }

  it('cria equipes e atletas já vinculados ao elenco', async () => {
    teamA = await newTeam('rA');
    teamB = await newTeam('rB');
    for (const [i, n] of [10, 7, 1].entries()) {
      const p = await authed(http().post('/api/players'))
        .send({ full_name: `H atleta${i} ${ts}`, birth_date: '2010-01-01', team_id: teamA, shirt_number: n })
        .expect(201);
      expect(p.body.team_id).toBe(teamA);
      expect(p.body.shirt_number).toBe(n);
      roster.push(p.body.id);
    }
    const o = await authed(http().post('/api/players'))
      .send({ full_name: `H avulso ${ts}`, birth_date: '2010-01-01' })
      .expect(201);
    outsider = o.body.id;
    expect(o.body.team_id).toBeNull();
  });

  it('valida equipe inexistente e filtra por elenco / sem equipe', async () => {
    await authed(http().post('/api/players'))
      .send({ full_name: `H x ${ts}`, birth_date: '2010-01-01', team_id: '00000000-0000-4000-8000-000000000000' })
      .expect(400);
    await authed(http().get('/api/players?team_id=nao-e-uuid')).expect(400);

    const list = await http().get(`/api/players?team_id=${teamA}&limit=100`).expect(200);
    expect(list.body.data.map((p: { id: string }) => p.id).sort()).toEqual([...roster].sort());
    expect(list.body.data[0].team.name).toContain('rA');

    const none = await http().get('/api/players?team_id=none&limit=1000').expect(200);
    const ids = none.body.data.map((p: { id: string }) => p.id);
    expect(ids).toContain(outsider);
    for (const id of roster) expect(ids).not.toContain(id);
  });

  it('ao adicionar a equipe na competição, o elenco entra como PENDENTE com a camisa do cadastro', async () => {
    comp1 = await newCompetition('elenco1');
    await authed(http().post(`/api/competitions/${comp1}/teams`)).send({ team_id: teamA }).expect(201);

    const enrolled = await competitionPlayers(comp1);
    expect(enrolled).toHaveLength(3);
    expect(enrolled.every((e) => e.registration_status === 'PENDENTE' && e.team_id === teamA)).toBe(true);
    expect(enrolled.map((e) => e.shirt_number as number).sort((a, b) => a - b)).toEqual([1, 7, 10]);
  });

  it('atleta adicionado depois entra com "inscrever elenco"; quem já está inscrito é ignorado', async () => {
    const extra = await authed(http().post('/api/players'))
      .send({ full_name: `H extra ${ts}`, birth_date: '2010-01-01', team_id: teamA, shirt_number: 99 })
      .expect(201);
    roster.push(extra.body.id);

    const sync = await authed(http().post(`/api/competitions/${comp1}/teams/${teamA}/players/sync-roster`)).expect(200);
    expect(sync.body.enrolled).toBe(1);
    const again = await authed(http().post(`/api/competitions/${comp1}/teams/${teamA}/players/sync-roster`)).expect(200);
    expect(again.body.enrolled).toBe(0);
    expect(await competitionPlayers(comp1)).toHaveLength(4);
  });

  it('jogador do elenco de outra equipe não pode ser inscrito por outra equipe', async () => {
    await authed(http().post(`/api/competitions/${comp1}/teams`)).send({ team_id: teamB }).expect(201);
    await authed(http().post(`/api/competitions/${comp1}/players`))
      .send({ player_id: roster[0], team_id: teamB })
      .expect(409);
    // jogador sem equipe pode ser inscrito por qualquer uma
    await authed(http().post(`/api/competitions/${comp1}/players`))
      .send({ player_id: outsider, team_id: teamB })
      .expect(201);
  });

  it('próximo torneio: o elenco volta sem refazer o cadastro', async () => {
    await authed(http().patch(`/api/competitions/${comp1}/teams/${teamA}/players/approve-all`)).expect(200);
    await authed(http().post(`/api/competitions/${comp1}/teams/${teamA}/activate`)).expect(200);

    comp2 = await newCompetition('elenco2');
    await authed(http().post(`/api/competitions/${comp2}/teams`)).send({ team_id: teamA }).expect(201);
    const enrolled = await competitionPlayers(comp2);
    expect(enrolled).toHaveLength(4);
    expect(enrolled.every((e) => e.registration_status === 'PENDENTE')).toBe(true);
  });

  it('transferir e remover do elenco', async () => {
    const moved = await authed(http().patch(`/api/players/${roster[0]}`)).send({ team_id: teamB }).expect(200);
    expect(moved.body.team_id).toBe(teamB);
    const released = await authed(http().patch(`/api/players/${roster[0]}`)).send({ team_id: null }).expect(200);
    expect(released.body.team_id).toBeNull();
  });

  it('limpa os dados; excluir a equipe libera o elenco', async () => {
    await authed(http().delete(`/api/competitions/${comp1}`)).expect(204);
    await authed(http().delete(`/api/competitions/${comp2}`)).expect(204);
    await authed(http().delete(`/api/teams/${teamB}`)).expect(204);
    await authed(http().delete(`/api/teams/${teamA}`)).expect(204);

    const p = await http().get(`/api/players/${roster[1]}`).expect(200);
    expect(p.body.team_id).toBeNull(); // ON DELETE SET NULL
    for (const id of [...roster, outsider]) await authed(http().delete(`/api/players/${id}`)).expect(204);
  });
});
