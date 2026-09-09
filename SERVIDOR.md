# Plano de Ação — FishDex Backend

Backend que registra capturas de peixes, aplica progressão de XP/nível por espécie capturada e conecta usuários numa rede social simples (amizades, feed, reações a fotos).

Stack escolhida: Node.js + Fastify + TypeScript, PostgreSQL (Docker local) + Prisma 7, Zod (validação), bcrypt (hash de senha), `@fastify/jwt` (autenticação), Vitest (testes), tsx (runtime de dev).

> **Status (integração concluída):** todas as fases 0–4 estão implementadas e o
> backend está integrado ponta a ponta com o app mobile (`../PROJETO-INTEGRADOR
> FRONT 2026-2/mobile`), rodando com dados reais do Postgres. Suíte Vitest: 37
> testes passando. O contrato final da API está em `README.md`; o passo a passo de
> subir backend + app juntos está em `INTEGRACAO.md`. Os checkboxes `[ ]` abaixo são
> o plano original — vários já foram entregues; onde a implementação divergiu do
> plano (ex.: paginação offset em vez de cursor, sem `$transaction` na criação da
> captura, upload em disco local), a nota no item registra a diferença. Itens
> genuinamente pendentes: `$transaction` na captura (2.2.2), refresh token,
> storage em bucket externo, regras de `BLOCKED`.

Ação imediata (histórica): fechar o setup de TypeScript (`tsconfig.json` + `@types/*`) antes de criar qualquer arquivo em `src/` — o client gerado pelo Prisma 7 já é TypeScript-only, então misturar `.js` de aplicação com `.ts` gerado só cria atrito depois. Ver checklist da Fase 0 abaixo.

---

## 0. Decisões técnicas (fechadas antes de codar)

| Item | Decisão |
| --- | --- |
| Runtime | Node.js + TypeScript |
| Framework | Fastify |
| Banco | PostgreSQL via Docker local (porta **5433** do host — 5432 já está ocupada por um Postgres nativo do Windows nesta máquina) |
| ORM | Prisma 7 (client TypeScript-only; exige driver adapter `@prisma/adapter-pg`, não conecta sozinho lendo `DATABASE_URL`) |
| Validação | Zod em toda rota, antes da camada de service |
| Hash de senha | bcrypt (nunca retornado em nenhuma rota) |
| Autenticação | JWT (`@fastify/jwt`) — apenas access token nesta fase, sem refresh token |
| Arquitetura | Repository Pattern por módulo: `routes → service → repository → Prisma`, via de mão única (detalhado no `CLAUDE.md`) |
| Testes | Vitest + `app.inject()` nativo do Fastify (não precisa de Supertest) |
| IDs | UUID (`@default(uuid())`) em todas as entidades — não incremental, para não vazar contagem de usuários/capturas em URLs públicas |
| XP | sempre inteiro (nunca float); `xpAwarded` é um snapshot gravado na captura, nunca recalculado a partir do catálogo depois |
| Código-fonte | `D:\PROGAMACAO\PROJETO-INTEGRADOR 2026-2` — ainda **não é um repositório git** (ver 0.1) |

Documentação de referência já existente neste diretório: `CLAUDE.md` (contexto de produto, schema completo, explicação de cada decisão de modelagem, decisões em aberto).

---

## Fase 0 — Bootstrap do ambiente

Status: parcialmente feito nesta sessão (banco e dependências no ar); falta fechar TypeScript e versionamento antes de escrever código de aplicação.

- [x] 0.1 — `git init` + primeiro commit (`.gitignore` já existe — cobre `node_modules`, `.env`, `/generated/prisma`)
- [x] 0.2 — `package.json` criado, dependências base instaladas: `fastify`, `@fastify/jwt`, `bcrypt`, `zod`, `@prisma/client@7`, `@prisma/adapter-pg`, `dotenv`; dev: `prisma@7`, `tsx`
- [x] 0.3 — `prisma/schema.prisma` com as 7 entidades modeladas (`User`, `Species`, `Catch`, `Friendship`, `Reaction`, `Achievement`, `UserAchievement`)
- [x] 0.4 — `docker-compose.yml` com Postgres local (porta 5433) e container no ar
- [x] 0.5 — `prisma.config.ts`, `.env` / `.env.example`, `.gitignore`
- [x] 0.6 — Migration `init` aplicada (`npx prisma migrate dev`) e Prisma Client gerado (`npx prisma generate`)
- [x] 0.7 — `tsconfig.json` + `npm install -D @types/node @types/bcrypt vitest`
- [x] 0.8 — Scripts no `package.json`: `"dev": "tsx watch src/server.ts"`, `"test": "vitest run"`, `"build": "tsc"`
- [ ] 0.9 — Validar com um `src/server.ts` mínimo ("hello world" / rota `/health`) que `npm run dev` sobe sem erro — **não verificado agora** (Docker Desktop não está rodando nesta máquina no momento da checagem, sem Postgres não dá pra validar a subida real); `tsc --noEmit` passou limpo

