# Pendências — o que falta para o FishDex ficar completo, seguro e funcional

Levantamento re-auditado contra o código real de `master` (pós-merge do PR #9,
"feat: integração com o app mobile") em 2026-09-09. Substitui os antigos
`SEGURANCA.md` e `SERVIDOR.md`, que foram escritos em momentos diferentes da
branch e ficaram com referências de arquivo/linha desatualizadas.

O backend **funciona** e está integrado ponta a ponta com o app mobile (ver
`INTEGRACAO.md`), com 37 testes Vitest passando. Este documento não trata de
"o que está quebrado" — trata de **o que falta** para além do caminho feliz:
segurança, integridade de dados, e o que um deploy de verdade exige. Nada aqui
bloqueia a apresentação acadêmica do projeto.

## Como ler

| Severidade | Significado |
| --- | --- |
| 🔴 Crítico | Explorável hoje. Corrigir antes de qualquer deploy público. |
| 🟠 Alto | Falha de segurança/privacidade real, mitigada só por obscuridade (UUID, app fechado). |
| 🟡 Médio | Robustez, integridade de dados, hardening. |
| 🔵 Baixo | Melhoria / completude de produto. |

Referências `arquivo:linha` conferidas em `master` em 2026-09-09 — revalidar se o
arquivo mudar de tamanho depois desta data.

---

## 1. Autenticação e sessão

### 🔴 1.1 — `JWT_SECRET` sem validação e com placeholder fraco

- `.env.example:2` traz `JWT_SECRET="change-me-in-production"`. Se subir em
  produção sem trocar, **qualquer pessoa forja um token válido** para qualquer
  usuário.
- `app.ts:33` faz `process.env.JWT_SECRET as string` — se a variável estiver
  ausente ou vazia, o cast mascara o problema.
- Não existe `src/config/env.ts` validando `process.env` com zod. Cada
  `process.env.X` (`app.ts:33`, `server.ts:3`) é lido solto, sem garantia de
  presença/formato no boot.

**Fazer:** criar `src/config/env.ts` com zod (`JWT_SECRET` obrigatório, mínimo
32 caracteres; `DATABASE_URL` url; `PORT` numérico) e falhar no boot se
inválido. Gerar o secret de produção com `openssl rand -base64 48`.

### 🔴 1.2 — Token JWT nunca expira

- `auth.controller.ts:21`: `request.server.jwt.sign({ sub: user.id })` — sem
  `expiresIn`.
- `app.ts:33`: plugin registrado sem `sign: { expiresIn }`.
- Consequência: **um token vazado vale para sempre.** Não há expiração, não há
  logout, não há revogação.

**Fazer:** definir `expiresIn` (ex.: `'15m'` ou `'1h'`) e implementar
**refresh token** (`POST /auth/refresh`, persistido/rotacionado no banco,
revogável). Adicionar `POST /auth/logout`.

### 🟠 1.3 — Sem rate limiting

- `@fastify/rate-limit` não está instalado (confirmado em `package.json`).
- `POST /auth/login` e `POST /auth/register` (`auth.routes.ts`) ficam abertos a
  **brute force de senha** e **enumeração de contas** em massa.

**Fazer:** `@fastify/rate-limit` global (ex.: 100 req/min por IP) + limite
agressivo em `/auth/*` (ex.: 5 tentativas / 15 min por IP+email).

### 🟠 1.4 — Login permite enumerar e-mails por timing

- `auth.service.ts:30-40`: se o e-mail não existe, retorna na linha 33 **antes**
  de rodar `bcrypt.compare`. Com e-mail existente, roda o compare (linha 36,
  dezenas de ms). A diferença de tempo de resposta revela se um e-mail está
  cadastrado.

**Fazer:** rodar um `bcrypt.compare` contra um hash dummy fixo quando o usuário
não existe, para igualar o tempo de resposta.

### 🟡 1.5 — Política de senha fraca

