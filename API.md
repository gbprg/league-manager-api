# League Manager API — Documentação

Base URL: `http://localhost:3000/api`

---

## Sumário

1. [Autenticação](#1-autenticação)
2. [Times](#2-times)
3. [Competições](#3-competições)
4. [Jogadores](#4-jogadores)
5. [Inscrições](#5-inscrições)
6. [Fases](#6-fases)
7. [Grupos](#7-grupos)
8. [Partidas](#8-partidas)
9. [Súmula e Resultados](#9-súmula-e-resultados)
10. [Classificação e Estatísticas](#10-classificação-e-estatísticas)
11. [Disciplinar](#11-disciplinar)
12. [Galeria de Fotos](#12-galeria-de-fotos)

---

## Convenções

### Autenticação

Rotas marcadas como **Admin** exigem o header:
```
Authorization: Bearer <token>
```

### Paginação

Todas as rotas de listagem aceitam:

| Query param | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | `integer` | `1` | Número da página |
| `limit` | `integer` | `20` | Itens por página (máx. 1000) |

Valores inválidos (`page=abc`, negativos) voltam ao padrão; não geram erro.

### Competições não publicadas

As listagens públicas de `/competitions/:competitionId/...` (equipes, jogadores, fases, regras, partidas, classificação, estatísticas, álbuns e suspensões ativas) respondem **404** para quem não é admin enquanto a competição não estiver publicada. O admin autenticado enxerga normalmente.

Resposta paginada:
```json
{
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Upload de imagens

Rotas de upload enviam `multipart/form-data` com o campo `file`.

- **Tipos aceitos:** JPEG, PNG, WEBP, GIF
- **Tamanho máximo:** 8 MB
- O arquivo é salvo em `./uploads/` e a URL retornada é `/uploads/<uuid>.<ext>`

### Busca textual

Os campos `search` usam `unaccent + ILIKE`: buscar `"joao"` encontra `"João"`, `"leoes"` encontra `"Leões FC"`, etc.

---

## 1. Autenticação

### `POST /auth/login`

Autentica um administrador e retorna um JWT válido por 8h.

**Body (JSON):**
```json
{
  "email": "admin@example.com",
  "password": "sua-senha"
}
```

**Resposta 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### `GET /auth/me` — Admin

Retorna os dados do administrador autenticado.

**Resposta 200:**
```json
{
  "id": "uuid",
  "name": "Administrador",
  "email": "admin@example.com"
}
```

---

## 2. Times

### `POST /teams` — Admin

Cria um novo time.

**Body (JSON):**
```json
{
  "name": "Flamengo",
  "manager_name": "João Silva",
  "city": "Rio de Janeiro"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string (máx. 150) | Sim | Nome do time |
| `manager_name` | string (máx. 150) | Não | Nome do responsável |
| `city` | string (máx. 100) | Não | Cidade |

**Resposta 201:** objeto `Team` (ver abaixo)

---

### `GET /teams` — Público

Lista times com paginação e filtros.

| Query param | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca por nome (sem acento) |
| `city` | string | Filtra por cidade (parcial, sem acento) |

**Resposta 200:** paginado com array de `Team`

**Objeto `Team`:**
```json
{
  "id": "uuid",
  "name": "Flamengo",
  "logo_url": "/uploads/abc123.png",
  "manager_name": "João Silva",
  "city": "Rio de Janeiro",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

---

### `GET /teams/:id` — Público

Retorna um time pelo ID.

**Resposta 200:** objeto `Team`

---

### `PATCH /teams/:id` — Admin

Atualiza dados do time. Aceita qualquer subconjunto dos campos de criação (exceto `logo_url`).

**Resposta 200:** objeto `Team` atualizado

---

### `PATCH /teams/:id/logo` — Admin

Faz upload do logo do time.

**Body:** `multipart/form-data`, campo `file`

**Resposta 200:** objeto `Team` com `logo_url` preenchido

---

### `DELETE /teams/:id/logo` — Admin

Remove o logo do time (apaga o arquivo e define `logo_url` como `null`).

**Resposta 200:** objeto `Team`

---

### `DELETE /players/:id` — Admin

Remove o jogador. **409** se estiver inscrito em alguma competição.

**Resposta 204:** sem corpo

---

### `DELETE /teams/:id` — Admin

Remove o time. Retorna **409** se a equipe estiver inscrita em alguma competição ou tiver partidas. O arquivo do logo só é apagado depois da exclusão no banco.

**Resposta 204:** sem corpo

---

## 3. Competições

### `POST /competitions` — Admin

Cria uma competição.

**Body (JSON):**
```json
{
  "name": "Copa São Paulo 2026",
  "description": "Descrição opcional",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "location": "São Paulo",
  "regulation": "Texto do regulamento",
  "max_teams": 16,
  "category": "Adulto",
  "format": "FASE_DE_GRUPOS",
  "status": "PLANEJADA",
  "points_win": 3,
  "points_draw": 1,
  "points_loss": 0,
  "is_published": false
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `name` | string (máx. 150) | Sim | — |
| `description` | string | Não | — |
| `start_date` | string ISO date | Sim | `YYYY-MM-DD` |
| `end_date` | string ISO date | Sim | `YYYY-MM-DD` |
| `location` | string (máx. 200) | Não | — |
| `regulation` | string | Não | — |
| `max_teams` | integer ≥ 2 | Não | — |
| `category` | string (máx. 100) | Não | — |
| `format` | enum | Não | `FASE_DE_GRUPOS`, `MATA_MATA`, `GRUPOS_MATA_MATA`, `PONTOS_CORRIDOS`, `ELIMINATORIA_SIMPLES`, `ELIMINATORIA_IDA_VOLTA` |
| `status` | enum | Não | `PLANEJADA`, `EM_ANDAMENTO`, `FINALIZADA`, `CANCELADA` |
| `points_win` | integer ≥ 0 | Não | Default `3` |
| `points_draw` | integer ≥ 0 | Não | Default `1` |
| `points_loss` | integer ≥ 0 | Não | Default `0` |
| `is_published` | boolean | Não | Default `false` |

**Resposta 201:** objeto `Competition`

---

### `GET /competitions` — Público

Lista apenas competições **publicadas** (`is_published = true`).

### `GET /competitions/admin` — Admin

Lista **todas** as competições (incluindo não publicadas).

Ambas aceitam:

| Query param | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca por nome (sem acento) |
| `status` | enum | `PLANEJADA`, `EM_ANDAMENTO`, `FINALIZADA`, `CANCELADA` |
| `category` | string | Busca parcial na categoria |
| `format` | enum | Formato da competição |

**Resposta 200:** paginado com array de `Competition`

**Objeto `Competition`:**
```json
{
  "id": "uuid",
  "name": "Copa São Paulo 2026",
  "description": "...",
  "logo_url": "/uploads/abc123.png",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "location": "São Paulo",
  "regulation": "...",
  "max_teams": 16,
  "category": "Adulto",
  "format": "FASE_DE_GRUPOS",
  "status": "EM_ANDAMENTO",
  "points_win": 3,
  "points_draw": 1,
  "points_loss": 0,
  "is_published": true,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

---

### `GET /competitions/:id` — Público
### `GET /competitions/admin/:id` — Admin

Retorna uma competição pelo ID. A rota pública exige `is_published = true`.

**Resposta 200:** objeto `Competition`

---

### `PATCH /competitions/:id` — Admin

Atualiza dados da competição. Aceita qualquer subconjunto dos campos de criação.

**Resposta 200:** objeto `Competition` atualizado

---

### `PATCH /competitions/:id/logo` — Admin

Upload do logo. **Body:** `multipart/form-data`, campo `file`.

**Resposta 200:** objeto `Competition`

---

### `DELETE /competitions/:id/logo` — Admin

Remove o logo.

**Resposta 200:** objeto `Competition`

---

### `PATCH /competitions/:id/publish` — Admin

Publica a competição (`is_published = true`).

**Resposta 200:** objeto `Competition`

---

### `PATCH /competitions/:id/unpublish` — Admin

Despublica a competição.

**Resposta 200:** objeto `Competition`

---

### `DELETE /competitions/:id` — Admin

Remove a competição e todos os dados relacionados em cascata.

**Resposta 204:** sem corpo

---

## 4. Jogadores

### `POST /players` — Admin

Cadastra um jogador.

**Body (JSON):**
```json
{
  "full_name": "Ronaldo Nazário",
  "birth_date": "1976-09-18",
  "document_number": "123.456.789-00",
  "position": "ATAQUE",
  "team_id": "uuid",
  "shirt_number": 9
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `full_name` | string (máx. 180) | Sim | — |
| `birth_date` | string ISO date | Sim | `YYYY-MM-DD` |
| `document_number` | string (CPF, 11 dígitos; aceita máscara, salvo só com dígitos) | Não | Validado com dígitos verificadores |
| `position` | enum | Não | `GOLEIRO`, `DEFESA`, `MEIO_CAMPO`, `ATAQUE` |
| `team_id` | UUID | Não | Equipe do elenco. Em `PATCH`, `null` tira o jogador do elenco |
| `shirt_number` | integer 1–99 | Não | Camisa padrão (usada ao inscrever na competição) |

**Elenco:** o jogador pertence a uma equipe (`team_id`) e isso vale para os próximos torneios. A inscrição em cada competição (`competition_players`) continua separada.

**Resposta 201:** objeto `Player` (com `team`)

---

### `GET /players` — Público

Lista jogadores com paginação e filtros.

| Query param | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca por nome (sem acento) |
| `position` | enum | `GOLEIRO`, `DEFESA`, `MEIO_CAMPO`, `ATAQUE` |
| `team_id` | UUID \| `none` | Elenco da equipe; `none` lista os jogadores sem equipe |

**Resposta 200:** paginado com array de `Player` (sem `document_number`, com `team`)

---

### `GET /players/:id` — Público

Retorna jogador sem `document_number`.

**Objeto `Player` (público):**
```json
{
  "id": "uuid",
  "full_name": "Ronaldo Nazário",
  "birth_date": "1976-09-18",
  "position": "ATAQUE",
  "photo_url": "/uploads/abc123.jpg",
  "created_at": "...",
  "updated_at": "..."
}
```

---

### `GET /players/admin/:id` — Admin

Retorna jogador **com** `document_number`.

---

### `PATCH /players/:id` — Admin

Atualiza dados do jogador (sem foto).

---

### `PATCH /players/:id/photo` — Admin

Upload da foto do jogador. **Body:** `multipart/form-data`, campo `file`.

**Resposta 200:** objeto `Player`

---

### `DELETE /players/:id/photo` — Admin

Remove a foto.

**Resposta 200:** objeto `Player`

---

## 5. Inscrições

### `POST /competitions/:competitionId/teams` — Admin

Adiciona um time à competição com status `PENDENTE`. O **elenco** da equipe (jogadores com `team_id` dela) já é inscrito como `PENDENTE`, com a camisa padrão do cadastro; falta só aprovar. O time só participa do torneio (`ATIVA`) depois de ter jogador aprovado e ser inscrito via `/activate`.

**Body (JSON):**
```json
{ "team_id": "uuid" }
```

**Resposta 201:** objeto `CompetitionTeam`

```json
{
  "id": "uuid",
  "competition_id": "uuid",
  "team_id": "uuid",
  "registration_status": "PENDENTE",
  "registered_at": "...",
  "team": { /* objeto Team */ }
}
```

---

### `GET /competitions/:competitionId/teams` — Público

Lista times inscritos com paginação e filtros.

| Query param | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca por nome do time |
| `status` | enum/lista | `ATIVA` (default), `PENDENTE`, `REMOVIDA`; aceita lista separada por vírgula (`ATIVA,PENDENTE`) |

**Resposta 200:** paginado com array de `CompetitionTeam`

---

### `POST /competitions/:competitionId/teams/:teamId/activate` — Admin

Inscreve o time no torneio (`PENDENTE` → `ATIVA`). Exige ao menos um jogador `APROVADA` e respeita `max_teams`. Retorna 400 caso contrário.

**Resposta 200:** objeto `CompetitionTeam`

---

### `POST /competitions/:competitionId/teams/:teamId/players/sync-roster` — Admin

Inscreve (como `PENDENTE`) os jogadores do elenco que ainda não estão na competição, por exemplo um atleta cadastrado depois de a equipe ser adicionada. Quem já está inscrito é ignorado.

**Resposta 200:** `{ "enrolled": 2 }`

---

### `PATCH /competitions/:competitionId/teams/:teamId/players/approve-all` — Admin

Aprova de uma vez todos os jogadores `PENDENTE` do time na competição.

**Resposta 200:** `{ "approved": 12 }`

---

### `DELETE /competitions/:competitionId/teams/:teamId` — Admin

Remove o time da competição (muda status para `REMOVIDA`).

**Resposta 204:** sem corpo

---

### `POST /competitions/:competitionId/players` — Admin

Inscreve um jogador numa competição. O jogador entra com status `PENDENTE` e precisa ser aprovado.

O jogador que pertence ao elenco de **outra** equipe retorna **409** (transfira-o no cadastro antes). Jogador sem equipe pode ser inscrito por qualquer uma. Sem `shirt_number`, usa a camisa padrão do cadastro.

**Body (JSON):**
```json
{
  "player_id": "uuid",
  "team_id": "uuid",
  "shirt_number": 10
}
```

| Campo | Tipo | Obrigatório |
|---|---|---|
| `player_id` | UUID | Sim |
| `team_id` | UUID | Sim — deve estar inscrito e ativo |
| `shirt_number` | integer 1–99 | Não |

**Resposta 201:** objeto `CompetitionPlayer`

```json
{
  "id": "uuid",
  "competition_id": "uuid",
  "team_id": "uuid",
  "player_id": "uuid",
  "registration_status": "PENDENTE",
  "shirt_number": 10,
  "approved_at": null,
  "created_at": "...",
  "updated_at": "...",
  "player": { /* objeto Player */ },
  "team": { /* objeto Team */ }
}
```

---

### `GET /competitions/:competitionId/players` — Público

Lista jogadores inscritos com paginação e filtros.

| Query param | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca por nome do jogador |
| `team_id` | UUID | Filtra por time |
| `status` | enum | `PENDENTE`, `APROVADA`, `REJEITADA` |

**Resposta 200:** paginado com array de `CompetitionPlayer`

---

### `PATCH /competition-players/:id/approve` — Admin

Aprova a inscrição de um jogador.

**Resposta 200:** objeto `CompetitionPlayer` com `registration_status: "APROVADA"` e `approved_at` preenchido

---

### `DELETE /competition-players/:id` — Admin

Remove a inscrição de um jogador (ex.: inscrito na equipe errada). **409** se o jogador já foi relacionado em alguma súmula ou tem registro disciplinar (nesse caso, rejeite). **400** se for o último jogador aprovado de uma equipe já inscrita no torneio.

**Resposta 204:** sem corpo

---

### `PATCH /competition-players/:id/reject` — Admin

Rejeita a inscrição.

**Resposta 200:** objeto `CompetitionPlayer` com `registration_status: "REJEITADA"`

---

## 6. Fases

### `POST /competitions/:competitionId/phases` — Admin

Cria uma fase da competição.

**Body (JSON):**
```json
{
  "phase_type": "GROUP",
  "sequence": 1,
  "qualification_count": 2,
  "legs": 1
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `phase_type` | enum | Não | `GROUP`, `KNOCKOUT`, `LEAGUE`, `SWISS` |
| `sequence` | integer ≥ 1 | Não | Auto-incrementado se omitido |
| `qualification_count` | integer ≥ 1 | Não | Classificados por grupo |
| `legs` | integer 1–2 | Não | `1` = jogo único, `2` = ida e volta |

**Resposta 201:** objeto `CompetitionPhase`

```json
{
  "id": "uuid",
  "competition_id": "uuid",
  "phase_type": "GROUP",
  "sequence": 1,
  "qualification_count": 2,
  "legs": 1,
  "created_at": "...",
  "updated_at": "...",
  "groups": [ /* array de CompetitionGroup */ ]
}
```

---

`SWISS` (suíço com eliminação por derrotas) aceita `max_losses` (1–5, padrão 2) e sempre usa jogo único.

---

### `GET /competitions/:competitionId/phases/:phaseId/participants` — Admin

Equipes que participam (ou participarão) da fase: se ela já tem jogos, as equipes dos jogos; senão as inscritas (1ª fase) ou as classificadas da fase anterior.

**Resposta 200:** `{ "ready": true, "started": false, "from_previous": true, "teams": [{ "team_id", "team_name", "group_name" }] }`.
Com `ready: false` vem `reason` explicando o que falta (ex.: "A fase anterior ainda tem 3 jogo(s) sem resultado.").

---

### `GET /competitions/:competitionId/phases` — Público

Retorna as fases ordenadas por `sequence`, com grupos e times do grupo incluídos.

**Resposta 200:** array de `CompetitionPhase`

---

### `GET /phases/:id` — Público

Retorna uma fase com seus grupos.

---

### `PATCH /phases/:id` — Admin

Atualiza uma fase.

---

### `DELETE /phases/:id` — Admin

Remove a fase e suas partidas/grupos em cascata.

**Resposta 204:** sem corpo

---

### `PATCH /competitions/:competitionId/phases/reorder` — Admin

Reordena as fases.

**Body (JSON):**
```json
{ "ordered_ids": ["uuid-fase-1", "uuid-fase-2", "uuid-fase-3"] }
```

**Resposta 200:** array de `CompetitionPhase` com `sequence` atualizado

---

### `GET /competitions/:competitionId/rules` — Público

Retorna as regras de desempate configuradas.

**Resposta 200:** array de `CompetitionRule`
```json
[
  {
    "id": "uuid",
    "competition_id": "uuid",
    "rule_type": "tiebreaker_order",
    "rule_value": { "order": ["points", "goal_diff", "goals_for", "wins", "name"] }
  }
]
```

---

### `PATCH /competitions/:competitionId/rules/:ruleType` — Admin

Atualiza uma regra específica.

**Body (JSON):** objeto arbitrário com o valor da regra.

Exemplo para `tiebreaker_order`:
```json
{ "order": ["points", "wins", "goal_diff", "goals_for", "name"] }
```

**Resposta 200:** objeto `CompetitionRule`

---

## 7. Grupos

### `POST /phases/:phaseId/groups` — Admin

Cria um grupo dentro de uma fase.

**Body (JSON):**
```json
{ "name": "Grupo A" }
```

**Resposta 201:** objeto `CompetitionGroup`

```json
{
  "id": "uuid",
  "phase_id": "uuid",
  "name": "Grupo A",
  "created_at": "...",
  "group_teams": []
}
```

---

### `POST /phases/:phaseId/groups/auto` — Admin

Monta os grupos de uma vez: cria `groups_count` grupos (Grupo A, B, ...) e distribui as equipes que participam da fase (todas as inscritas na 1ª fase; as classificadas nas seguintes), em partes iguais.

**Body:** `{ "groups_count": 2, "shuffle": true }` (`shuffle` padrão `true`)

**Erros:** 409 se a fase já tem grupos; 400 se cada grupo ficar com menos de 2 equipes.

**Resposta 201:** lista de grupos com as equipes.

---

### `GET /phases/:phaseId/groups` — Público

Lista grupos da fase com times.

---

### `GET /groups/:id` — Público

Retorna um grupo com seus times.

---

### `PATCH /groups/:id` — Admin

Atualiza o nome do grupo.

---

### `DELETE /groups/:id` — Admin

Remove o grupo.

**Resposta 204:** sem corpo

---

### `POST /groups/:groupId/teams` — Admin

Adiciona um time ao grupo.

**Body (JSON):**
```json
{ "competition_team_id": "uuid" }
```

O `competition_team_id` é o ID da inscrição do time na competição (retornado em `/competitions/:id/teams`).

**Resposta 201:** objeto `CompetitionGroupTeam`

---

### `DELETE /groups/:groupId/teams/:competitionTeamId` — Admin

Remove um time do grupo.

**Resposta 204:** sem corpo

---

## 8. Partidas

### `POST /competitions/:competitionId/matches` — Admin

Cria uma partida manualmente.

**Body (JSON):**
```json
{
  "phase_id": "uuid",
  "group_id": "uuid",
  "home_team_id": "uuid",
  "away_team_id": "uuid",
  "round_number": 1,
  "scheduled_at": "2026-03-01T15:00:00Z",
  "location": "Estádio Municipal"
}
```

| Campo | Tipo | Obrigatório |
|---|---|---|
| `phase_id` | UUID | Sim |
| `group_id` | UUID | Não |
| `home_team_id` | UUID | Sim — deve estar inscrito na competição |
| `away_team_id` | UUID | Sim — deve estar inscrito na competição |
| `round_number` | integer ≥ 1 | Não |
| `scheduled_at` | datetime ISO | Não |
| `location` | string (máx. 200) | Não |

**Resposta 201:** objeto `Match`

---

### `GET /competitions/:competitionId/matches` — Público

Lista partidas com paginação e filtros.

| Query param | Tipo | Descrição |
|---|---|---|
| `phase_id` | UUID | Filtra por fase |
| `group_id` | UUID | Filtra por grupo |
| `round_number` | integer | Filtra por rodada |
| `status` | enum | `AGENDADA`, `FINALIZADA`, `ADIADA`, `CANCELADA`, `WO` |
| `team_id` | UUID | Partidas de um time (mandante **ou** visitante) |

> Para listar apenas **súmulas** (partidas finalizadas), use `?status=FINALIZADA`.

**Resposta 200:** paginado com array de `Match`

**Objeto `Match`:**
```json
{
  "id": "uuid",
  "competition_id": "uuid",
  "phase_id": "uuid",
  "group_id": "uuid",
  "home_team_id": "uuid",
  "away_team_id": "uuid",
  "round_number": 1,
  "tie_id": null,
  "leg_number": 1,
  "scheduled_at": "2026-03-01T15:00:00.000Z",
  "location": "Estádio Municipal",
  "home_score": 2,
  "away_score": 1,
  "status": "FINALIZADA",
  "created_at": "...",
  "updated_at": "...",
  "phase": { /* CompetitionPhase */ },
  "group": { /* CompetitionGroup ou null */ },
  "home_team": { /* Team */ },
  "away_team": { /* Team */ }
}
```

---

### `GET /matches/:id` — Público

Retorna uma partida pelo ID.

---

### `PATCH /matches/:id` — Admin

Atualiza dados da partida (data, local, times, rodada) e o status entre `AGENDADA`, `ADIADA` e `CANCELADA`. **Não** altera placar nem encerra a partida (`FINALIZADA`/`WO`): use `POST/PATCH /matches/:id/result` e `POST /matches/:id/walkover`. Partida encerrada só aceita ajuste de `scheduled_at` e `location` (400 nos demais campos).

---

### `DELETE /matches/:id` — Admin

Remove uma partida. Não é possível remover partidas com status `FINALIZADA`.

**Resposta 204:** sem corpo

---

### `POST /competitions/:competitionId/matches/generate` — Admin

Gera partidas automaticamente: round-robin para fases `GROUP`/`LEAGUE`, chaveamento para `KNOCKOUT` e rodadas para `SWISS` (ver abaixo).

**Body (JSON):**
```json
{
  "phase_id": "uuid",
  "group_id": "uuid",
  "location": "Estádio Municipal"
}
```

| Campo | Tipo | Obrigatório |
|---|---|---|
| `phase_id` | UUID | Sim |
| `group_id` | UUID | Não — se omitido, gera para todos os grupos |
| `location` | string | Não |

> Partidas não finalizadas do mesmo escopo são deletadas antes de gerar.

**Resposta 201:** array de `Match` criadas

#### Fase `SWISS` (suíço com eliminação por derrotas)

Cada chamada gera **uma rodada**. A 1ª sorteia as equipes participantes; as seguintes cruzam as equipes ainda vivas com campanha parecida (menos derrotas / mais vitórias primeiro), evitando repetir adversário quando possível. A equipe com `max_losses` derrotas está eliminada. Número ímpar de equipes vivas: uma folga na rodada (quem menos folgou). Jogos empatados exigem pênaltis (como no mata-mata). A rodada seguinte só sai com a atual encerrada. Termina quando resta 1 equipe viva (a chamada passa a retornar 400).

#### Fase `KNOCKOUT` (eliminatória)

Cada chamada gera **uma rodada**:

- **Sem jogos na fase:** sorteia aleatoriamente os confrontos da 1ª rodada entre os classificados da fase anterior (`qualification_count` por grupo em `GROUP`, ou no geral em `LEAGUE`). Evita, quando possível, cruzar equipes do mesmo grupo. Sem fase anterior, usa todas as equipes `ATIVA`. Exige que a fase anterior esteja totalmente finalizada e que o nº de classificados seja potência de 2 (2, 4, 8, 16).
- **Com jogos na fase:** exige a rodada atual encerrada e gera a próxima com os vencedores, na ordem do chaveamento (vencedor do jogo 1 × vencedor do jogo 2…). Com `legs = 2` o vencedor sai do agregado; se empatar, decide pelos pênaltis do jogo decisivo. Jogo pendente, confronto empatado sem pênaltis ou campeão já definido retornam 400. Para refazer o sorteio, exclua os jogos da rodada.

---

## 9. Súmula e Resultados

### `PATCH /competitions/:competitionId/matches/schedule` — Admin

Define data/hora e/ou local de várias partidas de uma vez. Só altera partidas `AGENDADA` ou `ADIADA`.

**Body (JSON):**
```json
{
  "phase_id": "uuid",
  "group_id": "uuid (opcional)",
  "round_number": 3,
  "scheduled_at": "2026-11-14T09:00:00-03:00",
  "interval_minutes": 60,
  "location": "Campo 1"
}
```

`scheduled_at` e/ou `location` são obrigatórios (ao menos um). Com `interval_minutes`, cada jogo sai X minutos depois do anterior.

**Resposta 200:** `{ "updated": 5 }`

---

### `POST /matches/:matchId/players/bulk` — Admin

Relaciona na súmula todos os jogadores `APROVADA` da equipe que ainda não estão relacionados (como titulares).

**Body:** `{ "team_id": "uuid" }` — **Resposta 200:** `{ "added": 11 }`

---

### `PATCH /matches/:matchId/players/:matchPlayerId` — Admin

Altera `is_starter` e/ou `is_goalkeeper` de um jogador relacionado.

---

### `POST /matches/:matchId/walkover` — Admin

Registra W.O.: status `WO` e placar para o vencedor (padrão 3 × 0). Retorna 400 se a partida já estiver encerrada ou cancelada.

**Body:** `{ "winner_team_id": "uuid", "winner_goals": 3 }` (`winner_goals` opcional, 1–20)

---

### `GET /matches/:matchId/sumula` — Público

Retorna a súmula completa da partida.

**Resposta 200:**
```json
{
  "match": { /* objeto Match completo */ },
  "home_players": [ /* array de MatchPlayer */ ],
  "away_players": [ /* array de MatchPlayer */ ],
  "events": [ /* array de MatchEvent ordenado por minuto */ ]
}
```

---

### `GET /matches/:matchId/players` — Público

Lista os jogadores escalados na partida.

**Resposta 200:** array de `MatchPlayer`

```json
[
  {
    "id": "uuid",
    "match_id": "uuid",
    "competition_player_id": "uuid",
    "is_starter": true,
    "is_goalkeeper": false,
    "created_at": "...",
    "competition_player": {
      "id": "uuid",
      "shirt_number": 9,
      "player": { /* objeto Player */ },
      "team": { /* objeto Team */ }
    }
  }
]
```

---

### `POST /matches/:matchId/players` — Admin

Adiciona um jogador à escalação.

**Body (JSON):**
```json
{
  "competition_player_id": "uuid",
  "is_starter": true,
  "is_goalkeeper": false
}
```

> `competition_player_id` é o ID retornado em `/competitions/:id/players` (inscrição aprovada).

**Resposta 201:** objeto `MatchPlayer`

---

### `DELETE /matches/:matchId/players/:matchPlayerId` — Admin

Remove um jogador da escalação.

**Resposta 204:** sem corpo

---

### `GET /matches/:matchId/events` — Público

Lista os eventos da partida ordenados por minuto.

**Resposta 200:** array de `MatchEvent`

```json
[
  {
    "id": "uuid",
    "match_id": "uuid",
    "match_player_id": "uuid",
    "team_id": "uuid",
    "event_type": "GOAL",
    "description": null,
    "created_at": "...",
    "team": { /* objeto Team */ },
    "match_player": { /* objeto MatchPlayer ou null */ }
  }
]
```

**Tipos de evento (`event_type`):**

| Valor | Descrição |
|---|---|
| `GOAL` | Gol |
| `OWN_GOAL` | Gol contra |
| `YELLOW_CARD` | Cartão amarelo |
| `RED_CARD` | Cartão vermelho |
| `PENALTY_MISS` | Pênalti perdido |

---

### `POST /matches/:matchId/events` — Admin

Registra um evento na partida.

**Body (JSON):**
```json
{
  "match_player_id": "uuid",
  "team_id": "uuid",
  "event_type": "GOAL",
  "description": "Gol de cabeça"
}
```

| Campo | Tipo | Obrigatório |
|---|---|---|
| `match_player_id` | UUID | Não — omitir para evento sem jogador específico |
| `team_id` | UUID | Sim |
| `event_type` | enum | Sim |
| `description` | string | Não |

**Resposta 201:** objeto `MatchEvent`

---

### `DELETE /match-events/:eventId` — Admin

Remove um evento.

**Resposta 204:** sem corpo

---

### `POST /matches/:matchId/result` — Admin

Finaliza a partida com o placar. Retorna **400** se a partida já estiver encerrada (`FINALIZADA`/`WO`) — nesse caso use `PATCH /matches/:matchId/result`.

**Body (JSON):**
```json
{
  "home_score": 2,
  "away_score": 1,
  "override_home_score": null,
  "override_away_score": null
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `home_score` | integer ≥ 0 | Sim | Placar do mandante |
| `away_score` | integer ≥ 0 | Sim | Placar do visitante |
| `override_home_score` | integer ≥ 0 | Não | Placar administrativo (WO) |
| `override_away_score` | integer ≥ 0 | Não | Placar administrativo (WO) |
| `home_penalty_score` | integer 0–50 | Condicional | Pênaltis do mandante |
| `away_penalty_score` | integer 0–50 | Condicional | Pênaltis do visitante |

**Pênaltis (mata-mata):** em fase `KNOCKOUT`, se o jogo decisivo do confronto terminar empatado (jogo único, ou 2º jogo com agregado empatado), `home_penalty_score` e `away_penalty_score` são **obrigatórios** e não podem empatar. Fora desse caso, informá-los retorna 400. Os pênaltis não contam como gols nem entram na classificação; o vencedor do confronto (e a geração da próxima rodada) usa o resultado dos pênaltis.

**Resposta 201:** objeto `Match` com `status: "FINALIZADA"` (inclui `home_penalty_score` / `away_penalty_score`, ou `null`)

---

### `PATCH /matches/:matchId/result` — Admin

Corrige o resultado de uma partida já finalizada.

**Body:** mesmo formato de `POST /result`

**Resposta 200:** objeto `Match` atualizado

---

## 10. Classificação e Estatísticas

Todas as rotas abaixo são **públicas** e não têm paginação (são agregações calculadas).

---

### `GET /competitions/:competitionId/standings`

Retorna a tabela de classificação. Desempate configurável via regras da competição (default: pontos → saldo → gols pró → vitórias → nome).

**Query params:** `group_id` (opcional) — filtra por grupo; `phase_id` (opcional) — filtra por fase. Jogos de fases eliminatórias (`KNOCKOUT`) não entram na tabela.

**Resposta 200:** array de `StandingRow`

```json
[
  {
    "team_id": "uuid",
    "team_name": "Flamengo",
    "group_id": "uuid",
    "group_name": "Grupo A",
    "position": 1,
    "played": 3,
    "wins": 2,
    "draws": 1,
    "losses": 0,
    "goals_for": 7,
    "goals_against": 2,
    "goal_diff": 5,
    "points": 7
  }
]
```

---

### `GET /competitions/:competitionId/top-scorers`

Artilheiros da competição, ordenados por gols.

**Resposta 200:**
```json
[
  {
    "player_id": "uuid",
    "player_name": "Ronaldo",
    "team_id": "uuid",
    "team_name": "Flamengo",
    "goals": 5
  }
]
```

> Gols contra (`OWN_GOAL`) não são contados na artilharia.

---

### `GET /competitions/:competitionId/goalkeepers`

Goleiros menos vazados, ordenados por gols sofridos (asc), depois por clean sheets (desc).

**Resposta 200:**
```json
[
  {
    "player_id": "uuid",
    "player_name": "Dida",
    "team_id": "uuid",
    "team_name": "Milan",
    "matches_played": 5,
    "goals_conceded": 2,
    "clean_sheets": 3
  }
]
```

---

### `GET /competitions/:competitionId/red-cards`

Ranking de cartões vermelhos.

**Resposta 200:**
```json
[
  {
    "player_id": "uuid",
    "player_name": "Zidane",
    "team_id": "uuid",
    "team_name": "França",
    "red_cards": 2
  }
]
```

---

### `GET /competitions/:competitionId/statistics`

Estatísticas consolidadas da competição.

**Resposta 200:**
```json
{
  "top_scorers": [ /* array TopScorer */ ],
  "goalkeepers": [ /* array GoalkeeperStat */ ],
  "red_cards": [ /* array RedCardStat */ ],
  "most_wins": [
    { "team_id": "uuid", "team_name": "Flamengo", "wins": 5 }
  ]
}
```

---

## 11. Disciplinar

### `POST /competitions/:competitionId/disciplinary` — Admin

Registra uma ocorrência disciplinar.

**Body (JSON):**
```json
{
  "competition_player_id": "uuid",
  "match_id": "uuid",
  "record_type": "SUSPENSAO",
  "description": "Expulsão por conduta violenta",
  "games_total": 3
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `competition_player_id` | UUID | Sim | Inscrição do jogador |
| `match_id` | UUID | Não | Partida de origem |
| `record_type` | enum | Sim | `ADVERTENCIA`, `MULTA`, `SUSPENSAO` |
| `description` | string | Não | — |
| `games_total` | integer | Obrigatório se `SUSPENSAO` | Número de jogos de suspensão |

**Resposta 201:** objeto `DisciplinaryRecord`

```json
{
  "id": "uuid",
  "competition_id": "uuid",
  "competition_player_id": "uuid",
  "match_id": "uuid",
  "record_type": "SUSPENSAO",
  "description": "...",
  "created_at": "...",
  "updated_at": "...",
  "competition_player": {
    "player": { /* objeto Player */ },
    "team": { /* objeto Team */ }
  },
  "match": { /* objeto Match ou null */ },
  "suspension": {
    "id": "uuid",
    "record_id": "uuid",
    "games_total": 3,
    "games_served": 0
  }
}
```

---

### `GET /competitions/:competitionId/disciplinary` — Admin

Lista registros disciplinares com paginação e filtros.

| Query param | Tipo | Descrição |
|---|---|---|
| `record_type` | enum | `ADVERTENCIA`, `MULTA`, `SUSPENSAO` |
| `team_id` | UUID | Registros de um time |
| `player_id` | UUID | Registros de um jogador |

**Resposta 200:** paginado com array de `DisciplinaryRecord`

---

### `GET /disciplinary/:id` — Admin

Retorna um registro pelo ID.

---

### `PATCH /disciplinary/:id` — Admin

Atualiza descrição ou tipo do registro.

---

### `DELETE /disciplinary/:id` — Admin

Remove o registro.

**Resposta 204:** sem corpo

---

### `GET /competitions/:competitionId/disciplinary/suspensions/active` — Público

Lista suspensões ainda não cumpridas integralmente (`games_served < games_total`).

**Resposta 200:** array de `DisciplinaryRecord` com suspensão ativa

---

### `PATCH /disciplinary/suspensions/:id/serve` — Admin

Registra um jogo cumprido da suspensão (`games_served + 1`).

**Resposta 200:** objeto `DisciplinarySuspension`

---

### `PATCH /disciplinary/suspensions/:id/unserve` — Admin

Desfaz o último jogo registrado (`games_served - 1`).

**Resposta 200:** objeto `DisciplinarySuspension`

---

## 12. Galeria de Fotos

### `POST /competitions/:competitionId/albums` — Admin

Cria um álbum de fotos para a competição.

**Body (JSON):**
```json
{
  "title": "Final da Copa",
  "description": "Fotos da grande final"
}
```

**Resposta 201:** objeto `PhotoAlbum`

```json
{
  "id": "uuid",
  "competition_id": "uuid",
  "title": "Final da Copa",
  "description": "...",
  "created_at": "...",
  "updated_at": "...",
  "photos": []
}
```

---

### `GET /competitions/:competitionId/albums` — Público

Lista álbuns com paginação e filtro.

| Query param | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca por título (sem acento) |

**Resposta 200:** paginado com array de `PhotoAlbum` (cada álbum inclui suas fotos)

---

### `GET /albums/:id` — Público

Retorna um álbum com todas as suas fotos.

**Resposta 200:** objeto `PhotoAlbum` com `photos`:
```json
{
  "id": "uuid",
  "title": "Final da Copa",
  "photos": [
    {
      "id": "uuid",
      "album_id": "uuid",
      "image_url": "/uploads/abc123.jpg",
      "caption": "Levantamento da taça",
      "created_at": "..."
    }
  ]
}
```

---

### `PATCH /albums/:id` — Admin

Atualiza título ou descrição do álbum.

---

### `DELETE /albums/:id` — Admin

Remove o álbum e apaga todos os arquivos de foto do disco.

**Resposta 204:** sem corpo

---

### `POST /albums/:albumId/photos` — Admin

Faz upload de uma foto para o álbum.

**Body:** `multipart/form-data`, campo `file`

**Query param:** `caption` (opcional) — legenda da foto

Exemplo:
```
POST /api/albums/uuid/photos?caption=Levantamento%20da%20ta%C3%A7a
Content-Type: multipart/form-data

file: [arquivo binário]
```

**Resposta 201:** objeto `Photo`

---

### `DELETE /photos/:id` — Admin

Remove uma foto e apaga o arquivo do disco.

**Resposta 204:** sem corpo

---

## Enums de Referência

| Enum | Valores |
|---|---|
| `CompetitionStatus` | `PLANEJADA`, `EM_ANDAMENTO`, `FINALIZADA`, `CANCELADA` |
| `CompetitionFormat` | `FASE_DE_GRUPOS`, `MATA_MATA`, `GRUPOS_MATA_MATA`, `PONTOS_CORRIDOS`, `ELIMINATORIA_SIMPLES`, `ELIMINATORIA_IDA_VOLTA` |
| `PhaseType` | `GROUP`, `KNOCKOUT`, `LEAGUE`, `SWISS` |
| `MatchStatus` | `AGENDADA`, `FINALIZADA`, `ADIADA`, `CANCELADA`, `WO` |
| `PlayerPosition` | `GOLEIRO`, `DEFESA`, `MEIO_CAMPO`, `ATAQUE` |
| `PlayerRegistrationStatus` | `PENDENTE`, `APROVADA`, `REJEITADA` |
| `TeamRegistrationStatus` | `ATIVA`, `REMOVIDA` |
| `RecordType` | `ADVERTENCIA`, `MULTA`, `SUSPENSAO` |
| `EventType` | `GOAL`, `OWN_GOAL`, `YELLOW_CARD`, `RED_CARD`, `PENALTY_MISS` |