Estrutura de pastas (detalhada com responsabilidade de cada arquivo no `CLAUDE.md`):

```text
src/
  config/        # env.ts — validação de process.env com zod
  plugins/       # prisma.ts, jwt.ts
  hooks/         # authenticate.ts
  modules/       # auth, users, species, catches, friendships, feed, reactions, achievements
  shared/        # errors.ts, pagination.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  unit/
  integration/
CLAUDE.md
SERVIDOR.md
README.md
.env.example
```

---

## Fase 1 — Design

### 1.1 Modelo de dados (Prisma schema)

Já modelado e migrado (ver `CLAUDE.md` para a justificativa de cada decisão). Resumo das 7 entidades:

| Entidade | Papel |
| --- | --- |
| `User` | conta, `xp`/`level` (progressão) |
| `Species` | catálogo fixo, `difficulty` + `baseXp` |
| `Catch` | uma captura — `xpAwarded` é snapshot, não calculado em tempo real |
| `Friendship` | par ordenado (`userAId`/`userBId`) + `status` |
| `Reaction` | um emoji fixo por `(catchId, userId)` |
| `Achievement` / `UserAchievement` | catálogo fixo + desbloqueios por usuário |

Regra de unicidade equivalente a idempotência: `@@unique([userAId, userBId])` em `Friendship` e `@@unique([catchId, userId])` em `Reaction` garantem, em nível de banco, que não existe amizade duplicada nem reação duplicada — segunda linha de defesa contra requisições concorrentes, não só checagem em memória no service.

- [x] 1.1.1 — Desenhar `prisma/schema.prisma` com as 7 tabelas
- [x] 1.1.2 — Rodar `prisma migrate dev` e confirmar migração aplicada
- [ ] 1.1.3 — Escrever `prisma/seed.ts`: catálogo de `Species`, catálogo de `Achievement`, 2 usuários de teste já amigos com algumas capturas (para não precisar montar o cenário manualmente a cada teste/demo)

### 1.2 Definição da progressão de XP

| Dificuldade | XP concedido (provisório) |
| --- | --- |
| EASY | 10 |
| MEDIUM | 25 |
| HARD | 50 |
| EPIC | 100 |
| LEGENDARY | 250 |

Valores ilustrativos — ajustar por espécie real depois; o que importa é que `baseXp` seja numérico por espécie, não derivado do enum em runtime (ver justificativa no `CLAUDE.md`).

Fórmula XP → nível: **decisão em aberto** (item 1 do `CLAUDE.md`) — bloqueia 2.2. Provisório sugerido para não travar o desenvolvimento: linear, `level = floor(xp / 100) + 1`. Isolar numa função pura (`calculateLevel`) para trocar sem tocar no resto do service.

- [ ] 1.2.1 — Confirmar (ou manter o provisório) a fórmula de progressão antes de implementar 2.2

### 1.3 Regras de resposta HTTP (decisão de design importante)

| Status | Quando usar |
| --- | --- |
| 401 Unauthorized | token ausente/inválido em rota protegida |
| 403 Forbidden | usuário tenta aceitar/bloquear um pedido de amizade que ele mesmo enviou — só o outro lado do par pode responder |
| 404 Not Found | espécie, captura, usuário ou amizade referenciada não existe |
| 409 Conflict | `username`/`email` já cadastrados no registro; pedido de amizade já existe para o mesmo par (em qualquer direção) |
| 400/422 | payload inválido (falha de validação Zod) |

Documentar essa tabela no `README.md` — é o tipo de regra que se perde fácil se não estiver escrita, e volta a causar dúvida em cada módulo novo (ex.: "isso é 403 ou 404?").

- [ ] 1.3.1 — Escrever a tabela acima no `README.md`, com um exemplo de corpo de resposta de erro por status

