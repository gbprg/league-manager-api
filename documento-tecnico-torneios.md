# Documento Técnico --- Sistema de Gestão de Torneios de Futebol

**Versão:** 1.1\
**Status:** Base para implementação --- sujeito às decisões pendentes\
**Tipo:** Aplicação web responsiva\
**Modelo de uso:** Um administrador autenticado e visitantes públicos
somente leitura

------------------------------------------------------------------------

## 1. Visão geral

A aplicação permitirá que um administrador gerencie competições de
futebol, equipes, jogadores, inscrições, fases, grupos, partidas,
resultados, eventos de súmula, disciplina e fotografias.

O público poderá consultar as informações publicadas sem realizar login.

### 1.1 Objetivos

-   Centralizar a administração das competições.
-   Cadastrar equipes e jogadores.
-   Organizar formatos e calendários de competição.
-   Registrar resultados e informações das súmulas após o encerramento
    dos jogos.
-   Calcular automaticamente classificação e estatísticas.
-   Disponibilizar informações ao público em uma interface responsiva.

### 1.2 Premissas obrigatórias

1.  Haverá apenas um administrador.
2.  Somente o administrador poderá criar, editar ou excluir dados.
3.  Visitantes terão acesso público somente para leitura.
4.  O administrador lançará os dados depois que a partida terminar,
    consultando a súmula física.
5.  Não haverá placar ao vivo, aplicativo de árbitro ou registro de
    eventos em tempo real.
6.  A classificação e os rankings serão derivados dos resultados e
    eventos registrados.
7.  Uma equipe poderá participar de várias competições.
8.  Um jogador não poderá representar duas equipes na mesma competição.
9.  O sistema deverá funcionar em computadores, celulares e tablets.
10. Funcionalidades não aprovadas no escopo não deverão ser
    implementadas por iniciativa própria.

------------------------------------------------------------------------

## 2. Arquitetura proposta

A arquitetura será simples, com frontend e backend separados, aplicação
modular e banco de dados relacional. Não serão utilizados microserviços.

### 2.1 Frontend --- proposta

-   React
-   Vite
-   TypeScript
-   React Router
-   TanStack Query (React Query)
-   shadcn/ui ou biblioteca equivalente

Responsabilidades: - Portal público. - Área administrativa. -
Formulários e validações de interface. - Exibição de tabelas,
calendários, resultados e estatísticas. - Consumo da API.

### 2.2 Backend --- proposta

-   NestJS
-   TypeScript
-   TypeORM
-   PostgreSQL
-   Autenticação JWT

Responsabilidades: - Autenticação e autorização. - Validação dos
dados. - Regras de negócio. - Geração de calendário e confrontos. -
Registro de resultados e eventos. - Cálculo de classificação e
estatísticas. - Exposição da API pública e administrativa.

### 2.3 Infraestrutura --- proposta

-   Frontend: Vercel.
-   Backend: Render.
-   Banco de dados: PostgreSQL.
-   Armazenamento de imagens: serviço de objetos compatível com S3 ou
    alternativa definida antes da implementação da galeria.
-   Comunicação: API REST via HTTPS.

> A stack acima é uma proposta técnica inicial. Deve ser confirmada
> antes da criação dos projetos.

------------------------------------------------------------------------

## 3. Perfis e permissões

### 3.1 Administrador

-   Acessa a área administrativa mediante login.
-   Gerencia competições, equipes e jogadores.
-   Aprova inscrições.
-   Configura fases, grupos e partidas.
-   Lança resultados e eventos com base nas súmulas.
-   Gerencia disciplina e galeria.
-   Publica e despublica competições.

### 3.2 Visitante

-   Não precisa de conta.
-   Consulta apenas competições publicadas.
-   Visualiza equipes, jogadores, partidas, resultados, classificação,
    estatísticas e galeria.
-   Não pode alterar dados.

Não haverá cadastro público, contas de equipes ou acesso de árbitros no
escopo inicial.

------------------------------------------------------------------------

## 4. Módulos funcionais

### 4.1 Autenticação e administração

**Funcionalidades** - Login e logout. - Consulta da sessão/usuário
autenticado. - Proteção das rotas administrativas. - Bloqueio de
operações de escrita para visitantes.

**Regras** - Existirá uma única conta administrativa. - Não haverá
cadastro público. - A senha deverá ser armazenada com hash seguro, nunca
em texto puro. - A autorização deverá ser validada no backend; esconder
botões no frontend não é controle de segurança.

### 4.2 Competições

