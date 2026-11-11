# Backlog de Desenvolvimento --- Sistema de Gestão de Torneios de Futebol

**Versão:** 1.0\
**Base:** Documento Técnico v1.1\
**Objetivo:** organizar a implementação em entregas pequenas, testáveis
e em ordem de dependência.

------------------------------------------------------------------------

## 1. Premissas do backlog

-   Um único administrador.
-   Visitantes públicos sem login e somente leitura.
-   Resultados e eventos lançados pelo administrador depois do jogo, com
    base na súmula física.
-   Sem acompanhamento em tempo real.
-   Classificação e estatísticas calculadas a partir dos dados de
    partidas/eventos; não serão armazenadas como fonte oficial.
-   Frontend e backend separados.
-   Stack proposta: React + Vite + TypeScript; NestJS + TypeScript;
    TypeORM; PostgreSQL. Confirmar stack antes de iniciar.

## 2. Prioridade

-   **P0 --- Obrigatório:** necessário para o MVP funcionar.
-   **P1 --- Importante:** necessário para completar o escopo principal.
-   **P2 --- Posterior:** pode entrar após a primeira versão funcional.

## 3. Épicos e tarefas

### Épico 0 --- Fechamento de decisões e preparação

**Objetivo:** remover ambiguidades que podem causar retrabalho.

-   [ ] **P0** Confirmar stack e serviços de hospedagem.
-   [ ] **P0** Confirmar modalidade(s) atendida(s).
-   [ ] **P0** Definir regras de empate no mata-mata.
-   [ ] **P0** Definir regra de W.O. e placar administrativo.
-   [ ] **P0** Confirmar registro de cartão amarelo.
-   [ ] **P0** Definir tratamento de gol contra.
-   [ ] **P0** Confirmar regra operacional do goleiro menos vazado.
-   [ ] **P0** Definir distribuição de equipes nos grupos.
-   [ ] **P0** Definir chaveamento/byes para mata-mata com número
    irregular de equipes.
-   [ ] **P1** Definir publicação de competição.
-   [ ] **P1** Definir serviço de armazenamento de imagens.
-   [ ] **P1** Definir política de recuperação de senha.
-   [ ] **P1** Estimar volume de competições, equipes e jogadores.

**Critério de aceite:** decisões P0 registradas no documento técnico
antes de implementar os módulos afetados.

### Épico 1 --- Fundação do projeto

**Objetivo:** criar os projetos e a infraestrutura mínima.

-   [ ] **P0** Criar repositório e estratégia de branches.
-   [ ] **P0** Criar projeto backend NestJS + TypeScript.
-   [ ] **P0** Criar projeto frontend React + Vite + TypeScript.
-   [ ] **P0** Configurar PostgreSQL local.
-   [ ] **P0** Configurar TypeORM e migrations.
-   [ ] **P0** Configurar variáveis de ambiente e exemplos
    `.env.example`.
-   [ ] **P0** Configurar lint, formatter e scripts de desenvolvimento.
-   [ ] **P0** Configurar tratamento global de erros no backend.
-   [ ] **P0** Configurar validação global de DTOs.
-   [ ] **P0** Configurar cliente HTTP e tratamento de erros no
    frontend.
-   [ ] **P0** Configurar React Router.
-   [ ] **P0** Configurar TanStack Query.
-   [ ] **P1** Configurar pipeline básico de CI para lint e testes.

**Critério de aceite:** frontend e backend iniciam localmente,
conectam-se conforme necessário e executam validações automatizadas.

### Épico 2 --- Banco de dados e autenticação

**Objetivo:** criar a estrutura central e proteger a administração.

-   [ ] **P0** Criar entidade/migration `admin_users`.
-   [ ] **P0** Criar entidades/migrations `competitions`, `teams` e
    `players`.
-   [ ] **P0** Criar entidades/migrations `competition_teams` e
    `competition_players`.
-   [ ] **P0** Criar constraints e índices iniciais.
-   [ ] **P0** Criar mecanismo seguro de seed para a conta
    administrativa.
-   [ ] **P0** Implementar login.
-   [ ] **P0** Implementar hash e verificação de senha.
-   [ ] **P0** Implementar JWT e expiração.
-   [ ] **P0** Implementar endpoint de usuário autenticado.
-   [ ] **P0** Implementar guards e autorização no backend.
-   [ ] **P0** Implementar tela de login.
-   [ ] **P0** Implementar proteção de rotas administrativas no
    frontend.
