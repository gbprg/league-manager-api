/**
 * Teste de fluxo completo (E2E com banco real)
 *
 * Pré-requisito: banco rodando e migração aplicada.
 *   npm run db:up && npm run migration:run && npm run seed:admin
 *
 * Execução:
 *   npm run test:e2e
 *
 * Os dados NÃO são apagados ao final — ficam no banco para inspeção manual.
 * Use nomes com timestamp para evitar conflito em re-execuções.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';

// ─── Shared state across tests ───────────────────────────────────────────────

let app: INestApplication;
let token: string;

const ts = Date.now();

let competitionId: string;
let team1Id: string;
let team2Id: string;
let player1Id: string; // time 1 — atacante
let player2Id: string; // time 1 — goleiro
let player3Id: string; // time 2 — atacante
let player4Id: string; // time 2 — goleiro
let compTeam1Id: string; // competition_team do time 1
let compTeam2Id: string; // competition_team do time 2
let compPlayer1Id: string;
let compPlayer2Id: string;
let compPlayer3Id: string;
let compPlayer4Id: string;
let phaseId: string;
let groupId: string;
let matchId: string;
let matchPlayer1Id: string; // escalação p1 na partida
let matchPlayer3Id: string; // escalação p3 na partida

// ─── App setup ───────────────────────────────────────────────────────────────

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

  // Garante que o admin existe no banco para o teste de login
  const ds = app.get<DataSource>(getDataSourceToken());
  const existing = await ds.query(
    `SELECT id FROM admin_users WHERE email = $1`,
    ['admin@example.com'],
  );
  if (existing.length === 0) {
    const hash = await argon2.hash('change-me-in-production');
    await ds.query(
      `INSERT INTO admin_users (name, email, password_hash) VALUES ($1, $2, $3)`,
      ['Administrador', 'admin@example.com', hash],
    );
  }
}, 30_000);

afterAll(async () => {
  await app.close();
});

// ─── 1. Autenticação ─────────────────────────────────────────────────────────

describe('1. Auth', () => {
  it('faz login e recebe JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'change-me-in-production' })
      .expect(200);

    expect(res.body.access_token).toBeDefined();
    token = res.body.access_token;
  });
});

// ─── 2. Competição ───────────────────────────────────────────────────────────

describe('2. Competição', () => {
  it('cria competição', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/competitions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Liga Teste ${ts}`,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        location: 'São Paulo',
        category: 'Adulto',
        format: 'FASE_DE_GRUPOS',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    competitionId = res.body.id;
    console.log('  competitionId:', competitionId);
  });

  it('publica a competição', async () => {
    await request(app.getHttpServer())
      .patch(`/api/competitions/${competitionId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

// ─── 3. Times ────────────────────────────────────────────────────────────────

describe('3. Times', () => {
  it('cria time 1 — Leões FC', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Leões FC ${ts}`, city: 'São Paulo' })
      .expect(201);

    team1Id = res.body.id;
    console.log('  team1Id:', team1Id);
  });

  it('cria time 2 — Águias SC', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Águias SC ${ts}`, city: 'Campinas' })
      .expect(201);

    team2Id = res.body.id;
    console.log('  team2Id:', team2Id);
  });
});

// ─── 4. Jogadores ────────────────────────────────────────────────────────────

describe('4. Jogadores', () => {
  it('cria jogador 1 — Ronaldo (time 1, atacante)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ full_name: `Ronaldo Teste ${ts}`, birth_date: '1995-03-15', position: 'ATAQUE' })
      .expect(201);

    player1Id = res.body.id;
    console.log('  player1Id:', player1Id);
  });

  it('cria jogador 2 — Dida (time 1, goleiro)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ full_name: `Dida Teste ${ts}`, birth_date: '1993-07-20', position: 'GOLEIRO' })
      .expect(201);

    player2Id = res.body.id;
  });

  it('cria jogador 3 — Adriano (time 2, atacante)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ full_name: `Adriano Teste ${ts}`, birth_date: '1996-11-05', position: 'ATAQUE' })
      .expect(201);

    player3Id = res.body.id;
    console.log('  player3Id:', player3Id);
  });

  it('cria jogador 4 — Júlio César (time 2, goleiro)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ full_name: `Júlio César Teste ${ts}`, birth_date: '1994-02-28', position: 'GOLEIRO' })
      .expect(201);

    player4Id = res.body.id;
  });
});

// ─── 5. Inscrição de times ───────────────────────────────────────────────────

describe('5. Adição de times (pendentes)', () => {
  it('adiciona time 1 (fica PENDENTE)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/teams`)
      .set('Authorization', `Bearer ${token}`)
      .send({ team_id: team1Id })
      .expect(201);

    expect(res.body.registration_status).toBe('PENDENTE');
    compTeam1Id = res.body.id;
    console.log('  compTeam1Id:', compTeam1Id);
  });

  it('adiciona time 2 (fica PENDENTE)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/teams`)
      .set('Authorization', `Bearer ${token}`)
      .send({ team_id: team2Id })
      .expect(201);

    compTeam2Id = res.body.id;
    console.log('  compTeam2Id:', compTeam2Id);
  });
});

// ─── 6. Inscrição de jogadores ───────────────────────────────────────────────

describe('6. Inscrição de jogadores', () => {
  it('inscreve jogador 1 no time 1', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ player_id: player1Id, team_id: team1Id, shirt_number: 9 })
      .expect(201);

    compPlayer1Id = res.body.id;
  });

  it('inscreve jogador 2 no time 1', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ player_id: player2Id, team_id: team1Id, shirt_number: 1 })
      .expect(201);

    compPlayer2Id = res.body.id;
  });

  it('inscreve jogador 3 no time 2', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ player_id: player3Id, team_id: team2Id, shirt_number: 10 })
      .expect(201);

    compPlayer3Id = res.body.id;
  });

  it('inscreve jogador 4 no time 2', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ player_id: player4Id, team_id: team2Id, shirt_number: 1 })
      .expect(201);

    compPlayer4Id = res.body.id;
  });

  it('não inscreve time sem jogador aprovado no torneio', async () => {
    await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/teams/${team1Id}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('aprova todos os jogadores de cada time de uma vez', async () => {
    for (const teamId of [team1Id, team2Id]) {
      const res = await request(app.getHttpServer())
        .patch(`/api/competitions/${competitionId}/teams/${teamId}/players/approve-all`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.approved).toBe(2);
    }
  });

  it('inscreve os times no torneio após aprovação', async () => {
    for (const teamId of [team1Id, team2Id]) {
      const res = await request(app.getHttpServer())
        .post(`/api/competitions/${competitionId}/teams/${teamId}/activate`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.registration_status).toBe('ATIVA');
    }
  });
});

// ─── 7. Fase e grupo ─────────────────────────────────────────────────────────

describe('7. Fase e grupo', () => {
  it('cria fase de grupos', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/phases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phase_type: 'GROUP', sequence: 1 })
      .expect(201);

    phaseId = res.body.id;
    console.log('  phaseId:', phaseId);
  });

  it('cria grupo A', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/phases/${phaseId}/groups`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Grupo A' })
      .expect(201);

    groupId = res.body.id;
    console.log('  groupId:', groupId);
  });

  it('adiciona time 1 ao grupo', async () => {
    await request(app.getHttpServer())
      .post(`/api/groups/${groupId}/teams`)
      .set('Authorization', `Bearer ${token}`)
      .send({ competition_team_id: compTeam1Id })
      .expect(201);
  });

  it('adiciona time 2 ao grupo', async () => {
    await request(app.getHttpServer())
      .post(`/api/groups/${groupId}/teams`)
      .set('Authorization', `Bearer ${token}`)
      .send({ competition_team_id: compTeam2Id })
      .expect(201);
  });
});

// ─── 8. Partida ──────────────────────────────────────────────────────────────

describe('8. Partida', () => {
  it('cria partida (time 1 x time 2)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/competitions/${competitionId}/matches`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        phase_id: phaseId,
        group_id: groupId,
        home_team_id: team1Id,
        away_team_id: team2Id,
        round_number: 1,
        scheduled_at: '2025-03-01T15:00:00Z',
        location: 'Estádio Municipal',
      })
      .expect(201);

    matchId = res.body.id;
    console.log('  matchId:', matchId);
  });

  it('escala jogador 1 (time 1 — titular, atacante)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ competition_player_id: compPlayer1Id, is_starter: true, is_goalkeeper: false })
      .expect(201);

    matchPlayer1Id = res.body.id;
  });

  it('escala jogador 2 (time 1 — titular, goleiro)', async () => {
    await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ competition_player_id: compPlayer2Id, is_starter: true, is_goalkeeper: true })
      .expect(201);
  });

  it('escala jogador 3 (time 2 — titular, atacante)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ competition_player_id: compPlayer3Id, is_starter: true, is_goalkeeper: false })
      .expect(201);

    matchPlayer3Id = res.body.id;
  });

  it('escala jogador 4 (time 2 — titular, goleiro)', async () => {
    await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/players`)
      .set('Authorization', `Bearer ${token}`)
      .send({ competition_player_id: compPlayer4Id, is_starter: true, is_goalkeeper: true })
      .expect(201);
  });
});

// ─── 9. Eventos da partida ───────────────────────────────────────────────────

describe('9. Eventos', () => {
  it('gol do jogador 1 (time 1) no minuto 23', async () => {
    await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/events`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        match_player_id: matchPlayer1Id,
        team_id: team1Id,
        event_type: 'GOAL',
      })
      .expect(201);
  });

  it('gol do jogador 1 (time 1) no minuto 55', async () => {
    await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/events`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        match_player_id: matchPlayer1Id,
        team_id: team1Id,
        event_type: 'GOAL',
      })
      .expect(201);
  });

  it('gol do jogador 3 (time 2) no minuto 70', async () => {
    await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/events`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        match_player_id: matchPlayer3Id,
        team_id: team2Id,
        event_type: 'GOAL',
      })
      .expect(201);
  });

  it('cartão amarelo no jogador 3 (time 2) no minuto 80', async () => {
    await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/events`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        match_player_id: matchPlayer3Id,
        team_id: team2Id,
        event_type: 'YELLOW_CARD',
      })
      .expect(201);
  });
});

// ─── 10. Finalização ─────────────────────────────────────────────────────────

describe('10. Resultado', () => {
  it('finaliza partida com placar 2x1', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/result`)
      .set('Authorization', `Bearer ${token}`)
      .send({ home_score: 2, away_score: 1 })
      .expect(201);

    expect(res.body.home_score).toBe(2);
    expect(res.body.away_score).toBe(1);
    expect(res.body.status).toBe('FINALIZADA');
  });
});

// ─── 11. Verificações públicas ───────────────────────────────────────────────

describe('11. Classificação e estatísticas', () => {
  it('retorna súmula da partida', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/matches/${matchId}/sumula`)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('retorna classificação do grupo', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/competitions/${competitionId}/standings`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    console.log('  standings:', JSON.stringify(res.body, null, 2));
  });

  it('retorna artilheiros', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/competitions/${competitionId}/top-scorers`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // jogador 1 marcou 2 gols
    const top = res.body[0];
    expect(top.goals).toBe(2);
    console.log('  top scorers:', JSON.stringify(res.body, null, 2));
  });

  it('retorna estatísticas gerais', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/competitions/${competitionId}/statistics`)
      .expect(200);

    expect(res.body).toBeDefined();
    console.log('  statistics:', JSON.stringify(res.body, null, 2));
  });
});