**Dados** - Nome. - Slug para URL pública. - Descrição. -
Logotipo/imagem. - Data de início e término. - Local. - Regulamento. -
Limite de equipes. - Categoria/modalidade. - Faixa etária. - Formato. -
Situação. - Configurações de pontuação e desempate. - Indicador de
publicação.

**Funcionalidades** - Criar, listar, consultar e editar competições. -
Publicar e despublicar. - Arquivar ou cancelar. - Associar equipes. -
Consultar fases, partidas, classificação e estatísticas.

**Regras** - Cada competição possui suas próprias configurações. - Não
permitir ultrapassar o limite de equipes. - Não permitir excluir
definitivamente uma competição com histórico. Preferir arquivamento ou
cancelamento. - Somente competições publicadas aparecem no portal
público.

### 4.3 Formatos de competição

Formatos previstos: - Fase de grupos. - Mata-mata. - Fase de grupos
seguida de mata-mata. - Pontos corridos. - Eliminatória simples. -
Eliminatória com ida e volta.

**Fase de grupos** - Administrador define grupos e equipes ou solicita
distribuição automática, conforme regra a ser definida. - Sistema gera
partidas. - Sistema calcula classificação por grupo. - Configuração
define quantas equipes avançam. - Classificados podem alimentar a fase
seguinte.

**Pontos corridos** - Sistema gera confrontos conforme quantidade de
turnos configurada. - Classificação é calculada a partir das partidas
finalizadas.

**Mata-mata** - Sistema cria confrontos e permite ajustes
administrativos. - Vencedores avançam. - Deve suportar confrontos de ida
e volta quando configurado. - A regra de empate no confronto deverá ser
definida antes de implementar o avanço automático.

**Configurações por competição** - Pontos por vitória, empate e
derrota. - Ordem dos critérios de desempate. - Quantidade de grupos. -
Quantidade de classificados. - Quantidade de turnos/idas e voltas. -
Regras de W.O. - Regras de avanço no mata-mata.

Pontuação padrão sugerida: vitória = 3, empate = 1, derrota = 0. Deve
ser configurável.

Critérios inicialmente levantados: saldo de gols, gols marcados e
confronto direto. A ordem final e o comportamento quando o empate
envolver mais de duas equipes precisam ser definidos.

### 4.4 Equipes

**Dados** - Nome. - Slug. - Escudo/logotipo. - Nome do responsável. -
Cidade.

**Funcionalidades** - Criar, listar, consultar e editar equipe. -
Associar equipe a competições. - Consultar elenco e histórico de
participações.

**Regras** - Cadastro feito pelo administrador. - Uma equipe não pode
ser inscrita duas vezes na mesma competição. - Não apagar histórico ao
remover uma equipe de uma competição.

### 4.5 Jogadores e inscrições

Separar o cadastro geral do jogador da inscrição dele em uma equipe numa
competição.

**Cadastro geral do jogador** - Nome completo. - Data de nascimento. -
Documento de identificação. - Posição.

**Inscrição na competição** - Competição. - Equipe que representa. -
Número da camisa, se aplicável. - Situação: pendente, aprovada ou
rejeitada. - Data da aprovação.

**Funcionalidades** - Criar, consultar e editar jogadores. - Inscrever
jogador em uma competição/equipe. - Aprovar ou rejeitar inscrição. -
Consultar histórico de participações e estatísticas.

**Regras** - Somente o administrador cadastra e gerencia jogadores. - Um
jogador pode participar de competições diferentes. - Um jogador não pode
representar duas equipes na mesma competição. - Somente inscrição
aprovada permite relacionar o jogador a uma partida. - Documento pessoal
não deve ser exibido no portal público.

### 4.6 Fases e grupos

**Funcionalidades** - Criar fases de uma competição. - Definir tipo e
ordem da fase. - Criar grupos dentro de uma fase. - Associar equipes aos
grupos. - Configurar classificados para a fase seguinte.

**Regras** - Grupo pertence a uma fase. - Fase pertence a uma
competição. - Uma equipe não pode aparecer em dois grupos da mesma fase,
salvo regra explicitamente definida. - A edição de grupos após partidas
realizadas deve exigir validação para não invalidar resultados.

### 4.7 Partidas e calendário

**Dados** - Competição. - Fase. - Grupo, quando houver. - Equipe
mandante e visitante. - Rodada. - Identificador do confronto, para ida e
volta. - Número do jogo no confronto (ida/volta). - Data, horário e
local. - Situação. - Placar, quando finalizada.

**Situações** - Agendada. - Em andamento (estado opcional, não significa
acompanhamento ao vivo). - Finalizada. - Adiada. - Cancelada. - W.O.