-   [ ] **P1** Implementar logout e tratamento de sessão expirada.
-   [ ] **P1** Implementar recuperação de senha, se aprovada.

**Critério de aceite:** somente o administrador autenticado consegue
executar operações protegidas; visitante recebe resposta não autorizada
ao tentar escrever.

### Épico 3 --- Cadastro de competições

**Objetivo:** permitir criar e configurar torneios.

-   [ ] **P0** Implementar CRUD de competições no backend.
-   [ ] **P0** Validar datas, limite de equipes e campos obrigatórios.
-   [ ] **P0** Implementar slug único.
-   [ ] **P0** Implementar status e indicador de publicação.
-   [ ] **P0** Implementar tela de listagem administrativa.
-   [ ] **P0** Implementar formulário de criação/edição.
-   [ ] **P0** Implementar tela de detalhes da competição.
-   [ ] **P1** Implementar arquivamento/cancelamento protegido.
-   [ ] **P1** Implementar configurações de pontuação e critérios de
    desempate.

**Critério de aceite:** administrador cria, consulta e edita uma
competição; validações impedem dados inconsistentes.

### Épico 4 --- Equipes, jogadores e inscrições

**Objetivo:** cadastrar participantes e controlar quem pode jogar por
cada equipe.

-   [ ] **P0** Implementar CRUD de equipes.
-   [ ] **P0** Implementar CRUD de jogadores.
-   [ ] **P0** Implementar associação de equipe à competição.
-   [ ] **P0** Impedir equipe duplicada na mesma competição.
-   [ ] **P0** Implementar inscrição de jogador por competição/equipe.
-   [ ] **P0** Impedir jogador em duas equipes na mesma competição.
-   [ ] **P0** Implementar aprovação/rejeição de inscrição.
-   [ ] **P0** Validar que equipe inscrita pertence à competição.
-   [ ] **P0** Criar telas administrativas de equipes e jogadores.
-   [ ] **P0** Criar tela de elenco/inscrições da competição.
-   [ ] **P1** Implementar busca e filtros de jogadores/equipes.
-   [ ] **P1** Implementar histórico de participações do jogador.

**Critério de aceite:** equipe pode participar de várias competições;
jogador pode participar de competições diferentes, mas somente por uma
equipe em cada competição; apenas inscrição aprovada pode ser usada em
partida.

### Épico 5 --- Fases, grupos e regras

**Objetivo:** representar a estrutura de cada formato de competição.

-   [ ] **P0** Criar entidades/migrations `competition_phases`.
-   [ ] **P0** Criar entidades/migrations `competition_groups`.
-   [ ] **P0** Criar entidade/migration `competition_group_teams`.
-   [ ] **P0** Criar entidade/migration `competition_rules`.
-   [ ] **P0** Implementar criação e ordenação de fases.
-   [ ] **P0** Implementar criação de grupos.
-   [ ] **P0** Implementar associação de equipes aos grupos.
-   [ ] **P0** Validar que equipes pertencem à competição.
-   [ ] **P1** Implementar configuração de classificados por grupo.
-   [ ] **P1** Implementar interface de configuração de fases e grupos.

**Critério de aceite:** administrador consegue configurar a estrutura de
fases e grupos sem permitir associação de equipes de outra competição.

### Épico 6 --- Partidas e geração de calendário

**Objetivo:** criar partidas manualmente e gerar confrontos conforme o
formato.

-   [ ] **P0** Criar entidade/migration `matches`.
-   [ ] **P0** Implementar cadastro manual de partida.
-   [ ] **P0** Implementar edição de data, horário e local.
-   [ ] **P0** Implementar estados da partida.
-   [ ] **P0** Implementar listagem por competição, fase, grupo e
    rodada.
-   [ ] **P0** Implementar validação de mandante/visitante diferentes.
-   [ ] **P0** Validar que as equipes pertencem à competição.
-   [ ] **P0** Implementar geração de jogos para fase de grupos.
-   [ ] **P0** Implementar geração de jogos para pontos corridos,
    conforme turnos configurados.
-   [ ] **P1** Implementar geração de confrontos de mata-mata.
-   [ ] **P1** Implementar agrupamento de ida e volta pelo identificador
    do confronto.