### 1.4 Contrato da API

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| POST | `/auth/register` | não | cria conta |
| POST | `/auth/login` | não | autentica, retorna JWT |
| GET | `/users/me` | sim | dados do usuário logado |
| GET | `/users/:id` | sim | perfil de outro usuário (nível, conquistas, capturas por espécie) |
| GET | `/species` | não | catálogo de espécies |
| GET | `/species/:id` | não | detalhe de uma espécie |
| POST | `/catches` | sim | registra uma captura, concede XP |
| GET | `/catches/me` | sim | capturas do usuário logado, paginado |
| GET | `/catches/:id` | sim | detalhe de uma captura |
| POST | `/friendships` | sim | envia pedido de amizade |
| PATCH | `/friendships/:id/accept` | sim | aceita pedido (só quem recebeu) |
| PATCH | `/friendships/:id/block` | sim | bloqueia |
| GET | `/friendships` | sim | lista amigos aceitos + pedidos pendentes |
| GET | `/feed` | sim | capturas dos amigos, paginado (cursor) |
| PUT | `/catches/:catchId/reaction` | sim | reage/troca reação numa captura |
| DELETE | `/catches/:catchId/reaction` | sim | remove a própria reação |
| GET | `/achievements` | não | catálogo de conquistas |
| GET | `/users/:id/achievements` | sim | conquistas desbloqueadas por um usuário |
| POST | `/uploads` | sim | upload de foto de captura — bloqueado pela decisão de storage (Fase 4.2) |
| GET | `/health` | não | healthcheck |

- [ ] 1.4.1 — Escrever o contrato completo em `README.md` (request/response de cada rota, incluindo exemplos dos erros 401/403/404/409)
- [ ] 1.4.2 — Definir os schemas Zod de cada payload (um por módulo, em `*.schema.ts`)

---

## Fase 2 — Autenticação e motor de XP

### 2.1 Autenticação (`modules/auth`)

- [x] 2.1.1 — `auth.schema.ts`: `registerBodySchema`, `loginBodySchema`
- [x] 2.1.2 — `auth.repository.ts`: `findByEmail`, `findByUsername`, `create`
- [x] 2.1.3 — `auth.service.ts`: `register()` (bcrypt.hash), `login()` (bcrypt.compare) — **nota**: o `fastify.jwt.sign` acabou implementado em `auth.controller.ts`, não no service
- [x] 2.1.4 — `auth.routes.ts`: `POST /auth/register`, `POST /auth/login`
- [x] 2.1.5 — preHandler reutilizável de autenticação — implementado em `src/middlewares/jwtMiddleware.ts` (não em `hooks/authenticate.ts` como o `CLAUDE.md` sugere, mas mesma função)
- [ ] 2.1.6 — Teste: registrar → login → chamar rota protegida com o token → chamar sem token (401) → registrar com email repetido (409)

### 2.2 Motor de XP e nível

- [x] 2.2.1 — Função pura `calculateLevel(xp: number): number` em `src/modules/catches/level.ts`, com a fórmula fechada em 1.2
- [ ] 2.2.2 — `catches.service.ts`: dentro de uma `prisma.$transaction`, cria a `Catch` com `xpAwarded = species.baseXp`, soma ao `user.xp`, recalcula `user.level` via `calculateLevel` — **implementado só parcialmente**: `xpAwarded`, soma de `xp` e recálculo de `level` via `calculateLevel` já funcionam, mas `create` da `Catch` e `update` do `User` são duas chamadas Prisma separadas, sem `$transaction` — falta a atomicidade
- [ ] 2.2.3 — Teste unitário de `calculateLevel` cobrindo: XP zero, XP exato num limiar, XP suficiente para subir mais de um nível de uma vez
- [ ] 2.2.4 — Teste de integração: `POST /catches` reflete corretamente em `GET /users/me` (xp e level atualizados)

### 2.3 Unicidade e concorrência

- [x] 2.3.1 — `friendships.repository.ts`: helper `sortPair(idA, idB)` — ordena deterministicamente antes de qualquer `create`/`findUnique`
- [x] 2.3.2 — Confiar na constraint `@@unique` do banco como segunda linha de defesa (não só checagem em memória) — capturar o erro Prisma `P2002` no service e traduzir para 409
- [ ] 2.3.3 — Teste: duas requisições "quase simultâneas" de pedido de amizade para o mesmo par → só uma linha no banco, segunda retorna 409

---

## Fase 3 — Módulos sociais

### 3.1 Usuários e catálogo (`modules/users`, `modules/species`)