**Funcionalidades** - Gerar partidas automaticamente. - Criar partidas
manualmente. - Editar data, horário, local e confronto, respeitando
integridade. - Consultar calendário por competição, equipe, fase e
rodada. - Reagendar partidas adiadas. - Registrar W.O.

**Regras** - Não permitir uma equipe contra ela mesma. - Mandante e
visitante devem estar inscritos na competição. - Não incluir partidas
canceladas ou não finalizadas na classificação. - A geração automática
deve respeitar o formato configurado. - Ajustes manuais não podem criar
confrontos inválidos. - Para ida e volta, as duas partidas devem
compartilhar o mesmo identificador de confronto.

### 4.8 Lançamento de súmula, resultados e eventos

O módulo será utilizado após o encerramento da partida. O administrador
consulta a súmula física e registra os dados no sistema.

**Fluxo** 1. Administrador localiza a partida. 2. Informa o placar
final. 3. Relaciona os jogadores participantes, titulares e reservas. 4.
Identifica o goleiro da equipe, quando necessário para a estatística de
goleiro menos vazado. 5. Registra os autores dos gols. 6. Registra os
cartões definidos no escopo. 7. Confere os dados e finaliza o resultado.
8. Sistema atualiza classificação e rankings.

**Dados** - Placar mandante e visitante. - Jogadores relacionados. -
Titulares/reservas. - Goleiro designado para a partida. - Eventos de gol
e cartões aprovados para o escopo.

**Regras** - Apenas o administrador lança e corrige resultados. - Não
existe lançamento ao vivo. - Jogadores relacionados devem possuir
inscrição aprovada na equipe correspondente. - Eventos devem pertencer a
jogador e equipe relacionados à partida. - O placar não pode ser
negativo. - O total de gols atribuídos a jogadores deve ser conciliado
com o placar, considerando explicitamente gols contra e gols
administrativos, se forem aceitos. - A partida só afeta classificação e
estatísticas depois de finalizada. - Ao corrigir um resultado/evento, os
dados derivados devem refletir a correção. - O lançamento e a
finalização devem ocorrer em transação para evitar resultado
parcialmente salvo.

### 4.9 Classificação

A classificação será calculada a partir das partidas finalizadas. **Não
haverá tabela de classificação armazenada como fonte independente no
banco.**

**Campos** - Posição. - Equipe. - Pontos. - Jogos. - Vitórias. -
Empates. - Derrotas. - Gols pró. - Gols contra. - Saldo de gols.

**Regras** - Partidas agendadas, adiadas ou canceladas não entram no
cálculo. - Partidas finalizadas entram conforme regras da competição. -
W.O. utiliza o placar administrativo definido para a competição. - Cada
grupo possui classificação independente. - Critérios de desempate são
aplicados na ordem configurada. - Correção de placar deve alterar
automaticamente a classificação retornada pela API.

A API pode calcular os dados sob demanda. Se futuramente houver
necessidade de cache, ele deverá ser tratado como dado derivado
reconstruível, nunca como fonte oficial.

### 4.10 Estatísticas

As estatísticas também serão derivadas dos resultados e eventos
registrados.

**Rankings previstos** - Artilharia. - Goleiro menos vazado. - Equipe
com mais vitórias. - Jogadores com mais cartões vermelhos.

**Regras** - Estatísticas separadas por competição. - Somente partidas
finalizadas são consideradas. - Correções de resultados/eventos devem
refletir nos rankings. - Gols contra não contam como gol do
artilheiro. - Gols administrativos de W.O. não devem ser atribuídos a
jogadores.

**Goleiro menos vazado --- regra operacional proposta** - O
administrador identifica um goleiro por equipe em cada partida. - Para o
cálculo simples inicialmente solicitado, os gols sofridos pela equipe
naquela partida são atribuídos ao goleiro designado. - Essa métrica não
representa necessariamente o desempenho individual real quando houve
troca de goleiro durante o jogo. Caso o cliente queira precisão por
goleiro, será necessário registrar a troca/participação de cada goleiro,
o que não faz parte do escopo simples atual.

### 4.11 Disciplina

**Tipos** - Suspensão por cartões. - Suspensão por decisão
disciplinar. - Multa. - Advertência.

**Dados** - Competição. - Jogador. - Equipe. - Partida relacionada,
quando aplicável. - Tipo. - Descrição. - Quantidade de jogos de
suspensão. - Valor da multa, quando aplicável. - Situação. - Jogos
cumpridos.

**Funcionalidades** - Registrar ocorrência. - Registrar suspensão, multa
e advertência. - Consultar histórico. - Controlar manualmente jogos de
suspensão cumpridos.