- `auth.schema.ts:6,11`: `password: z.string().min(6)`. Aceita `123456` — que é
  literalmente a senha usada em `tests/helpers.ts:7`.
- `bcrypt.hash(data.password, 10)` com custo `10` hardcoded
  (`auth.service.ts:15`).

**Fazer:** mínimo de 8–10 caracteres, bloquear as senhas mais comuns; subir o
custo do bcrypt para `12` e ler de config.

### 🔵 1.6 — Falta "esqueci a senha" / trocar senha

Não há fluxo de recuperação nem `PATCH /users/me/password`. `AuthRepository`
não tem `updatePassword`. Necessário para produto real.

---

## 2. Autorização e exposição de dados

### 🔴 2.1 — `GET /users/:id` vaza o e-mail de qualquer usuário

- `users.service.ts:30` (`getProfile`) devolve `email` no objeto.
- É usado tanto por `GET /users/me` quanto por `GET /users/:id`
  (`users.controller.ts:8-14` e `19-22`, ambas chamam `getProfile`), então
  **qualquer usuário autenticado lê o e-mail de qualquer outro** — basta ter o
  id (que circula no feed, nas amizades, na galeria de capturas).

**Fazer:** `email` só em `/users/me`. Perfil de terceiros devolve um
subconjunto público (`id`, `username`, `handle`, `level`, `avatarUrl`,
`memberSince`, `catchesBySpecies`).

### 🟠 2.2 — Repository de usuário devolve o `passwordHash`

- `users.repository.ts:5-7`: `findById` faz `findUnique` sem `select` →
  retorna o registro **inteiro, incluindo `passwordHash`**.
- Hoje `getProfile` (`users.service.ts:23-41`) remonta campo a campo e não
  vaza o hash — mas é uma bomba-relógio: o primeiro handler novo que fizer
  `reply.send(user)` direto expõe o hash. Não existe `toPublicUser()`
  reutilizável em lugar nenhum do código.

**Fazer:** `select` explícito no repository (nunca trazer `passwordHash`) **ou**
um mapper `toPublicUser()` único. Adicionar teste "nenhuma resposta de nenhuma
rota contém `passwordHash`".

### 🟠 2.3 — Leitura e reação a capturas não respeitam amizade

- `GET /catches/:id` (`catches.controller.ts:21-28`) e
  `GET /users/:id/catches` (`catches.controller.ts:43-53`) só exigem token —
  **não checam se o viewer é amigo do dono da captura**. O `catches.service.ts`
  (`findById`, `findManyByUser`) não recebe nem aplica essa regra.
- `PUT`/`DELETE /catches/:catchId/reaction` (`reactions.service.ts:13-25`):
  qualquer usuário autenticado reage a **qualquer** captura, de amigo ou não —
  só checa se a captura existe, não quem pode vê-la.
- `GET /feed` filtra por amigos aceitos (`feed.service.ts`), mas o acesso
  direto por id não. A única proteção real hoje é o id ser um UUID
  não-enumerável.

**Fazer:** decidir a regra de visibilidade (só amigos? público?) e aplicá-la no
`service` de `catches` e `reactions` — não só no feed.

### 🟠 2.4 — Coordenadas GPS exatas expostas a qualquer viewer

- `src/shared/feed-catch.ts:112-113`: `locationLat`/`locationLng` vão
  **crus** para todo mundo que vê a captura (feed, detalhe, galeria de
  perfil) — a função nem olha o parâmetro `mine`/`viewerId` para decidir se
  mostra a coordenada exata.
- Expõe onde a pessoa pesca e, por tabela, onde mora / sua rotina.

**Fazer:** decidir entre (a) captura com flag `isPrivate`, (b) arredondar as
coordenadas para ~1 km antes de expor a terceiros, (c) só mostrar
`locationName` (texto) para não-donos e as coordenadas exatas só para
`mine === true`.

### 🟠 2.5 — `BLOCKED` não bloqueia quase nada

- `friendships.service.ts:55-72` (`block`): só troca o `status` para
  `BLOCKED` via `updateStatus`.
