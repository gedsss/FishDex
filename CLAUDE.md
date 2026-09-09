# FishDex — App de Pescaria estilo Pokédex

Contexto persistente do projeto. Mantenha este arquivo atualizado conforme decisões forem tomadas, para que qualquer sessão futura do Claude Code tenha o histórico completo e não precise redescobrir o escopo do zero.

## Visão geral do produto

O usuário pesca um peixe, tira uma foto da captura (armazenada pelo app) e registra qual espécie pescou, escolhendo entre um catálogo fixo de espécies. Cada espécie tem uma dificuldade que define quanto XP a captura concede; XP acumulado sobe o nível do usuário (progressão estilo RPG/Pokédex — o objetivo é "completar a coleção" de espécies e evoluir de nível).

Também funciona como rede social simples:

- Usuários se adicionam como amigos.
- Feed mostra capturas recentes dos amigos.
- Fotos de captura recebem reações com emojis pré-definidos (sem comentários).
- Perfil de um amigo mostra: nível, conquistas desbloqueadas, fotos de capturas e contagem de peixes por espécie.

## Stack técnica

- **Backend**: Node.js + Fastify
- **Banco**: PostgreSQL via Docker (docker-compose para ambiente local)
- **ORM**: Prisma
- **Autenticação**: `@fastify/jwt`
- **Hash de senha**: bcrypt
- **Validação**: zod
- **Testes**: Vitest + `app.inject()` nativo do Fastify (decisão fechada em `SERVIDOR.md`)
- **Frontend**: mobile (React Native ou Flutter — a definir, fora do escopo atual)
- **Storage de fotos**: a definir (disco local vs. S3/R2/Supabase Storage) — não bloqueia a modelagem atual

## Fase atual: backend implementado + integrado ao app mobile

O backend está **completo e em uso pelo app mobile** (`../PROJETO-INTEGRADOR FRONT 2026-2/mobile`), rodando contra o Postgres real. Todos os módulos (`auth`, `users`, `species`, `catches`, `feed`, `friendships`, `reactions`, `achievements`, `uploads`) têm routes/controller/service/repository implementados e testados (Vitest). Guia de subir os dois juntos: `INTEGRACAO.md`. Contrato completo da API: `README.md`.

O que foi adicionado na fase de integração (ver "Decisões em aberto" abaixo para o racional):

- **Metadados de espécie** no schema (`habitat`, `family`, `averageSizeCm`, `diet`, `baits`, `regions`, `mapPins`, `tone`, `dexOrder`) — alimentam a ficha técnica do app. Migration `20260908053232_species_metadata`.
- **Upload de foto** (`POST /uploads`, disco local, servido por `@fastify/static`).
- **Captura enriquecida** (`src/shared/feed-catch.ts`): feed/captura devolvem autor + contadores de reação + "nova espécie".
- **`GET /users/:id/catches`** (galeria de capturas no perfil de um amigo).
- **Seed real** (`prisma/seed.ts`): 12 espécies, catálogo de conquistas, 3 usuários demo já amigos com capturas e reações.

Arquivos de fundação já criados na raiz do projeto:

- `prisma/schema.prisma` — schema completo (ver detalhamento abaixo)
- `prisma.config.ts` — configuração do Prisma CLI (ver nota sobre Prisma 7 abaixo)
- `docker-compose.yml` — Postgres local (porta 5433 no host, ver nota abaixo)
- `.env` / `.env.example` — variáveis de ambiente necessárias
- `.gitignore` — ignora `node_modules`, `.env` e o client gerado (`/generated/prisma`)
- `package.json` — dependências já instaladas (`node_modules`), listadas na seção de setup
- `prisma/migrations/20260824222813_init/` — migration inicial já aplicada no Postgres local (8 tabelas: `users`, `species`, `catches`, `friendships`, `reactions`, `achievements`, `user_achievements`, `_prisma_migrations`)
- `generated/prisma/` — Prisma Client já gerado (gitignored, se perder basta `npx prisma generate`)