A automação de suspensão por acúmulo de cartões não está prevista na
primeira versão. O administrador fará o controle manual. A necessidade
de cartão amarelo como evento da partida deve ser confirmada antes de
implementar essa regra.

### 4.12 Galeria

**Funcionalidades** - Criar álbum vinculado a uma competição. - Definir
título e descrição. - Enviar e remover fotografias. - Exibir álbuns no
portal público.

**Regras** - Somente o administrador publica imagens. - Arquivos ficam
em armazenamento externo; o banco guarda metadados e URLs. - Validar
tipo, tamanho e conteúdo dos arquivos. - Competições não publicadas não
devem expor sua galeria publicamente.

### 4.13 Portal público

Sem autenticação e somente leitura.

**Página inicial** - Competições publicadas. - Competições em
andamento. - Próximos jogos. - Últimos resultados.

**Página da competição** - Informações gerais e regulamento. -
Equipes. - Fases e grupos. - Classificação. - Calendário e resultados. -
Artilharia. - Goleiros menos vazados. - Equipes com mais vitórias. -
Cartões vermelhos. - Galeria.

**Página da equipe** - Nome, escudo e cidade. - Jogadores inscritos na
competição. - Jogos, resultados e estatísticas da equipe.

**Página do jogador** - Nome e posição. - Equipe na competição
consultada. - Competições e estatísticas públicas. - Não exibir
documento pessoal.

**Regras** - Visitantes só consultam competições publicadas. - Rotas
públicas não podem expor dados pessoais restritos. - Toda alteração
administrativa publicada deve aparecer nas consultas públicas.

------------------------------------------------------------------------

## 5. Modelagem do banco de dados

### 5.1 Convenções

-   PostgreSQL.
-   Chaves primárias UUID.
-   Datas armazenadas em tipos `DATE`, `TIME` ou `TIMESTAMPTZ`, conforme
    o dado.
-   Campos de auditoria `created_at` e `updated_at` nas entidades
    mutáveis.
-   Chaves estrangeiras com política explícita de exclusão.
-   Índices em chaves estrangeiras e campos usados em filtros.
-   Restrições `UNIQUE` para evitar duplicidade.
-   Valores de status e tipos devem ser enums ou valores validados
    centralmente.
-   padrão de nome de tabelas e colunas com snake_case.

### 5.2 Tabelas

#### `admin_users`

  Campo           Tipo           Observação
  --------------- -------------- ---------------
  id              UUID           PK
  name            VARCHAR(150)   Nome
  email           VARCHAR(180)   Único
  password_hash   VARCHAR(255)   Hash da senha
  created_at      TIMESTAMPTZ    Criação
  updated_at      TIMESTAMPTZ    Atualização

#### `competitions`

  -----------------------------------------------------------------------
  Campo                   Tipo                    Observação
  ----------------------- ----------------------- -----------------------
  id                      UUID                    PK

  name                    VARCHAR(150)            Nome

  slug                    VARCHAR(180)            Único

  description             TEXT                    Opcional

  logo_url                TEXT                    Opcional

  start_date              DATE                    Data inicial

  end_date                DATE                    Data final

  location                VARCHAR(200)            Local

  regulation              TEXT                    Regulamento

  max_teams               INTEGER                 Limite de equipes

  category                VARCHAR(100)            Categoria/modalidade

  age_group               VARCHAR(100)            Faixa etária

  format                  VARCHAR(50)             Formato principal

  status                  VARCHAR(30)             Planejada, em
                                                  andamento, finalizada,
                                                  cancelada

  points_win              INTEGER                 Padrão sugerido: 3

  points_draw             INTEGER                 Padrão sugerido: 1

  points_loss             INTEGER                 Padrão sugerido: 0

  is_published            BOOLEAN                 Publicação

  created_at              TIMESTAMPTZ             Criação

  updated_at              TIMESTAMPTZ             Atualização
  -----------------------------------------------------------------------

#### `teams`

  Campo          Tipo           Observação
  -------------- -------------- -------------
  id             UUID           PK
  name           VARCHAR(150)   Nome
  slug           VARCHAR(180)   Único
  logo_url       TEXT           Opcional
  manager_name   VARCHAR(150)   Responsável
  city           VARCHAR(100)   Cidade
  created_at     TIMESTAMPTZ    Criação
  updated_at     TIMESTAMPTZ    Atualização