- Nenhum outro módulo (`catches`, `reactions`, `users`) consulta o status da
  amizade — um usuário bloqueado **ainda vê o perfil, a galeria de capturas e
  reage às capturas** do outro normalmente (mesma causa raiz do item 2.3: não
  existe checagem de amizade em lugar nenhum fora do feed).

**Fazer:** definir e implementar o contrato do bloqueio — no mínimo: bloqueado
não vê perfil/capturas, não reage, não consegue reenviar pedido (hoje
`sendRequest` também não olha para `BLOCKED` — `friendships.service.ts:17-24`
só checa se **existe** um par, não o `status` dele).

### 🟡 2.6 — Sem deleção de conta / exportação de dados (LGPD)

- `AuthRepository.deleteUser` existe (`auth.repository.ts:36-40`) mas
  **nenhuma rota o expõe**. Não há `DELETE /users/me` nem export dos dados do
  usuário.
- O schema já tem `onDelete: Cascade` no `User` (`schema.prisma:100,135-137,199`),
  então a deleção em si é simples; falta a rota (com reautenticação por senha)
  e o endpoint de export.

---

## 3. Upload de fotos

### 🟠 3.1 — Whitelist de extensão tem furo para mimetypes não mapeados

- `uploads.routes.ts:9-15` já tem uma whitelist (`ALLOWED_EXT`) que força a
  extensão certa para `jpeg/png/webp/heic/heif` — **melhoria real em relação a
  antes**.
- Mas o filtro de entrada (linha 28) só exige que o mimetype comece com
  `image/`, e o fallback (linha 32) usa `extname(file.filename)` — **o nome do
  arquivo enviado pelo cliente** — para qualquer mimetype fora do mapa. Um
  arquivo enviado com `Content-Type: image/svg+xml` e nome `foto.svg` passa no
  filtro (`startsWith('image/')` ✅), não está em `ALLOWED_EXT`, então cai no
  fallback e **é salvo como `.svg`**.
- `image/svg+xml` (e `image/gif`, `image/bmp`, etc.) continuam sem passar por
  verificação de conteúdo real (magic bytes) — o mimetype é **declarado pelo
  cliente**.

**Fazer:** trocar o fallback por rejeição (`reply.badRequest`) para qualquer
mimetype fora do `ALLOWED_EXT`, e validar os magic bytes reais do arquivo
(ex.: pacote `file-type`) antes de gravar.

### 🔴 3.2 — SVG servido no domínio da API → XSS armazenado

- Consequência direta do 3.1: um `.svg` salvo por `uploads.routes.ts:36` é
  servido de volta por `@fastify/static` (`app.ts:39-43`) **no mesmo domínio
  da API**, sem `Content-Disposition` nem CSP. Um SVG com `<script>` executa no
  contexto desse domínio para quem abrir a URL.

**Fazer:** junto com 3.1 (bloquear SVG na entrada), servir uploads com
`Content-Disposition: attachment` e adicionar CSP nos estáticos (ver 4.1).

### 🟠 3.3 — `photoUrl` da captura é string livre

- `catches.schema.ts:5`: `photoUrl: z.string()`. `POST /catches` **não
  valida** que a URL corresponde a um upload real feito pelo próprio usuário —
  aceita qualquer string, inclusive URL externa.
- O app renderiza esse valor no feed dos amigos sem checagem (conteúdo
  malicioso / rastreamento / imagem ofensiva hospedada fora).

**Fazer:** aceitar só caminhos `^/uploads/[uuid]\.(jpg|png|webp|heic|heif)$` e,
idealmente, conferir no banco/disco que aquele arquivo existe e foi enviado
pelo usuário autenticado.

### 🟡 3.4 — Fotos de captura são públicas

- `GET /uploads/:arquivo` (`app.ts:39-43`, registro do `@fastify/static`)
  **não tem `preHandler` de autenticação**. Quem tiver a URL vê a foto sem
  token, para sempre.