> **Nota — Prisma 7 instalado neste ambiente**: a CLI local é a `7.9.1`, e o Prisma 7 mudou significativamente a forma de configurar a conexão em relação a versões anteriores (5/6), que é o que a maioria dos tutoriais/exemplos por aí ainda mostra. As diferenças relevantes, **confirmadas rodando a CLI real** (não só na documentação, que estava inconsistente entre páginas):
>
> - O bloco `datasource` no `schema.prisma` **não aceita mais `url`** — a URL de conexão fica só no `prisma.config.ts` (usado pela CLI para `migrate`/`db seed`/etc.).
> - O generator agora é `provider = "prisma-client"` (não mais `"prisma-client-js"`) e exige um `output` explícito — o client não é mais gerado dentro de `node_modules`.
> - **O client gerado é sempre TypeScript** (`.ts`), mesmo que o resto do projeto seja JavaScript puro — não existe opção de gerar `.js` puro no generator `prisma-client`. Isso significa que rodar o app vai exigir um runtime com suporte a TS (`tsx`, por exemplo) só por causa do Prisma, independente da decisão de usar TypeScript no resto do backend.
> - `PrismaClient` **não conecta mais sozinho lendo `DATABASE_URL` implicitamente** — é obrigatório passar um *driver adapter* no construtor (`@prisma/adapter-pg` para Postgres). Testado localmente: `new PrismaClient()` sem adapter lança erro em tempo de execução (`"A driver adapter is required to connect to your database."`).
>
> Isso está refletido nos arquivos criados e nos passos de setup abaixo. Se em algum momento o projeto for fixado numa versão anterior do Prisma (5/6), essas seções precisam ser revisadas (volta a ser o modelo mais simples: `url` no `datasource`, `prisma-client-js`, sem adapter obrigatório).

---

## Modelo de dados

### User

Conta e progressão: `username`/`email` únicos, `passwordHash` (bcrypt, nunca retornado em nenhuma rota), `avatarUrl` opcional, `level` e `xp`.

**Decisão**: `xp` é a fonte da verdade (total acumulado); `level` é um valor derivado, mas persistido como cache para evitar recalcular a fórmula XP→nível em toda leitura (ex.: exibir nível no feed de amigos sem precisar rodar a fórmula por usuário listado). Sempre que uma `Catch` é criada, o service recalcula `level` a partir do novo `xp` total e atualiza os dois campos na mesma transação. Isso significa que a fórmula de progressão (ver "Decisões em aberto") deve ser uma função pura, sem estado, para que `level` nunca fique dessincronizado de `xp`.

### Species (catálogo fixo)

`difficulty` é um enum (`EASY`, `MEDIUM`, `HARD`, `EPIC`, `LEGENDARY`) usado só como rótulo de exibição/filtro; `baseXp` é o campo numérico autoritativo que efetivamente concede XP. Separar os dois evita que ajustar o XP de uma espécie específica force uma migração de enum ou uma tabela de lookup dificuldade→XP.

**Metadados (migration `species_metadata`)**: `dexOrder` (Int, numeração estável do Dex — `GET /species` ordena por ele), `habitat` (`"Doce"`/`"Salgada"`), `family`, `averageSizeCm`, `diet`, `baits` (`String[]`), `regions` e `mapPins` (`Json`: `[{name,season}]` e `[{x,y,label}]`), `tone` (`String[]` de 2 cores hex). Todos opcionais — o cadastro mínimo de uma espécie continua sendo `name` + `difficulty` + `baseXp`. São conteúdo fixo em pt-BR, mesmo tratamento de `description`; alimentam a ficha técnica e os filtros do app. Populados pelo `prisma/seed.ts`.

### Catch

Relacionamento **1:N** (User → Catch, Species → Catch): uma captura pertence a exatamly um usuário e a exatamente uma espécie; um usuário/espécie tem muitas capturas.