#### `players`

  -----------------------------------------------------------------------
  Campo                   Tipo                    Observação
  ----------------------- ----------------------- -----------------------
  id                      UUID                    PK

  full_name               VARCHAR(180)            Nome

  birth_date              DATE                    Nascimento

  document_number         VARCHAR(50)             Restrito à
                                                  administração; política
                                                  de unicidade a definir

  position                VARCHAR(30)             Goleiro, defesa,
                                                  meio-campo, ataque

  created_at              TIMESTAMPTZ             Criação

  updated_at              TIMESTAMPTZ             Atualização
  -----------------------------------------------------------------------

#### `competition_teams`

Vínculo entre equipe e competição.

  Campo                 Tipo          Observação
  --------------------- ------------- -----------------
  id                    UUID          PK
  competition_id        UUID          FK competitions
  team_id               UUID          FK teams
  registration_status   VARCHAR(30)   Situação
  registered_at         TIMESTAMPTZ   Data

Restrição: `UNIQUE(competition_id, team_id)`.

#### `competition_players`

Inscrição de jogador por competição e equipe.

  Campo                 Tipo          Observação
  --------------------- ------------- -------------------------------
  id                    UUID          PK
  competition_id        UUID          FK competitions
  team_id               UUID          FK teams
  player_id             UUID          FK players
  registration_status   VARCHAR(30)   Pendente, aprovada, rejeitada
  shirt_number          INTEGER       Opcional
  approved_at           TIMESTAMPTZ   Opcional
  created_at            TIMESTAMPTZ   Criação
  updated_at            TIMESTAMPTZ   Atualização

Restrição: `UNIQUE(competition_id, player_id)`, garantindo que o jogador
represente apenas uma equipe na competição.

Também deverá ser garantido que o par `competition_id/team_id` exista em
`competition_teams`. Essa integridade pode ser implementada com chave
estrangeira composta.

#### `competition_phases`

  Campo                 Tipo           Observação
  --------------------- -------------- -------------------------
  id                    UUID           PK
  competition_id        UUID           FK competitions
  name                  VARCHAR(100)   Nome
  phase_type            VARCHAR(30)    GROUP, KNOCKOUT, LEAGUE
  sequence              INTEGER        Ordem
  qualification_count   INTEGER        Opcional
  legs                  INTEGER        1 ou 2, conforme regra
  created_at            TIMESTAMPTZ    Criação
  updated_at            TIMESTAMPTZ    Atualização

#### `competition_groups`

  Campo        Tipo          Observação
  ------------ ------------- -----------------------
  id           UUID          PK
  phase_id     UUID          FK competition_phases
  name         VARCHAR(50)   Ex.: Grupo A
  created_at   TIMESTAMPTZ   Criação

#### `competition_group_teams`

Vínculo explícito entre grupos e equipes.

  Campo                 Tipo   Observação
  --------------------- ------ -----------------------
  id                    UUID   PK
  group_id              UUID   FK competition_groups
  competition_team_id   UUID   FK competition_teams

Restrição: `UNIQUE(group_id, competition_team_id)`. A aplicação deverá
validar que a equipe pertence à mesma competição da fase.

#### `competition_rules`

Configurações variáveis de cada competição.

  Campo            Tipo          Observação
  ---------------- ------------- ------------------------
  id               UUID          PK
  competition_id   UUID          FK competitions
  rule_type        VARCHAR(50)   Identificador da regra
  rule_value       JSONB         Valor/configuração
  created_at       TIMESTAMPTZ   Criação
  updated_at       TIMESTAMPTZ   Atualização

Exemplos: ordem de desempate, quantidade de classificados, regra de W.O.
e regra de empate no mata-mata. Regras essenciais e consultadas
frequentemente devem permanecer em campos/tabelas tipados; JSONB não
deve substituir toda a modelagem relacional.

#### `matches`

  Campo            Tipo           Observação
  ---------------- -------------- -----------------------------------------------
  id               UUID           PK
  competition_id   UUID           FK competitions
  phase_id         UUID           FK competition_phases
  group_id         UUID           FK competition_groups, nullable
  home_team_id     UUID           FK teams
  away_team_id     UUID           FK teams
  round_number     INTEGER        Opcional
  tie_id           UUID           Identifica o confronto de ida/volta
  leg_number       INTEGER        1 ou 2
  scheduled_at     TIMESTAMPTZ    Data e horário
  location         VARCHAR(200)   Local/campo
  home_score       INTEGER        Nullable até finalizar
  away_score       INTEGER        Nullable até finalizar
  status           VARCHAR(30)    Agendada, finalizada, adiada, cancelada, W.O.
  created_at       TIMESTAMPTZ    Criação
  updated_at       TIMESTAMPTZ    Atualização

A aplicação deverá validar que as equipes pertencem à competição e que
mandante e visitante são diferentes. Para W.O., deverá ser definido como
armazenar o placar administrativo.

