# League Manager — API

API do sistema de gestão de torneios de futebol (equipes, elencos, competições, fases, calendário, súmula,
classificação, disciplina e galeria de fotos). O frontend fica em [`../league-manager-web`](../league-manager-web).

**Stack:** NestJS 12 · TypeScript (ESM) · TypeORM · PostgreSQL · JWT (argon2) · Vitest

## Requisitos

- Node.js 22+ e npm
- Docker (para o PostgreSQL local) — ou um PostgreSQL 16 que você já tenha

## Rodando localmente

```bash
# 1) dependências
npm install

# 2) variáveis de ambiente
cp .env.example .env        # ajuste se precisar (senha do admin, JWT_SECRET...)

# 3) banco de dados (PostgreSQL em Docker, porta 5434)
npm run db:up

# 4) tabelas
npm run migration:run

# 5) cria o usuário administrador (usa ADMIN_* do .env)
npm run seed:admin

# 6) sobe a API com recarga automática
npm run dev
```

A API fica em **http://localhost:3000/api**. Para conferir: `curl http://localhost:3000/api/competitions`.

Login do admin (valores do `.env.example`): `admin@example.com` / `change-me-in-production`.

> O frontend precisa estar em `http://localhost:5173` ou `5174` (o CORS aceita as duas por padrão).
> Para outras origens, defina `FRONTEND_URL` no `.env` (várias separadas por vírgula).

### Variáveis de ambiente (`.env`)

| Variável | Para quê | Padrão (`.env.example`) |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o PostgreSQL | `localhost`, `5434`, `league_user`, `league_pass`, `league_manager` |
| `DATABASE_URL` | Alternativa às `DB_*` (ex.: Render). Tem prioridade | — |
| `DB_SSL` | `true` liga SSL no banco | — |
| `JWT_SECRET` | Assinatura do token (**obrigatório**) | `change-me-in-production` |
| `JWT_EXPIRES_IN` | Validade do token | `8h` |
| `PORT` | Porta da API | `3000` |
| `FRONTEND_URL` | Origens permitidas no CORS | `http://localhost:5173,http://localhost:5174` |
| `TRUST_PROXY` | `1` quando houver proxy na frente (Render, nginx) | — |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Usados só pelo `seed:admin` | `Administrador`, `admin@example.com`, `change-me-in-production` |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API em modo desenvolvimento (watch) |
| `npm run build` | Compila para `dist/` |
| `npm run prod` | Sobe a versão compilada (`node dist/main`) |
| `npm run db:up` / `db:down` | Liga / desliga o PostgreSQL do Docker |
| `npm run migration:run` | Aplica as migrations pendentes |
| `npm run migration:revert` | Desfaz a última migration |
| `npm run seed:admin` | Cria o admin (não duplica se já existir) |
| `npm run lint` | Lint (oxlint) |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes de fluxo completo (ver aviso abaixo) |

Versões compiladas para produção: `migration:run:prod`, `seed:admin:prod` e `start:render`.

## Testes

```bash
npm test            # unitários
npm run test:e2e    # fluxos completos: login → equipes → inscrições → fases → mata-mata/suíço → súmula
```

> **Atenção:** os testes e2e usam o **banco configurado no `.env`** e criam dados (com timestamp no nome),
> alguns apagam o que criam, outros não. Rode só contra o banco de desenvolvimento, **nunca contra produção**.

## Estrutura

```
src/
  auth/          login (JWT) e guards
  competitions/  competições, publicação, logo
  teams/         equipes e escudo
  players/       atletas (elenco da equipe), foto
  enrollments/   inscrição de equipes e atletas (pendente → aprovado)
  phases/        fases (grupos, pontos corridos, mata-mata, suíço) e regras
  groups/        grupos e equipes por grupo
  matches/       calendário, sorteio do mata-mata, rodadas do suíço, agendamento em lote
  results/       súmula, eventos, placar, pênaltis, W.O.
  standings/     classificação e estatísticas
  disciplinary/  cartões, suspensões
  photos/        galeria de fotos
  database/      migrations, data-source e seed
uploads/         arquivos enviados (ignorado pelo git; faça backup em produção)
test/            testes e2e
```

## Documentação

- [`API.md`](./API.md) — todos os endpoints, corpos e regras
- [`DEPLOY.md`](./DEPLOY.md) — publicação (demonstração no Render/Vercel e notas para VPS)
- [`documento-tecnico-torneios.md`](./documento-tecnico-torneios.md) e [`backlog-torneios.md`](./backlog-torneios.md)

## Problemas comuns

- **`ECONNREFUSED` na porta 5434:** o banco não está de pé. Rode `npm run db:up` e espere o healthcheck.
- **Porta 5434 em uso:** mude `DB_PORT` no `.env` e o mapeamento de porta no `docker-compose.yml`.
- **CORS bloqueando o frontend:** o Vite pode ter subido em outra porta (5175...). Ajuste `FRONTEND_URL` ou
  libere a porta 5173 (feche instâncias antigas do Vite).
- **Imagem não aparece:** confira se a API está no ar e se `VITE_API_URL` do frontend aponta para ela (`.../api`).
- **Erro de coluna nova / "column does not exist":** faltou `npm run migration:run` depois de atualizar o código.