Pontos de modelagem importantes:

- `xpAwarded` é um **snapshot** do XP concedido no momento da captura (copiado de `species.baseXp` na hora de criar o registro), não uma referência calculada em tempo real. Isso preserva o histórico: se o design rebalancear o XP de uma espécie no futuro, o total de XP já ganho pelos usuários não muda retroativamente.
- `onDelete: Restrict` em `species` — não é possível apagar uma espécie do catálogo se já existem capturas registradas para ela (protege integridade histórica). `onDelete: Cascade` em `user` — se uma conta for removida, suas capturas somem junto.
- `@@index([userId, capturedAt])` cobre tanto "capturas de um usuário ordenadas por data" (perfil pessoal) quanto entra como ponto de partida para a query do feed (capturas de um conjunto de `userId` amigos, ordenadas por `capturedAt`).
- `@@index([speciesId])` acelera a agregação "quantos peixes desta espécie o usuário já pegou" (`GROUP BY userId, speciesId`).
- **Não existe** uma tabela separada de "contagem por espécie" — a Pokédex pessoal (quantidade capturada por espécie) é derivada via `COUNT(*) GROUP BY speciesId` sobre `Catch`, não denormalizada. Evita duplicar estado que pode dessincronizar; só vale introduzir uma tabela de resumo depois, se a agregação virar gargalo de performance real.

### Friendship

Relacionamento **N:N entre User e User**, modelado como tabela explícita (não `@relation` implícita) porque carrega estado (`status`) e metadados (quem pediu, quando).

**Decisão de modelagem (a mais não-óbvia do schema)**: em vez de um par simples `requesterId`/`addresseeId` com unicidade nesse par, uso `userAId`/`userBId` **ordenados deterministicamente** (ex.: comparação de string, o menor UUID vira `userAId`) mais um `requestedById` separado para saber quem de fato enviou o pedido. Isso permite `@@unique([userAId, userBId])` garantir, em nível de banco, que existe no máximo uma linha de amizade por par de usuários — sem essa normalização, um pedido A→B e um pedido B→A (enviado antes do primeiro ser respondido, ou depois de um bloqueio) criariam duas linhas diferentes e a constraint de unicidade não pegaria a duplicidade, porque `(A,B)` e `(B,A)` são combinações distintas para o Postgres. O trade-off é que o service precisa ordenar o par antes de qualquer `create`/`upsert`, e a lógica de "quem pode aceitar" usa `requestedById` (só o outro lado do par pode aceitar/recusar).

Alternativa mais simples (sem ordenação) está listada em "Decisões em aberto" caso você prefira menos complexidade no service em troca de checar duplicidade manualmente antes de inserir.

`status`: `PENDING` → `ACCEPTED` ou permanece pendente; `BLOCKED` como estado terminal (regras exatas de bloqueio — ex.: se impede reenvio de pedido — ainda em aberto).

### Reaction

Relacionamento **N:N entre User e Catch**, também como tabela explícita porque carrega o `emoji` escolhido.

`@@unique([catchId, userId])` implementa diretamente a regra "um usuário só pode ter uma reação por captura": ao invés de impedir a reação repetida, essa constraint é usada para *upsert* — se o usuário reage de novo com outro emoji, é um `UPDATE` na mesma linha (troca a reação), não um `INSERT` bloqueado. `@@index([catchId])` acelera contar/agrupar reações por captura (para mostrar contadores por emoji na foto).

### Achievement / UserAchievement

Mesmo padrão de `Species`: `Achievement` é catálogo fixo, `UserAchievement` é a tabela de junção que registra quando (`unlockedAt`) cada usuário desbloqueou cada conquista. `@@unique([userId, achievementId])` impede desbloquear a mesma conquista duas vezes. Modelado agora, mesmo não sendo usado nesta fase, para não exigir migração estrutural depois — só popular o catálogo e passar a inserir linhas.

### IDs