#### `match_players`

Jogadores relacionados para uma partida.

  Campo                   Tipo          Observação
  ----------------------- ------------- ------------------------
  id                      UUID          PK
  match_id                UUID          FK matches
  competition_player_id   UUID          FK competition_players
  is_starter              BOOLEAN       Titular ou reserva
  is_goalkeeper           BOOLEAN       Goleiro designado
  created_at              TIMESTAMPTZ   Criação

Restrição: `UNIQUE(match_id, competition_player_id)`. A validação deverá
garantir que o jogador inscrito representa a equipe da partida à qual
foi relacionado. A equipe pode ser obtida pela inscrição, evitando
duplicar esse dado.

#### `match_events`

Eventos registrados a partir da súmula.

  -----------------------------------------------------------------------
  Campo                   Tipo                    Observação
  ----------------------- ----------------------- -----------------------
  id                      UUID                    PK

  match_id                UUID                    FK matches

  match_player_id         UUID                    FK match_players,
                                                  nullable para evento
                                                  administrativo

  team_id                 UUID                    FK teams

  event_type              VARCHAR(30)             GOAL, RED_CARD e tipos
                                                  aprovados

  event_minute            INTEGER                 Opcional

  description             TEXT                    Opcional

  created_at              TIMESTAMPTZ             Criação
  -----------------------------------------------------------------------

Para gols, o tipo deverá distinguir gol normal e gol contra se essa
regra for aprovada. Gols administrativos de W.O. não devem ser
associados a um jogador.

#### `disciplinary_records`

  Campo              Tipo            Observação
  ------------------ --------------- -------------------------------
  id                 UUID            PK
  competition_id     UUID            FK competitions
  player_id          UUID            FK players
  team_id            UUID            FK teams
  match_id           UUID            FK matches, nullable
  record_type        VARCHAR(30)     Suspensão, multa, advertência
  description        TEXT            Descrição
  suspension_games   INTEGER         Opcional
  fine_amount        DECIMAL(10,2)   Opcional
  status             VARCHAR(30)     Situação
  created_at         TIMESTAMPTZ     Criação
  updated_at         TIMESTAMPTZ     Atualização

#### `disciplinary_suspensions`

  Campo                    Tipo          Observação
  ------------------------ ------------- ----------------------------------
  id                       UUID          PK
  disciplinary_record_id   UUID          FK disciplinary_records
  total_games              INTEGER       Jogos de suspensão
  served_games             INTEGER       Jogos cumpridos
  status                   VARCHAR(30)   Pendente, em andamento, cumprida
  created_at               TIMESTAMPTZ   Criação
  updated_at               TIMESTAMPTZ   Atualização

#### `photo_albums`

  Campo            Tipo           Observação
  ---------------- -------------- -----------------
  id               UUID           PK
  competition_id   UUID           FK competitions
  title            VARCHAR(150)   Título
  description      TEXT           Opcional
  created_at       TIMESTAMPTZ    Criação
  updated_at       TIMESTAMPTZ    Atualização

#### `photos`

  Campo        Tipo           Observação
  ------------ -------------- ----------------------
  id           UUID           PK
  album_id     UUID           FK photo_albums
  image_url    TEXT           URL no armazenamento
  caption      VARCHAR(255)   Opcional
  created_at   TIMESTAMPTZ    Criação

### 5.3 Dados que não serão persistidos como fonte oficial

Não criar tabelas independentes para: - Classificação calculada. -
Artilharia calculada. - Ranking de goleiros. - Ranking de cartões. -
Total de vitórias por equipe.

Esses dados serão calculados a partir de partidas finalizadas, eventos e
inscrições. Se futuramente houver cache, ele deverá ser descartável e
reconstruível.

### 5.4 Relacionamentos principais

-   `competitions` 1:N `competition_phases`.
-   `competitions` N:N `teams`, por `competition_teams`.
-   `competitions` N:N `players`, por `competition_players`.
-   `competition_phases` 1:N `competition_groups`.
-   `competition_groups` N:N `competition_teams`, por
    `competition_group_teams`.
-   `competition_phases` 1:N `matches`.
-   `matches` 1:N `match_players`.
-   `match_players` 1:N `match_events`.
-   `competitions` 1:N `disciplinary_records`.
-   `competitions` 1:N `photo_albums`.
-   `photo_albums` 1:N `photos`.

### 5.5 Diagrama conceitual simplificado