- Se a decisão de privacidade (2.4/2.3) for "capturas só para amigos", as
  fotos precisam do mesmo controle.

### 🟡 3.5 — Uploads órfãos nunca são limpos (e até truncados ficam)

- Foto enviada via `POST /uploads` e nunca vinculada a uma captura fica em
  `uploads/` (`uploads.constants.ts:6`) indefinidamente.
- Bug novo encontrado: `uploads.routes.ts:36-40` grava o arquivo em disco
  (`pipeline`) **antes** de checar `file.file.truncated` — se o upload passar
  do limite de 8 MB, a resposta é `400`, mas o arquivo truncado **já foi
  escrito** e fica órfão do mesmo jeito.

**Fazer:** checar `truncated` antes/durante o `pipeline` (ou apagar o arquivo
se truncado) e, separadamente, um job de limpeza para uploads nunca
referenciados por uma `Catch`.

---

## 4. Cabeçalhos, CORS e tratamento de erro

### 🟠 4.1 — Sem headers de segurança (`helmet`)

`@fastify/helmet` não está instalado (confirmado em `package.json`). Faltam
`X-Content-Type-Options: nosniff`, `X-Frame-Options`,
`Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy` —
relevante em especial para os arquivos estáticos servidos em `/uploads`
(ver 3.2).

### 🟡 4.2 — CORS reflete qualquer origem

- `app.ts:28-32`: `origin: true` — devolve `Access-Control-Allow-Origin` igual
  a qualquer origem que chamar, e libera explicitamente `PUT`/`PATCH`/`DELETE`
  e o header `Authorization` (necessário para o Expo web, conforme o
  comentário no código).
- Como a autenticação é por header `Authorization` (não cookie), o risco
  prático é baixo, mas o certo para produção é uma **allowlist** vinda de env
  (`CORS_ORIGINS`).

### 🟡 4.3 — `errorHandler` devolve a mensagem de erro crua

- `errorHandler.ts:41-42`: para qualquer erro não previsto (não é
  `DomainError`, `ZodError`, nem `P2025`/`P2002`), faz `request.log.error(error)`
  **e** `return reply.send(error)` — `error.message` (e potencialmente stack,
  dependendo do serializer do Fastify) vai para o cliente. Pode vazar detalhe
  de query, de conexão, de caminho de arquivo.
- Só trata dois códigos Prisma (`P2025`, `P2002`); não trata `P2003` (violação
  de FK — relevante em `Catch.speciesId`/`onDelete: Restrict`), `P2000` (valor
  muito longo), etc.

**Fazer:** logar o erro completo internamente e responder um `500` genérico
(`{ message: "Erro interno" }`) sem detalhes quando `NODE_ENV === 'production'`.
Mapear os códigos Prisma restantes.

### 🟡 4.4 — `FriendshipController` tem tratamento de erro próprio e divergente

- `friendships.controller.ts:9-14` (`handleError`): transforma **qualquer**
  erro não-`DomainError` em `400` com a mensagem crua (`(error as Error).message`),
  em vez de deixar o `errorHandler` global (`app.setErrorHandler`, `app.ts:44`)
  cuidar. Fica inconsistente com o resto da API e mascara `500` como `400`.
- Efeito colateral: mesmo os erros que o `errorHandler` global trataria bem
  (ex.: `P2025`) são interceptados antes e viram `400` genérico aqui.
- Nota de qualidade (não é vulnerabilidade): as 4 rotas desse controller fazem
  `(request.user as any).sub` — cast solto para `any`, diferente do padrão
  `(request.user as { sub: string }).sub` usado nos outros controllers
  (`users.controller.ts:17`, `catches.controller.ts:14`).

**Fazer:** remover o `try/catch` do controller e deixar o `setErrorHandler`
global tratar, como os outros módulos já fazem.

---

## 5. Integridade de dados e concorrência

### 🟡 5.1 — Criação de captura não é transacional