- [x] 3.1.1 — `users.repository.ts`: `findById`, `countCatchesBySpecies(userId)` (Pokédex pessoal via `GROUP BY`, sem tabela denormalizada)
- [ ] 3.1.2 — `users.service.ts`: `toPublicUser()` (remove `passwordHash`), `getProfile(userId)` juntando nível + conquistas + capturas por espécie — `getProfile` existe e já não vaza `passwordHash` (monta o objeto de resposta campo a campo), mas não há um `toPublicUser()` reutilizável nem junção com conquistas (módulo de conquistas ainda não existe)
- [x] 3.1.3 — `users.routes.ts`: `GET /users/me`, `GET /users/:id`
- [x] 3.1.4 — `species.repository/service/routes`: `GET /species`, `GET /species/:id` (rotas públicas)
- [ ] 3.1.5 — Rodar `prisma db seed`, testar catálogo e perfil populados

### 3.2 Amizades (`modules/friendships`)

- [x] 3.2.1 — `friendships.service.ts`: `sendRequest` (usa `sortPair`, `requestedById = quem chama`), `accept`/`block` (valida que quem chama **não** é `requestedById` — senão 403)
- [ ] 3.2.2 — `friendships.routes.ts`: `POST /friendships`, `PATCH /friendships/:id/accept`, `PATCH /friendships/:id/block`, `GET /friendships` — **rotas existem mas faltam o `preHandler: authenticate`**; o controller lê `request.user.sub` assumindo que o JWT já foi verificado, então hoje essas 4 rotas quebram (erro ao ler `.sub` de `undefined`) em vez de retornar 401
- [ ] 3.2.3 — Teste: A pede a B → B tenta aceitar o próprio pedido (403) → A tenta aceitar (403, A não é o destinatário) → B aceita (200) → `GET /friendships` reflete em ambos

### 3.3 Feed

- [ ] 3.3.1 — `feed.service.ts`: busca amigos com `status: ACCEPTED`, depois `Catch.findMany` filtrando por esses `userId`, ordenado por `capturedAt desc`, paginação por cursor composto (`capturedAt`, `id`) — **implementado, mas com paginação offset/limit (`page`/`limit`) em vez do cursor composto** decidido no item 3 do `CLAUDE.md`; resto da lógica (filtro por amigos aceitos, ordenação) está correto
- [ ] 3.3.2 — `feed.routes.ts`: `GET /feed` (query params `cursor`, `limit`) — rota existe e autenticada, porém com `page`/`limit` em vez de `cursor` (mesma ressalva do item acima)
- [ ] 3.3.3 — Teste: capturas de não-amigos nunca aparecem; paginação não duplica nem pula itens entre páginas

### 3.4 Reações (`modules/reactions`)

- [ ] 3.4.1 — `reactions.schema.ts`: emoji validado contra o enum `ReactionEmoji` (lista final ainda em aberto — item 4 do `CLAUDE.md`)
- [ ] 3.4.2 — `reactions.service.ts`: `react()` faz `upsert` por `(catchId, userId)` — troca o emoji em vez de duplicar
- [ ] 3.4.3 — `reactions.routes.ts`: `PUT /catches/:catchId/reaction`, `DELETE /catches/:catchId/reaction`
- [ ] 3.4.4 — Teste: reagir, reagir de novo com outro emoji (deve trocar, não duplicar), remover

---

## Fase 4 — Conquistas, fotos, testes e documentação

### 4.1 Conquistas (`modules/achievements`)

- [ ] 4.1.1 — Catálogo de `Achievement` no seed (code, name, description, critério documentado em comentário — o critério em si vive em código, não no banco)
- [ ] 4.1.2 — `checkAchievements(userId)` chamado a partir de `catches.service.ts` logo após criar a captura (ex.: primeira captura, 10 espécies diferentes, primeira LEGENDARY)
- [ ] 4.1.3 — `achievements.routes.ts`: `GET /achievements`, `GET /users/:id/achievements`

### 4.2 Fotos de captura

Bloqueado pela decisão de storage (item 2 do `CLAUDE.md`: disco local vs. bucket externo).

- [ ] 4.2.1 — Decidir a estratégia de storage
- [ ] 4.2.2 — `POST /uploads` (disco: `@fastify/multipart` + `@fastify/static`; bucket: presigned URL)
- [ ] 4.2.3 — Integrar com `POST /catches` — client faz upload antes, manda só o `photoUrl` final

### 4.3 Testes (pontos críticos a cobrir)

