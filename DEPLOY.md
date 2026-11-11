# Deploy

## 1. Demonstração (Render + Vercel)

Objetivo: o cliente ver e testar o fluxo. **Não é produção**: no Render os arquivos enviados (logos,
fotos, galeria) são apagados a cada deploy/reinício, e no plano gratuito o servidor "dorme"
(a 1ª requisição leva ~30–50 s).

### Banco (Render → New → PostgreSQL)
Copie a **Internal Database URL**.

### API (Render → New → Web Service, pasta `league-manager-api`)
| Campo | Valor |
|---|---|
| Build Command | `npm install && npm run build` |
| Root Directory | vazio, se o repositório for só da API; `league-manager-api` se for um repositório com as duas pastas |
| Start Command | `npm run start:render` (migrations + admin + API) |

Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Internal Database URL do passo anterior (substitui `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`) |
| `DB_SSL` | `true` (apenas se usar a External URL) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | texto longo e aleatório (ex.: `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `8h` |
| `FRONTEND_URL` | URL da Vercel, ex.: `https://seu-app.vercel.app` (aceita várias, separadas por vírgula) |
| `TRUST_PROXY` | `1` (o Render usa proxy; sem isso o limite de login vale para todos juntos) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | dados do admin (use senha forte) |

O `start:render` aplica as migrations e **cria o admin automaticamente** (com `ADMIN_*`; se já existir, não faz nada),
então não precisa de Shell — o plano gratuito do Render não tem Shell/SSH.

### Frontend (Vercel, pasta `league-manager-web`)
- Framework: Vite. O `vercel.json` já redireciona todas as rotas para o `index.html`.
- Variável: `VITE_API_URL` = `https://<sua-api>.onrender.com/api`
- Faça o deploy **depois** de ter a URL da API, e ajuste `FRONTEND_URL` na API com a URL final da Vercel.

## 2. Produção (VPS Contabo + domínio)

Pontos que valem já para o planejamento:

- **Uploads em disco funcionam**: na VPS o disco é persistente. Mantenha `league-manager-api/uploads/`
  fora do build (volume/pasta fixa) e **inclua no backup**, junto com o banco.
- **Proxy reverso com HTTPS** (Caddy ou nginx + Let's Encrypt) na frente da API, e `TRUST_PROXY=1`.
  O frontend pode ser servido pelo mesmo proxy (arquivos de `npm run build`, com fallback para `index.html`)
  ou continuar na Vercel.
- **Mesmo domínio para frontend e API** (ex.: `app.seudominio.com` e `api.seudominio.com`) facilita um futuro
  login por cookie `httpOnly`.
- Banco: PostgreSQL na própria VPS (Docker) ou gerenciado; **backup diário** (`pg_dump`).
- Variáveis iguais às da demonstração, com `FRONTEND_URL` = domínio final e segredos novos.
- Migrations a cada deploy: `npm run migration:run:prod`.
- Nunca rode `npm run test:e2e` contra o banco de produção: os testes criam dados.