Todas as entidades usam `String @id @default(uuid())` em vez de inteiro autoincrementado. Motivo: IDs vão trafegar em URLs de API pública (`GET /catches/:id`) e um contador sequencial vaza informação (ex.: dá para estimar quantos usuários existem, ou enumerar capturas de outros usuários por força bruta incrementando o número). UUID tem custo de índice ligeiramente maior que int, irrelevante na escala deste projeto.

---

## Estrutura de pastas recomendada (backend Fastify)

```text
fishdex-backend/
├── docker-compose.yml
├── .env
├── .env.example
├── package.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts               # popula Species e Achievements (catálogos fixos)
├── src/
│   ├── server.ts             # ponto de entrada: só dá listen na instância Fastify
│   ├── app.ts                # cria a instância Fastify, registra plugins e módulos
│   ├── config/
│   │   └── env.ts            # lê e valida process.env com zod, exporta objeto tipado
│   ├── plugins/
│   │   ├── prisma.ts         # instancia PrismaClient (com driver adapter, ver nota Prisma 7) e decora fastify.prisma
│   │   └── jwt.ts            # registra @fastify/jwt com o secret do env
│   ├── hooks/
│   │   └── authenticate.ts   # preHandler reutilizável (ver seção de auth)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts       # zod: registerBody, loginBody
│   │   ├── users/
│   │   │   ├── users.routes.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   └── users.schema.ts
│   │   ├── species/
│   │   │   ├── species.routes.ts
│   │   │   ├── species.service.ts
│   │   │   ├── species.repository.ts
│   │   │   └── species.schema.ts
│   │   ├── catches/
│   │   │   ├── catches.routes.ts
│   │   │   ├── catches.service.ts    # calcula xpAwarded, atualiza xp/level do User
│   │   │   ├── catches.repository.ts
│   │   │   └── catches.schema.ts
│   │   ├── friendships/
│   │   │   ├── friendships.routes.ts
│   │   │   ├── friendships.service.ts # ordena userAId/userBId antes de gravar
│   │   │   ├── friendships.repository.ts
│   │   │   └── friendships.schema.ts
│   │   ├── feed/
│   │   │   ├── feed.routes.ts
│   │   │   ├── feed.service.ts        # busca catches dos amigos, pagina
│   │   │   └── feed.schema.ts
│   │   ├── reactions/
│   │   │   ├── reactions.routes.ts
│   │   │   ├── reactions.service.ts   # upsert por (catchId, userId)
│   │   │   ├── reactions.repository.ts
│   │   │   └── reactions.schema.ts
│   │   └── achievements/
│   │       ├── achievements.routes.ts
│   │       ├── achievements.service.ts
│   │       ├── achievements.repository.ts
│   │       └── achievements.schema.ts
│   └── shared/
│       ├── errors.ts          # classes de erro de domínio (NotFoundError, ConflictError...)
│       └── pagination.ts      # helpers de paginação por cursor
└── test/                      # opcional nesta fase
```

Separação de camadas dentro de cada módulo:

- **routes**: só HTTP — recebe request, valida body/params/query com o schema zod do módulo, chama o service, formata a resposta e o status code. Não fala com o Prisma diretamente.
- **service**: regra de negócio (ex.: calcular `xpAwarded`, checar se já existe amizade entre o par antes de criar, recalcular `level` do usuário). Não conhece o Fastify (nem `request`/`reply`), o que facilita testar isoladamente.
- **repository**: única camada que importa o `PrismaClient` e faz queries. Sem lógica de negócio — só CRUD e queries específicas do domínio.
- **schema**: schemas zod de entrada (e, se quiser, de saída) do módulo, exportados também como tipos TS via `z.infer`.

Cada módulo é registrado em `app.ts` como um plugin Fastify encapsulado (`fastify.register(catchesModule, { prefix: '/catches' })`), o que permite aplicar hooks (como o de autenticação) só dentro daquele encapsulamento, sem vazar para outros módulos.