- [ ] Registro duplicado → 409
- [ ] Login com senha errada → 401
- [ ] Pedido de amizade duplicado (mesmo par, qualquer direção) → 409
- [ ] Aceitar o próprio pedido de amizade → 403
- [ ] Reação trocada não duplica linha no banco
- [ ] `xpAwarded` bate exatamente com `species.baseXp` no momento da captura
- [ ] `level` sobe corretamente mesmo pulando vários níveis numa captura só
- [ ] Feed nunca mostra captura de não-amigo
- [ ] Nenhuma resposta de nenhuma rota inclui `passwordHash`
- [ ] Rodar cobertura e garantir que `calculateLevel` e `sortPair` estão 100% cobertos (são as duas funções com mais lógica não-trivial)

### 4.4 Documentação

- [ ] 4.4.1 — `README.md`: como rodar localmente, contrato de API completo, tabela de status HTTP (1.3), decisões de design
- [ ] 4.4.2 — Atualizar `CLAUDE.md` conforme decisões forem fechadas (fórmula de XP, storage de fotos, lista de emojis)
- [ ] 4.4.3 — `.env.example` revisado com todas as chaves realmente usadas

---

## Fase 5 — Testes finais e roteiro de apresentação

- [ ] 5.1 — Rodar `npm test` do zero, num clone limpo do repositório, e confirmar que passa sem nenhum passo manual extra
- [ ] 5.2 — Roteiro curto para mostrar o projeto funcionando:
  1. Registrar 2 usuários, logar
  2. Ficarem amigos (mostrar o 403 tentando aceitar o próprio pedido, depois o aceite correto)
  3. Um dos dois captura um peixe → `GET /users/me` mostra XP/nível atualizado
  4. `GET /feed` do outro usuário mostra a captura do amigo
  5. Reagir na captura, trocar a reação, mostrar que não duplicou
- [ ] 5.3 — Preparar o seed (1.1.3) para deixar esse cenário pronto sem precisar montar tudo manualmente ao vivo

---

## Checklist de entrega final

- [ ] `README.md` completo
- [ ] `CLAUDE.md` atualizado com as decisões finais (nenhum item de "Decisões em aberto" sem resposta)
- [ ] `.env.example` sem nenhum valor real
- [ ] Repositório git inicializado, nenhum secret commitado (checar `git log`/histórico, não só o estado atual)
- [ ] Todo XP armazenado como inteiro
- [ ] `npm test` roda e passa do zero (clone limpo)
- [ ] `npm run dev` documentado e funcionando

---

## Cronograma sugerido (~35-50h)

| Fase | Horas | Observação |
| --- | --- | --- |
| 0. Bootstrap | 1-2h | falta só 0.1, 0.7, 0.8, 0.9 |
| 1. Design | 3-5h | schema já pronto, falta contrato de API e seed |
| 2. Auth + motor de XP | 8-12h | inclui a função de nível e os testes dela |
| 3. Módulos sociais | 10-14h | friendships, feed, reactions |
| 4. Conquistas + fotos + testes + docs | 8-12h | fotos depende de decisão de storage |
| 5. Testes finais + roteiro | 2-3h | — |

---

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Esquecer o driver adapter do Prisma 7 (`PrismaClient` só falha em runtime, não em build) | Testar a subida do servidor logo na Fase 0 (item 0.9), antes de escrever qualquer módulo |
| Conflito de porta 5432 com o Postgres nativo do Windows | Já mitigado — container remapeado para 5433 |
| Race condition em pedido de amizade duplicado | Confiar na constraint `@@unique` do banco, não só na checagem em memória (2.3.2) |
| `passwordHash` vazando em alguma resposta | Mapper `toPublicUser()` único, usado em toda rota que serializa `User` — revisar antes da entrega (4.3) |
| Fórmula de XP mudar depois e recalcular histórico incorretamente | `xpAwarded` é snapshot gravado na captura, nunca derivado de `species.baseXp` em tempo real |
| Misturar `.js` de aplicação com `.ts` gerado pelo Prisma | Decisão fechada: projeto inteiro em TypeScript (item 0 da tabela de decisões) |
| Secret vazado no commit inicial | `.gitignore` já cobre `.env` — confirmar antes do primeiro `git add` (0.1) |

---

## Próximos passos imediatos

1. Fechar 0.1 (`git init` + primeiro commit) e 0.7/0.8/0.9 (TypeScript + scripts + smoke test do servidor)
2. Escrever `prisma/seed.ts` (1.1.3)
3. Confirmar (ou manter provisória) a fórmula de XP→nível (1.2.1) e começar a Fase 2