-   [ ] **P1** Implementar avanço automático de vencedores após regra de
    desempate aprovada.
-   [ ] **P0** Criar telas de calendário e edição de partidas.

**Critério de aceite:** calendário gerado corresponde à configuração da
competição; partidas podem ser ajustadas manualmente sem violar
integridade.

### Épico 7 --- Lançamento de súmula e resultados

**Objetivo:** registrar, depois do jogo, o placar e os eventos da
súmula.

-   [ ] **P0** Criar entidade/migration `match_players`.
-   [ ] **P0** Criar entidade/migration `match_events`.
-   [ ] **P0** Implementar relação de jogadores da partida.
-   [ ] **P0** Implementar seleção de titulares e reservas.
-   [ ] **P0** Implementar identificação do goleiro designado por
    equipe.
-   [ ] **P0** Implementar lançamento do placar final.
-   [ ] **P0** Implementar registro de autores dos gols.
-   [ ] **P0** Implementar registro dos cartões confirmados no escopo.
-   [ ] **P0** Validar que jogadores pertencem à equipe e estão
    aprovados na competição.
-   [ ] **P0** Implementar finalização da partida em transação.
-   [ ] **P0** Implementar correção de resultado/eventos pelo
    administrador.
-   [ ] **P0** Implementar conciliação de gols individuais com o placar,
    incluindo as exceções aprovadas.
-   [ ] **P0** Criar interface de lançamento de súmula.
-   [ ] **P1** Implementar histórico básico de alterações
    administrativas.

**Critério de aceite:** administrador consegue lançar uma súmula
completa após o jogo; dados inválidos não são salvos parcialmente;
partida finalizada alimenta os cálculos.

### Épico 8 --- Classificação e estatísticas

**Objetivo:** calcular automaticamente tabelas e rankings.

-   [ ] **P0** Implementar serviço de cálculo de classificação.
-   [ ] **P0** Implementar pontuação configurável.
-   [ ] **P0** Implementar saldo de gols, gols pró e gols contra.
-   [ ] **P0** Implementar critérios de desempate na ordem configurada.
-   [ ] **P0** Implementar classificação separada por grupo.
-   [ ] **P0** Excluir partidas não finalizadas/canceladas dos cálculos.
-   [ ] **P0** Implementar cálculo de artilharia.
-   [ ] **P0** Implementar cálculo de equipes com mais vitórias.
-   [ ] **P0** Implementar ranking de cartões vermelhos.
-   [ ] **P0** Implementar cálculo de goleiro menos vazado conforme
    regra aprovada.
-   [ ] **P0** Garantir recálculo correto após edição/exclusão de evento
    ou correção de placar.
-   [ ] **P0** Criar testes unitários para classificação e rankings.
-   [ ] **P0** Criar telas administrativas de consulta.

**Critério de aceite:** os resultados dos cálculos são reproduzíveis a
partir das partidas e eventos; corrigir um resultado corrige todos os
dados derivados.

### Épico 9 --- Disciplina

**Objetivo:** permitir controle administrativo de ocorrências e
punições.

-   [ ] **P1** Criar entidades/migrations `disciplinary_records` e
    `disciplinary_suspensions`.
-   [ ] **P1** Implementar cadastro de advertência, multa e suspensão.
-   [ ] **P1** Implementar associação com jogador, equipe e competição.
-   [ ] **P1** Implementar controle manual de jogos cumpridos.
-   [ ] **P1** Implementar histórico disciplinar.
-   [ ] **P1** Criar telas administrativas.
-   [ ] **P1** Definir quais informações disciplinares serão públicas.

**Critério de aceite:** administrador registra e acompanha punições sem
automatizar regras de acúmulo não aprovadas.

### Épico 10 --- Portal público

**Objetivo:** permitir consulta das competições sem login.

-   [ ] **P0** Criar endpoints públicos de competições publicadas.
-   [ ] **P0** Criar página inicial.
-   [ ] **P0** Criar listagem de competições.
-   [ ] **P0** Criar página de detalhes da competição.
-   [ ] **P0** Exibir equipes e jogadores públicos.
-   [ ] **P0** Exibir calendário e resultados.
-   [ ] **P0** Exibir classificação.
-   [ ] **P0** Exibir artilharia e rankings.
-   [ ] **P1** Criar página pública de equipe.
-   [ ] **P1** Criar página pública de jogador.
-   [ ] **P1** Exibir informações disciplinares permitidas.
-   [ ] **P0** Garantir que documentos pessoais nunca sejam retornados
    em endpoints públicos.