### Padrão Repository (decisão confirmada)

A camada `repository` de cada módulo segue o **Repository Pattern** deliberadamente: é a única parte do código autorizada a importar o `PrismaClient`/`fastify.prisma`. Motivo — isolar toda a API do Prisma (nomes de campos, sintaxe de `where`/`include`, etc.) atrás de funções com nomes de domínio, para que:

- `service` e `routes` nunca vejam a sintaxe do Prisma diretamente — se o ORM ou a modelagem de uma tabela mudar, só o repository daquele módulo é tocado.
- Os services fiquem testáveis isoladamente (mock do repository em vez de subir um banco de teste).
- Cada aggregate root tenha um único ponto de acesso a dados, evitando queries Prisma espalhadas pelo código.

Convenção de nomes por repository (nem todo repository precisa de todos — só o que o módulo usa):

- `findById(id)` — retorna um registro ou `null`.
- `findMany(filter, pagination?)` — lista com filtro básico.
- `create(data)` / `update(id, data)` / `delete(id)`.
- Queries específicas de domínio ganham nome descritivo, não genérico — ex.: `findByPair(userAId, userBId)` em `friendships.repository.ts`, `countByUserGroupedBySpecies(userId)` em `catches.repository.ts`, `upsertByCatchAndUser(catchId, userId, emoji)` em `reactions.repository.ts`.

Repository devolve o tipo do model gerado pelo Prisma (ou uma projeção dele via `select`), sem mapear para DTO — quem decide o formato exposto na API é o `service` (ex.: `toPublicUser()` remove `passwordHash` antes de chegar na rota). Repository não lança as classes de erro de domínio de `shared/errors.ts` (isso é responsabilidade do `service`, que sabe o contexto de negócio); o repository só propaga o que o Prisma retornar/lançar.

### `src/plugins/prisma.ts` (driver adapter obrigatório no Prisma 7)

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

Registrar como plugin Fastify (`fastify.decorate('prisma', prisma)`) permite acessar via `fastify.prisma`/`request.server.prisma` dentro dos repositories, sem cada módulo importar o client diretamente.

---

## Autenticação com `@fastify/jwt`

- **Registro do plugin** (`src/plugins/jwt.ts`): `fastify.register(fastifyJwt, { secret: env.JWT_SECRET })`, secret vindo de `config/env.ts` (nunca hardcoded).
- **Emissão do token** (`auth.service.ts`, nos handlers de registro/login): após validar credenciais (bcrypt.compare), assina com `fastify.jwt.sign({ sub: user.id })` — o payload carrega só o ID do usuário, nunca dados sensíveis (o token pode ser decodificado por qualquer um, não é criptografado). Nesta fase, apenas **access token** (sem refresh token) — ver "Decisões em aberto" sobre expiração/refresh.
- **Hook de autenticação** (`src/hooks/authenticate.ts`): função `preHandler` reutilizável que chama `await request.jwtVerify()` (fornecido pelo plugin); se falhar, o próprio `@fastify/jwt` já responde 401. Em caso de sucesso, `request.user` fica disponível com o payload decodificado (`{ sub: userId }`).
- **Proteção de rotas**: dois níveis possíveis —
  - Por rota individual: `fastify.get('/me', { preHandler: [authenticate] }, handler)`.
  - Por módulo inteiro: dentro do plugin do módulo, `fastify.addHook('preHandler', authenticate)` antes de declarar as rotas — todas as rotas registradas depois nesse encapsulamento exigem token. Útil para `catches`, `friendships`, `feed`, `reactions` (praticamente tudo exceto `auth` e a listagem pública do catálogo de `species`).
- **Senha**: hash com bcrypt no `auth.service.ts` (`bcrypt.hash` no registro, `bcrypt.compare` no login). O `passwordHash` nunca é incluído em nenhum `select`/retorno de rota — recomendo um mapper `toPublicUser(user)` usado em todo lugar que serializa um `User` para resposta, para não depender de lembrar de omitir o campo manualmente em cada handler.