- `catches.service.ts:37-57` (`create`): `create` da `Catch` (linha 37),
  `findById`/`updateXpAndLevel` do `User` (linhas 42-51) e
  `checkAchievements` (linha 53) são **quatro chamadas Prisma separadas**, sem
  `prisma.$transaction`. Se o processo cair no meio, o `xp` do usuário não
  bate com a soma das capturas.

**Fazer:** envolver tudo em `prisma.$transaction`.

### 🟡 5.2 — Atualização de XP sofre *lost update*

- `catches.service.ts:42,48`: lê `user.xp` em memória (linha 42), soma (linha
  48), e `users.repository.ts:22-29` (`updateXpAndLevel`) grava
  `xp: newXp`/`level: newLevel` **absolutos**.
- Duas capturas concorrentes do mesmo usuário leem o mesmo `xp` inicial → uma
  sobrescreve a outra e o XP some.

**Fazer:** `xp: { increment: xpAwarded }` no update e recalcular o `level` a
partir do valor retornado, dentro da transação de 5.1.

### 🟡 5.3 — `checkAchievements` é frágil

- `achievements.service.ts:50,56,63`: usa igualdade exata (`totalCatches === 1`,
  `distinctSpecies === 10`, `legendaryCatches === 1`). Se a captura que deveria
  disparar falhar (ex.: erro de rede, ou o próprio problema do 5.1), a
  contagem passa do número e a conquista **nunca mais** é concedida.
- `achievements.service.ts:68-74`: chama `unlock` em loop sem `try/catch` — uma
  corrida gerando `P2002` (unicidade `[userId, achievementId]`) propaga como
  erro 500 em vez de virar no-op.

**Fazer:** usar `>=` + checar se já está desbloqueada antes de inserir (ou
`upsert`); tratar `P2002` como no-op.

### 🔵 5.4 — `respondedAt` nunca é preenchido

- `friendships.repository.ts:59-64` (`updateStatus`) só grava `status`. O
  `respondedAt` do schema fica sempre `null`, e o
  `orderBy: { respondedAt: 'desc' }` em `findManyByUser` (linha 69) não ordena
  nada de fato — todas as linhas empatam em `null`.

**Fazer:** setar `respondedAt: new Date()` no accept/block.

---

## 6. Validação de entrada

### 🟡 6.1 — Campos numéricos sem faixa

- `catches.schema.ts:9-10`: `locationLat`/`locationLng` só `z.number()` —
  aceita `999`/`-500`. `weightGrams`/`lengthCm` (linhas 7-8) são `.positive()`
  mas sem teto. `capturedAt` (linha 6, `z.coerce.date()`) aceita **data no
  futuro**.

**Fazer:** `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`, pesos/comprimentos com
máximo razoável, `capturedAt <= agora`.

### 🟡 6.2 — `GET /catches/me` sem `limit` retorna tudo