-   [ ] **P0** Implementar layout responsivo.

**Critério de aceite:** visitante consulta todas as informações
publicadas sem autenticação e não consegue acessar dados privados nem
executar alterações.

### Épico 11 --- Galeria de fotos

**Objetivo:** publicar álbuns e fotografias por competição.

-   [ ] **P1** Definir serviço de armazenamento.
-   [ ] **P1** Criar entidades/migrations `photo_albums` e `photos`.
-   [ ] **P1** Implementar upload validado.
-   [ ] **P1** Implementar criação e edição de álbuns.
-   [ ] **P1** Implementar remoção de fotos.
-   [ ] **P1** Criar interface administrativa da galeria.
-   [ ] **P1** Criar galeria pública por competição.

**Critério de aceite:** administrador publica imagens e visitantes
visualizam somente álbuns de competições publicadas.

### Épico 12 --- Qualidade, segurança e publicação

**Objetivo:** validar a aplicação e disponibilizá-la.

-   [ ] **P0** Testar autenticação e autorização.
-   [ ] **P0** Testar constraints e integridade relacional.
-   [ ] **P0** Testar geração de partidas.
-   [ ] **P0** Testar classificação e desempates.
-   [ ] **P0** Testar W.O. e cancelamentos.
-   [ ] **P0** Testar correção de resultados e recálculos.
-   [ ] **P0** Testar estatísticas individuais e coletivas.
-   [ ] **P0** Testar exposição de dados públicos.
-   [ ] **P0** Testar layout em celular, tablet e desktop.
-   [ ] **P0** Configurar ambientes de produção.
-   [ ] **P0** Configurar variáveis e segredos.
-   [ ] **P0** Configurar backup do PostgreSQL.
-   [ ] **P0** Configurar HTTPS e CORS.
-   [ ] **P0** Executar smoke tests após deploy.
-   [ ] **P1** Configurar monitoramento básico e logs.

**Critério de aceite:** fluxos críticos passam nos testes, aplicação
está publicada e existe procedimento de backup e recuperação.

------------------------------------------------------------------------

## 4. Ordem recomendada para começar

A sequência prática de implementação é:

1.  Épico 0 --- decisões essenciais.
2.  Épico 1 --- fundação.
3.  Épico 2 --- banco e autenticação.
4.  Épico 3 --- competições.
5.  Épico 4 --- equipes, jogadores e inscrições.
6.  Épico 5 --- fases e grupos.
7.  Épico 6 --- partidas e calendário.
8.  Épico 7 --- súmula e resultados.
9.  Épico 8 --- classificação e estatísticas.
10. Épico 10 --- portal público.
11. Épicos 9 e 11 --- disciplina e galeria.
12. Épico 12 --- validação final e publicação.

Algumas tarefas P1 podem ser antecipadas quando forem dependências de
uma funcionalidade aprovada.

------------------------------------------------------------------------

## 5. Definição de pronto (Definition of Done)

Uma tarefa só será considerada concluída quando:

-   [ ] Implementação atende ao requisito descrito.
-   [ ] Validações de entrada foram implementadas.
-   [ ] Regras de autorização foram verificadas.
-   [ ] Testes automatizados relevantes foram criados e passaram.
-   [ ] Interface apresenta estados de carregamento, sucesso e erro,
    quando aplicável.
-   [ ] Não há erros relevantes no console/log.
-   [ ] Documentação técnica foi atualizada quando necessário.
-   [ ] Não foram introduzidas funcionalidades fora do escopo.

------------------------------------------------------------------------

## 6. Primeiro pacote de implementação

Para iniciar com segurança, implementar somente:

1.  Estrutura dos repositórios frontend e backend.
2.  PostgreSQL e migrations.
3.  Entidade do administrador e autenticação.
4.  CRUD de competições.
5.  CRUD de equipes.
6.  CRUD de jogadores.
7.  Inscrição de equipes e jogadores.

Não começar pela geração de mata-mata ou pelos rankings. Esses módulos
dependem das entidades e regras anteriores.

**Entrega do primeiro pacote:** administrador consegue entrar no
sistema, cadastrar uma competição, cadastrar equipes, cadastrar
jogadores e vincular/aprovar os jogadores para a competição.