---

## Setup do ambiente local

> **Status**: já executado nesta máquina em 2026-08-24 — `package.json` criado, dependências instaladas, container Postgres no ar e migration `init` aplicada (8 tabelas). Os passos abaixo documentam o processo para reproduzir em outra máquina ou depois de um `git clone` limpo.
>
> **Nota — porta do Postgres**: o `docker-compose.yml` expõe o Postgres do projeto na porta **5433** do host, não a 5432 padrão. Motivo: esta máquina já tem um **PostgreSQL nativo do Windows rodando como serviço** (`postgres.exe`, fora do Docker) ocupando a porta 5432 — descoberto porque `prisma migrate dev` inicialmente falhava com erro de autenticação, mesmo com as credenciais corretas no `.env`. O `docker compose up` subia o container normalmente, mas a conexão em `localhost:5432` caía no Postgres nativo (que não tem o usuário/senha `fishdex`), não no container. Em vez de mexer no serviço nativo (pode estar em uso por outro projeto), o container deste projeto foi remapeado para `5433:5432`. Se for rodar em outra máquina sem esse conflito, pode voltar para `5432:5432` à vontade — só manter `.env`/`.env.example` e `docker-compose.yml` consistentes entre si.

1. **Subir o Postgres**: `docker compose up -d` (usa o `docker-compose.yml` já criado na raiz).
2. **Variáveis de ambiente**: `cp .env.example .env` e ajustar se necessário (os valores default do `.env.example` já batem com o `docker-compose.yml`, incluindo a porta 5433). O Prisma **não carrega `.env` sozinho** (mudou no Prisma 7) — quem faz isso é o `import "dotenv/config"` no topo do `prisma.config.ts` (já incluído no arquivo criado) e o próprio `dotenv` deve ser carregado da mesma forma no entrypoint da aplicação (`src/server.ts`).
3. **Instalar dependências** (ainda não há `package.json` — criar com `npm init -y` e instalar):

   ```bash
   npm install fastify @fastify/jwt bcrypt zod @prisma/client@7 @prisma/adapter-pg dotenv
   npm install -D prisma@7 tsx
   ```

   `pg` (driver nativo do Postgres) não precisa ser instalado à parte — vem como dependência transitiva do `@prisma/adapter-pg`.

   **Sobre `tsx`**: o client gerado pelo Prisma 7 é sempre TypeScript (ver nota acima), então `tsx` é necessário para rodar o projeto mesmo que o resto do código seja `.js` puro — ele executa `.ts`/`.js` misturados sem precisar de um build step separado. Isso é um argumento a mais para a decisão "TypeScript vs. JavaScript" listada em "Decisões em aberto": na prática, o projeto já depende de um runtime com suporte a TS de qualquer forma.

4. **Prisma**: o `prisma/schema.prisma` e o `prisma.config.ts` já existem, então **não** rodar `prisma init` (ele sobrescreveria os arquivos). Direto:

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

   Note que no Prisma 7 `migrate dev` **não** roda `generate` nem o seed automaticamente mais — cada passo precisa ser chamado explicitamente.
5. **Seed do catálogo fixo** (quando `prisma/seed.ts` existir): configurar `"prisma": { "seed": "tsx prisma/seed.ts" }` no `package.json` e rodar `npx prisma db seed` para popular `Species` e `Achievement`.
6. **Inspecionar dados**: `npx prisma studio`.

---

## Regras de negócio já definidas

- Cada `Species` tem uma dificuldade fixa e um `baseXp`, copiado como `xpAwarded` no momento da captura.
- XP acumulado (`User.xp`) eleva o nível (`User.level`); fórmula de progressão XP→nível ainda em aberto.
- Foto da captura é armazenada pelo próprio app; estratégia de storage em aberto.
- Feed mostra capturas dos amigos, ordenadas por `capturedAt`; paginação em aberto.
- Reações são um enum fechado de emojis; sem texto livre, sem comentários; um usuário tem no máximo uma reação por captura (trocável).
- Perfil de um amigo expõe: nível, conquistas, fotos de capturas e contagem de capturas por espécie.