``` mermaid
erDiagram
    COMPETITIONS ||--o{ COMPETITION_PHASES : possui
    COMPETITIONS ||--o{ COMPETITION_TEAMS : recebe
    TEAMS ||--o{ COMPETITION_TEAMS : participa
    COMPETITIONS ||--o{ COMPETITION_PLAYERS : inscreve
    PLAYERS ||--o{ COMPETITION_PLAYERS : participa
    COMPETITION_PHASES ||--o{ COMPETITION_GROUPS : possui
    COMPETITION_GROUPS ||--o{ COMPETITION_GROUP_TEAMS : organiza
    COMPETITION_TEAMS ||--o{ COMPETITION_GROUP_TEAMS : integra
    COMPETITION_PHASES ||--o{ MATCHES : organiza
    MATCHES ||--o{ MATCH_PLAYERS : relaciona
    COMPETITION_PLAYERS ||--o{ MATCH_PLAYERS : participa
    MATCH_PLAYERS ||--o{ MATCH_EVENTS : registra
    COMPETITIONS ||--o{ DISCIPLINARY_RECORDS : controla
    COMPETITIONS ||--o{ PHOTO_ALBUMS : possui
    PHOTO_ALBUMS ||--o{ PHOTOS : contém
```

------------------------------------------------------------------------

## 6. Regras de integridade e transações

O backend deverá validar, no mínimo:

1.  Equipe não pode ser duplicada na mesma competição.
2.  Jogador não pode estar inscrito por duas equipes na mesma
    competição.
3.  Inscrição do jogador deve pertencer à competição e equipe corretas.
4.  Somente jogador aprovado pode ser relacionado à partida.
5.  Mandante e visitante devem ser diferentes.
6.  Equipes da partida devem pertencer à competição.
7.  Placar não pode ser negativo.
8.  Partida cancelada ou não finalizada não entra na classificação.
9.  Evento deve pertencer à partida e a jogador relacionado, quando
    aplicável.
10. Resultado e eventos devem ser salvos de forma consistente.
11. Correção de resultado/evento deve refletir nos cálculos derivados.
12. Visitante não pode executar operações administrativas.

Operações de finalização/correção de partida devem utilizar transação de
banco de dados.

------------------------------------------------------------------------

## 7. API --- módulos e endpoints iniciais

### Autenticação

-   `POST /auth/login`
-   `POST /auth/logout`
-   `GET /auth/me`

### Competições

-   `GET /competitions`
-   `GET /competitions/:id`
-   `POST /competitions`
-   `PATCH /competitions/:id`
-   `DELETE /competitions/:id` --- somente quando não houver histórico
    impeditivo; preferir arquivamento.

### Equipes

-   `GET /teams`
-   `GET /teams/:id`
-   `POST /teams`
-   `PATCH /teams/:id`
-   `DELETE /teams/:id` --- respeitando histórico.

### Jogadores

-   `GET /players`
-   `GET /players/:id`
-   `POST /players`
-   `PATCH /players/:id`

### Inscrições

-   `POST /competitions/:id/teams`
-   `GET /competitions/:id/teams`
-   `POST /competitions/:id/players`
-   `PATCH /competition-players/:id/approve`
-   `PATCH /competition-players/:id/reject`

### Fases e grupos

-   `POST /competitions/:id/phases`
-   `GET /competitions/:id/phases`
-   `POST /phases/:id/groups`
-   `GET /phases/:id/groups`

### Partidas

-   `GET /competitions/:id/matches`
-   `GET /matches/:id`
-   `POST /matches`
-   `PATCH /matches/:id`
-   `POST /competitions/:id/matches/generate`

### Resultados e eventos

-   `POST /matches/:id/result`
-   `PATCH /matches/:id/result`
-   `POST /matches/:id/events`
-   `DELETE /match-events/:id`

### Classificação e estatísticas

-   `GET /competitions/:id/standings`
-   `GET /competitions/:id/statistics`
-   `GET /competitions/:id/top-scorers`
-   `GET /competitions/:id/goalkeepers`
-   `GET /competitions/:id/red-cards`

### Disciplina

-   `GET /competitions/:id/disciplinary`
-   `POST /disciplinary`
-   `PATCH /disciplinary/:id`

### Galeria

-   `GET /competitions/:id/albums`
-   `POST /competitions/:id/albums`
-   `POST /albums/:id/photos`
-   `DELETE /photos/:id`

Os endpoints públicos serão somente de leitura e retornarão apenas
campos permitidos. Endpoints administrativos exigirão autenticação e
autorização no backend.

------------------------------------------------------------------------

## 8. Segurança

-   Hash de senha com Argon2id ou bcrypt.
-   JWT com expiração e estratégia de renovação definida na
    implementação.