- `catches.schema.ts:21-24`: `limit` é opcional (com teto de 50 **se
  informado**); sem ele, `findManyByUser` não aplica `take`
  (`catches.repository.ts:52,58-64`, comentário no schema confirma: "sem query
  devolve tudo") e devolve **todas** as capturas do usuário. Sem teto, cresce
  indefinidamente.

**Fazer:** `limit` default (ex.: 20) e máximo obrigatórios — sempre paginar,
mesmo sem query params.

### 🔵 6.3 — `username` sem formato definido

- `auth.schema.ts:4`: `z.string().min(3)`. Aceita espaços, emojis, caracteres
  de controle. O `handle` derivado (`users.service.ts:36`) remove espaços,
  então `"a b"` e `"ab"` colidem no mesmo `@ab` (sem unicidade garantida).

**Fazer:** regex (`^[a-zA-Z0-9_.]{3,20}$`) e/ou derivar e persistir o `handle`
como coluna única.

---

## 7. Deploy e operação

### 🔴 7.1 — Build de produção não funciona

- `package.json`: `"build": "tsc"` / `"start": "node dist/server.js"`.
- O Prisma Client gerado é **TypeScript** em `generated/`, e o
  `tsconfig.json` (`exclude: ["node_modules", "dist", "generated"]`) **exclui
  `generated`** do build. `dist/server.js` importaria
  `../generated/prisma/client` (um `.ts` não compilado) → quebra.
- Na prática, o projeto **só roda via `tsx`** (`npm run dev`). Não há pipeline
  de produção testado.

**Fazer:** decidir a estratégia — rodar em produção com `tsx`/`node --import
tsx`, ou ajustar o build para compilar/copiar o client gerado. Testar `start`
num container limpo.

### 🟠 7.2 — Storage em disco local não sobrevive a deploy

Fotos em `uploads/` (`uploads.constants.ts:6`) somem a cada redeploy/reinício
de container (Render, Railway, Fly.io, etc. têm filesystem efêmero por
padrão). Bloqueia deploy real até migrar para bucket externo (S3/R2/Supabase
Storage).

### 🟡 7.3 — Sem `/health` real (nem `/health` nenhum)

- `app.ts` só registra `GET /` (linhas 56-58), devolvendo
  `{ status: 200, message: 'Server Running' }` **sem testar o banco**. Não
  existe rota `/health` em nenhum módulo (confirmado — nenhum `fastify.get`
  com esse path em todo `src/`).

**Fazer:** `GET /health` que faz um `SELECT 1`/`prisma.$queryRaw` no Postgres
(readiness) e um `GET /health/live` simples (liveness) — importante para
qualquer orquestrador (Docker healthcheck, Kubernetes, Render) saber quando o
processo está pronto para receber tráfego.

### 🟡 7.4 — Sem graceful shutdown

- `server.ts` (12 linhas) dá `listen` e nada mais. Em `SIGTERM` (deploy,
  `docker stop`) o processo morre no meio das requisições e **não fecha o
  Prisma** nem drena conexões abertas.

**Fazer:** capturar `SIGTERM`/`SIGINT`, chamar `app.close()` +
`prisma.$disconnect()`.

### 🟡 7.5 — Sem Dockerfile da aplicação

Existe `docker-compose.yml` só para o Postgres local. Não há `Dockerfile` nem
`.dockerignore` na raiz do projeto — falta empacotar a própria API para subir
em produção.

### 🟡 7.6 — Logs sem redação nem nível por ambiente

`Fastify({ logger: true })` (`app.ts:23`) usa o logger padrão (pino) em todos
os ambientes, sem `redact` de campos sensíveis (`Authorization`, `password`,
`req.headers.cookie`) e sem nível configurável (`LOG_LEVEL`) nem formato
pensado para agregador de logs em produção.

---

## 8. CI, testes e cadeia de dependências

### 🟠 8.1 — `npm audit`: 14 vulnerabilidades nas dependências (3 críticas)

Rodado em 2026-09-09 contra `package-lock.json` atual:

```text
3 critical, 4 high, 7 moderate — 14 total (477 pacotes: 349 prod, 105 dev)
```

Toda a cadeia vem de dependências transitivas de **dois pacotes diretos**:

- `biome` (dependência de produção, `package.json` — provavelmente deveria ser
  `devDependency`, já que é um linter) → `request` (pacote **deprecated e sem
  manutenção**) → `form-data`, `qs`, `tough-cookie`, `uuid` (as 3
  críticas/altas vêm daqui).
- `prisma`/`@prisma/config` → `mysql2`/`deepmerge-ts` — instalado mesmo o
  projeto usando só Postgres (driver morto, mas presente na árvore).

Não são exploráveis via API hoje (não é código que a aplicação chama em
runtime), mas ficam na superfície de ataque da cadeia de build/CI, sem
nenhuma auditoria automática pegando isso.

**Fazer:** trocar `biome` (que parece redundante — o projeto já usa
`@biomejs/biome` como devDependency real, ver `package.json`) — o pacote
`biome` npm genérico não é o mesmo que `@biomejs/biome` e parece ter entrado
por engano; remover a dependência solta `biome` provavelmente já elimina
a cadeia do `request`. Adicionar `npm audit --audit-level=high` como step
obrigatório no CI + Dependabot/Renovate.

### 🟠 8.2 — Testes locais batem no banco de desenvolvimento

- `tests/helpers.ts:1-2` importa `prisma` de `../prisma/prisma.client`
  diretamente — quando rodado localmente (`npm test`), usa o `DATABASE_URL` do
  `.env` do desenvolvedor, **poluindo o banco de dev real** (é preciso re-seed
  depois para o app mobile abrir limpo).
- **Diferente do que o `SEGURANCA.md` antigo registrava**: o CI (`.github/
  workflows/ci.yml`) já sobe um Postgres efêmero isolado (`services.postgres`)
  com `DATABASE_URL` próprio — isso já está certo lá. O problema é só o fluxo
  local.

**Fazer:** `.env.test` com uma `DATABASE_URL` separada (porta ou banco
diferente) e script `test` que carrega esse arquivo, ou usar testcontainers.

### 🟡 8.3 — Faltam testes de autorização e de vazamento

Não há teste cobrindo: usuário A **não** acessa/edita recurso de B; nenhuma
rota devolve `passwordHash`; captura de não-amigo aparece em
`GET /catches/:id` (hoje aparece — ver 2.3, então esse teste falharia se
escrito, o que é o ponto).

### 🟡 8.4 — CI usa `npm install` em vez de `npm ci`

- `.github/workflows/ci.yml`, step "Instalar dependencias": `npm install`
  reescreve o lockfile e não garante build reprodutível. Trocar por `npm ci`.
- `npx tsc --noEmit` no CI roda com o `tsconfig.json` que **exclui
  `generated/`** — o client gerado pelo Prisma nunca é type-checado.

### 🔵 8.5 — CI não roda em toda branch

`ci.yml`: `push` só em `master` (e todo PR). Push direto numa branch de
feature sem PR não roda os testes.

---

## 9. Completude funcional (o produto "fechado")

Itens que não são falha de segurança, mas faltam para o backend cobrir tudo
que a ideia do produto pede:

- 🔵 **Buscar usuários** — `POST /friendships` recebe `targetUserId` (UUID).
  Não há `GET /users?search=` para achar alguém por username. Hoje só dá para
  adicionar amigo se você já souber o UUID.
- 🔵 **Desfazer amizade / cancelar pedido / recusar pedido** — só existem
  `accept` e `block` (`friendships.routes.ts`). Falta `DELETE /friendships/:id`
  (unfriend) e recusar sem bloquear.
- 🔵 **Editar perfil** — não há `PATCH /users/me` (trocar avatar, username).
- 🔵 **Editar/apagar captura** — hoje captura é imutável e eterna; se o usuário
  erra a espécie, não tem conserto (e apagar exigiria estornar XP/nível —
  depende de 5.1/5.2 estarem resolvidos primeiro para ser seguro).
- 🔵 **Refresh token / logout** — ver 1.2.
- 🔵 **Recuperação de senha** — ver 1.6.
- 🔵 **Notificações** — pedido de amizade recebido, reação na sua captura.
  Parte de "rede social", hoje inexistente.
- 🔵 **Paginação do feed por cursor** — hoje é offset
  (`feed.repository.ts`/`catches.repository.ts`); decisão consciente, mas com
  inserção concorrente pode duplicar/pular itens entre páginas. Migrar se a
  base crescer.

---

## 10. Verificado e sem achado (não precisa de ação)

Pontos checados nesta auditoria que **não** são problema hoje — registrados
para não serem re-investigados à toa:

- **SQL injection via Prisma raw**: nenhum `$queryRaw`/`$executeRaw` em `src/`
  — toda query passa pelo query builder do Prisma (parametrizado por
  construção).
- **Mass assignment nos schemas zod**: `catches.schema.ts`, `auth.schema.ts`
  etc. não aceitam `xp`, `level`, `userId` ou `id` do client — só campos
  descritivos. Os `service`s também pegam `userId` do JWT (`request.user.sub`),
  nunca do body.
- **`.env` nunca commitado**: `git log --all --oneline -- .env` vazio, e
  `.gitignore` cobre `.env` desde o commit inicial.
- **Catálogos (`species`, `achievements`) são read-only via API**: não existe
  rota de escrita para nenhum dos dois — só o `seed.ts` popula. Sem risco de
  um usuário poluir o catálogo fixo.
- **Rotas de amizade autenticadas**: as 4 rotas de `friendships.routes.ts` já
  têm `preHandler: authenticate` (isso já foi corrigido em algum commit
  anterior — o `SERVIDOR.md` antigo ainda listava como pendente).

---

## 11. Checklist priorizado

### Antes de qualquer deploy público — 🔴

- [ ] 1.1 — `src/config/env.ts` com zod; `JWT_SECRET` forte e obrigatório
- [ ] 1.2 — Expiração no JWT + refresh token + logout
- [ ] 2.1 — `GET /users/:id` para de devolver `email` de terceiros
- [ ] 3.2 — Bloquear SVG (e mimetypes fora da whitelist) no upload
- [ ] 7.1 — Build/start de produção que realmente funciona (ou rodar com `tsx`)

### Hardening de segurança — 🟠

- [ ] 1.3 — `@fastify/rate-limit` (global + `/auth/*`)
- [ ] 1.4 — Igualar timing do login (hash dummy)
- [ ] 2.2 — `select` sem `passwordHash` / `toPublicUser()` + teste
- [ ] 2.3 — Regra de visibilidade de capturas/reações aplicada no service
- [ ] 2.4 — Privacidade das coordenadas GPS
- [ ] 2.5 — Contrato do `BLOCKED` (aplicar em `catches`/`reactions`, não só feed)
- [ ] 3.1 / 3.3 — Magic bytes reais no upload; `photoUrl` restrito a `/uploads/...`
- [ ] 4.1 — `@fastify/helmet`
- [ ] 7.2 — Storage de fotos em bucket externo
- [ ] 8.1 — Remover dependência solta `biome`; `npm audit` no CI
- [ ] 8.2 — Banco de teste isolado (local, CI já está ok)

### Robustez e qualidade — 🟡

- [ ] 3.4 / 3.5 — Autenticação nas fotos (se privacidade exigir); limpeza de órfãos + bug do `truncated`
- [ ] 4.2 — CORS com allowlist
- [ ] 4.3 — `errorHandler` não vaza mensagem crua em produção; mapear `P2003`/`P2000`
- [ ] 4.4 — Remover tratamento de erro divergente do `FriendshipController`
- [ ] 5.1 / 5.2 — Transação + `increment` na criação de captura
- [ ] 5.3 — `checkAchievements` com `>=`, idempotente
- [ ] 6.1 / 6.2 — Faixas nos campos numéricos; teto de paginação sempre aplicado
- [ ] 7.3 / 7.4 / 7.5 / 7.6 — `/health` real, graceful shutdown, Dockerfile, logs
- [ ] 8.3 / 8.4 / 8.5 — Testes de autorização; `npm ci`; CI em toda branch

### Completude de produto — 🔵

- [ ] 1.6 — Recuperação/troca de senha
- [ ] 2.6 — Deleção de conta + export de dados (LGPD)
- [ ] 5.4 / 6.3 — `respondedAt`; formato de `username`
- [ ] 9 — Busca de usuários, unfriend, editar perfil, editar/apagar captura,
      notificações

---

## Decisões de produto ainda em aberto (bloqueiam itens acima)

| Item | Bloqueia |
| --- | --- |
| Regra de visibilidade de captura (só amigos vs. pública) | 2.3, 2.4, 2.5, 3.4 |
| Contrato exato de `BLOCKED` | 2.5 |
| Política de edição/remoção de `Catch` | 9 (editar/apagar captura) |
| Estratégia de storage externo para fotos | 3.4, 7.2 |