## Decisões em aberto (confirmar antes de avançar)

1. ~~**Fórmula XP → nível**~~ — **fechada: linear, 100 XP por nível.** `calculateLevel(xp) = Math.floor(xp / 100) + 1` em `src/modules/catches/level.ts`. O frontend espelha a fórmula em `src/constants/theme.ts` (`xpProgress`) só para desenhar a barra de progresso.
2. ~~**Storage das fotos**~~ — **fechada: disco local.** `POST /uploads` (multipart, `@fastify/multipart`) salva em `uploads/<uuid>.<ext>` e devolve `{ url: "/uploads/..." }`; `@fastify/static` serve de volta. O app envia a foto **antes** de `POST /catches` e guarda o caminho relativo em `photoUrl`. Trocar por bucket externo depois = mexer só no módulo `uploads` + no `src/api/uploads.ts` do app. `uploads/` é gitignorado.
3. ~~**Paginação do feed**~~ — **fechada: offset (`?page=&limit=`).** `GET /feed` e `GET /catches/me` aceitam `page`/`limit`; o app usa `useInfiniteQuery` com página de 3. Suficiente para a escala do projeto; migrar para cursor depois é trocar o `skip/take` do `feed.repository`.
4. ~~**Conjunto de emojis de reação**~~ — **fechado: os 6 do enum** (`LIKE`, `LOVE`, `FIRE`, `WOW`, `CLAP`, `BIG_ONE`). O app tem rótulo/cor para cada um em `src/constants/theme.ts` (`ReactionMeta`).
5. ~~**Modelagem de `Friendship`**~~ — **fechada: par ordenado (`userAId`/`userBId`)**, como descrito acima. Implementado em `friendships.repository.ts` (`sortPair`).
6. ~~**JavaScript puro vs. TypeScript** no backend~~ — **decisão fechada em `SERVIDOR.md` (item 0 da tabela de decisões): TypeScript.** Motivo: o Prisma 7 gera o client sempre como TypeScript (não existe saída `.js` pura nesse generator), então o projeto já precisa de um runtime com suporte a TS (`tsx`) de qualquer forma — escrever os módulos também em TS evita misturar `.js` de aplicação com `.ts` gerado. Falta só criar `tsconfig.json` e instalar `@types/node`/`@types/bcrypt` (Fase 0.7 do `SERVIDOR.md`).
7. **Localização da captura**: armazenar coordenadas exatas (`locationLat`/`locationLng`) tem implicação de privacidade (expõe onde o usuário pesca/mora) — considerar se deve ser opcional/aproximado, ou omitido do perfil público de amigos.
8. **Regras de bloqueio de amizade**: o que exatamente `BLOCKED` impede — reenvio de pedido, aparecer no feed, ver perfil?
9. **Edição/remoção de uma `Catch` já registrada**: se permitido, precisa reverter/recalcular `xp`/`level` do usuário — vale a pena bloquear edição de `speciesId` (ou de qualquer campo que afete XP) depois de criada, e permitir só editar campos descritivos (peso, comprimento, foto)?

## Próximas fases (fora do escopo atual)

Já entregue: fórmula de XP/nível, upload de fotos, feed + amizade + paginação, reações, conquistas, e o app mobile (Expo/React Native, na pasta `mobile/`) integrado ponta a ponta.

Ainda em aberto:

- Itens 7–9 das "Decisões em aberto" (localização/privacidade, regras de `BLOCKED`, edição de `Catch`).
- Refresh token / expiração de sessão (hoje só access token).
- Storage de fotos em bucket externo (hoje disco local) para deploy.
- Estratégia de deploy e infraestrutura de produção.
- Migrar paginação do feed para cursor, se a base crescer.