-   Autorização no backend para todas as operações administrativas.
-   DTOs e validação de entrada.
-   Consultas parametrizadas/ORM.
-   CORS restrito aos domínios autorizados.
-   Limites de tamanho e validação de arquivos.
-   Documentos pessoais acessíveis somente pela administração.
-   Segredos em variáveis de ambiente.
-   HTTPS em produção.
-   Registro de operações administrativas importantes.
-   Backup periódico do banco de dados.

------------------------------------------------------------------------

## 9. Interfaces

### Área administrativa

1.  Login.
2.  Dashboard.
3.  Competições.
4.  Formulário de competição.
5.  Equipes.
6.  Jogadores.
7.  Inscrições e aprovações.
8.  Fases e grupos.
9.  Calendário e partidas.
10. Lançamento de súmula.
11. Classificação.
12. Estatísticas.
13. Disciplina.
14. Galeria.

### Portal público

1.  Página inicial.
2.  Lista de competições.
3.  Detalhes da competição.
4.  Classificação.
5.  Calendário e resultados.
6.  Equipes.
7.  Jogadores.
8.  Artilharia e estatísticas.
9.  Disciplina pública, conforme dados permitidos.
10. Galeria.

------------------------------------------------------------------------

## 10. Estratégia de testes

Testes obrigatórios para regras críticas:

-   Autenticação e bloqueio de rotas.
-   Inscrição duplicada de equipe.
-   Jogador inscrito em duas equipes na mesma competição.
-   Jogador não aprovado relacionado à partida.
-   Geração de partidas para grupos e pontos corridos.
-   Confrontos de ida e volta.
-   Cálculo de classificação e desempates.
-   W.O. e partidas canceladas.
-   Correção de placar e recálculo.
-   Artilharia e gols contra.
-   Cálculo de goleiro menos vazado conforme a regra operacional
    aprovada.
-   Isolamento de dados privados no portal público.

------------------------------------------------------------------------

## 11. Etapas de desenvolvimento

1.  Fundação técnica, banco, autenticação e layout.
2.  Competições, equipes, jogadores e inscrições.
3.  Fases, grupos e geração de partidas.
4.  Lançamento de súmulas e resultados.
5.  Classificação, estatísticas e disciplina.
6.  Portal público e galeria.
7.  Testes, correções e publicação.

------------------------------------------------------------------------

## 12. Decisões pendentes antes dos módulos correspondentes

Não inventar as regras abaixo. Registrar a decisão antes de implementar
a funcionalidade afetada.

1.  Modalidades atendidas: futebol de campo, futsal e/ou society.
2.  Distribuição de equipes nos grupos: manual, automática ou ambas.
3.  Mata-mata com número de equipes que não seja potência de dois:
    folgas (byes) e critérios de chaveamento.
4.  Empate no mata-mata: pênaltis, prorrogação, saldo agregado ou outro
    critério.
5.  W.O.: placar administrativo e impacto nas estatísticas.
6.  Gols contra: necessidade de registro e impacto na artilharia.
7.  Cartão amarelo: confirmar se será registrado na súmula digital. O
    controle de suspensões por cartões depende dessa decisão.
8.  Goleiro menos vazado: confirmar se será atribuído ao goleiro
    designado pelo administrador em cada partida. Na regra simples,
    todos os gols sofridos pela equipe na partida serão atribuídos a
    esse goleiro.
9.  Aprovação de inscrição: definir se haverá status pendente ou se o
    administrador aprova imediatamente no cadastro.
10. Publicação: definir se a competição será pública desde a criação ou
    somente após ação explícita.
11. Volume: estimativa de competições, equipes e jogadores.
12. Identidade visual e referência de interface.
13. Serviço de armazenamento de imagens.
14. Estratégia de recuperação de senha do administrador.

------------------------------------------------------------------------

## 13. Diretrizes de implementação

-   Desenvolver apenas o escopo aprovado.
-   Não inventar regras de negócio.
-   Manter frontend e backend separados.
-   Organizar backend por módulos de domínio.
-   Manter controllers enxutos e regras nos services.
-   Utilizar DTOs para validar entradas.
-   Não expor acesso direto ao banco pelo frontend.
-   Não duplicar cálculos.
-   Não persistir classificação e rankings como fonte oficial.
-   Priorizar simplicidade e manutenção.
-   Cobrir regras críticas com testes automatizados.
-   Atualizar este documento quando houver decisão de escopo.

**Resultado esperado:** uma plataforma simples e confiável para
administrar competições, registrar súmulas após os jogos e
disponibilizar automaticamente resultados, classificações e estatísticas
ao público.
