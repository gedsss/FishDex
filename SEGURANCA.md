# Segurança e completude do backend — pendências

Levantamento do que falta no backend do FishDex para ele ser considerado **seguro**
e **completo** o suficiente para ir a produção (deploy público, com usuários reais).

O backend hoje **funciona** e está integrado ponta a ponta com o app mobile
(ver `INTEGRACAO.md`), com 37 testes Vitest passando. Este documento não trata de
"o que está quebrado" — trata de **o que está faltando** para além do caminho feliz:
autenticação robusta, autorização entre usuários, privacidade, e o que um deploy
de verdade exige.

Nada aqui bloqueia a apresentação acadêmica do projeto. É a lista do que precisaria
ser feito **antes** de expor a API na internet.

## Como ler

| Severidade | Significado |
| --- | --- |
| 🔴 Crítico | Explorável hoje. Corrigir antes de qualquer deploy público. |
| 🟠 Alto | Falha de segurança/privacidade real, mitigada só por obscuridade (UUID, app fechado). |
| 🟡 Médio | Robustez, integridade de dados, hardening. |
| 🔵 Baixo | Melhoria / completude de produto. |

Referências de código no formato `arquivo:linha` apontam o ponto exato a mexer.

---

## 1. Autenticação e sessão

### 🔴 1.1 — `JWT_SECRET` sem validação e com placeholder fraco

- `.env.example:2` traz `JWT_SECRET="change-me-in-production"`. Se subir em produção
  sem trocar, **qualquer pessoa forja um token válido** para qualquer usuário.
- `app.ts:33` faz `process.env.JWT_SECRET as string` — se a variável estiver
  ausente ou vazia, o cast mascara o problema (o `@fastify/jwt` até reclama de
  secret ausente, mas não de secret fraco/curto).
- **Não existe `src/config/env.ts`** validando `process.env` com zod, apesar de o
  `CLAUDE.md` prever esse arquivo. Hoje cada `process.env.X` é lido solto, sem
  garantia de que está presente/no formato certo no boot.

**Fazer:** criar `src/config/env.ts` com zod (`JWT_SECRET` obrigatório, mínimo
32 caracteres; `DATABASE_URL` url; `PORT` numérico) e falhar no boot se inválido.
Gerar o secret de produção com `openssl rand -base64 48`.

### 🔴 1.2 — Token JWT nunca expira

- `auth.controller.ts:21`: `request.server.jwt.sign({ sub: user.id })` — sem
  `expiresIn`.
- `app.ts:33`: plugin registrado sem `sign: { expiresIn }`.
- Consequência: **um token vazado vale para sempre.** Não há expiração, não há
  logout, não há revogação.
- `INTEGRACAO.md` chega a citar "Token expirou" como causa de 401 — hoje isso
  nunca acontece.

**Fazer:** definir `expiresIn` (ex.: `'15m'` ou `'1h'`) e implementar **refresh
token** (rota `POST /auth/refresh`, token de refresh persistido/rotacionado no
banco, revogável). Adicionar `POST /auth/logout`.

### 🟠 1.3 — Sem rate limiting

- Nenhuma rota tem limite de requisições. `@fastify/rate-limit` não está instalado.
- `POST /auth/login` e `POST /auth/register` ficam abertos a **brute force de
  senha** e a **enumeração de contas** em massa.

**Fazer:** `@fastify/rate-limit` global (ex.: 100 req/min por IP) + limite
agressivo em `/auth/*` (ex.: 5 tentativas / 15 min por IP+email).

### 🟠 1.4 — Login permite enumerar e-mails por timing

- `auth.service.ts:30-40`: se o e-mail não existe, retorna **antes** de rodar
  `bcrypt.compare`. Com e-mail existente, roda o compare (dezenas de ms).
- A mensagem de erro é a mesma nos dois casos (bom), mas a **diferença de tempo de
  resposta** revela se um e-mail está cadastrado.

**Fazer:** rodar um `bcrypt.compare` contra um hash dummy fixo quando o usuário não
existe, para igualar o tempo de resposta.

### 🟡 1.5 — Política de senha fraca

- `auth.schema.ts:6`: `password: z.string().min(6)`. Aceita `123456`.
- `bcrypt.hash(data.password, 10)` com custo `10` hardcoded (`auth.service.ts:15`).

**Fazer:** mínimo de 8–10 caracteres, bloquear as senhas mais comuns; subir o
custo do bcrypt para `12` e ler de config.

### 🔵 1.6 — Falta "esqueci a senha" / trocar senha

Não há fluxo de recuperação nem `PATCH /users/me/password`. Necessário para
produto real (e para não deixar conta órfã se o usuário esquece a senha).

---

## 2. Autorização e exposição de dados

### 🔴 2.1 — `GET /users/:id` vaza o e-mail de qualquer usuário

- `users.service.ts:29-41` (`getProfile`) devolve `email` no objeto.
- É usado tanto por `GET /users/me` quanto por `GET /users/:id`
  (`users.controller.ts:8`), então **qualquer usuário autenticado lê o e-mail de
  qualquer outro** — basta ter o id (que circula no feed, nas amizades, etc.).

**Fazer:** `email` só em `/users/me`. Perfil de terceiros devolve um subconjunto
público (`id`, `username`, `handle`, `level`, `avatarUrl`, `memberSince`, contagens).

### 🟠 2.2 — Repository de usuário devolve o `passwordHash`

- `users.repository.ts:4-10`: `findById` faz `findUnique` sem `select` → retorna o
  registro **inteiro, incluindo `passwordHash`**.
- Hoje nenhuma rota serializa esse objeto direto (o `getProfile` remonta campo a
  campo, o `catches.service` só lê `.xp`), então **não está vazando agora** — mas é
  uma bomba-relógio: o primeiro handler novo que fizer `reply.send(user)` expõe o
  hash.
- O `toPublicUser()` reutilizável previsto no `CLAUDE.md` nunca foi criado.

**Fazer:** `select` explícito no repository (nunca trazer `passwordHash`) **ou** um
mapper `toPublicUser()` único, usado em todo lugar que serializa `User`. Adicionar
teste "nenhuma resposta de nenhuma rota contém `passwordHash`".

### 🟠 2.3 — Leitura de capturas não respeita amizade

- `GET /catches/:id` (`catches.controller.ts:21`) e `GET /users/:id/catches`
  (`catches.controller.ts:43`) só exigem token — **não checam se o viewer é amigo
  do dono da captura**.
- `PUT`/`DELETE /catches/:catchId/reaction` (`reactions.service.ts:13-25`):
  qualquer usuário autenticado reage a **qualquer** captura, de amigo ou não.
- O `GET /feed` filtra por amigos aceitos (`feed.service.ts:19-23`), mas o acesso
  direto por id não. A única proteção real hoje é o id ser um UUID não-enumerável.

**Fazer:** decidir a regra de visibilidade (só amigos? público?) e aplicá-la no
`service` de `catches` e `reactions` — não só no feed.

### 🟠 2.4 — Coordenadas GPS exatas expostas a qualquer viewer

- `feed-catch.ts:110-112`: `locationLat` / `locationLng` vão **crus** no feed, no
  detalhe da captura e na galeria do perfil, para qualquer um que veja a captura.
- É a **decisão em aberto nº 7** do `CLAUDE.md`, ainda não resolvida. Expõe onde a
  pessoa pesca e, por tabela, onde mora / sua rotina.

**Fazer:** decidir entre (a) captura com flag `isPrivate`, (b) arredondar as
coordenadas para ~1 km antes de expor a terceiros, (c) só mostrar `locationName`
(texto) para não-donos e as coordenadas exatas só para o próprio usuário.

### 🟠 2.5 — `BLOCKED` não bloqueia quase nada

- `friendships.service.ts:55-72`: `block` só troca o `status` para `BLOCKED`.
- O único efeito prático é sumir do feed (`feed.service.ts` filtra `ACCEPTED`). Um
  usuário bloqueado **ainda vê o perfil, a galeria de capturas e reage às
  capturas** do outro.
- Decisão em aberto nº 8 do `CLAUDE.md`.

**Fazer:** definir e implementar o contrato do bloqueio — no mínimo: bloqueado não
vê perfil/capturas, não reage, não consegue reenviar pedido; e o bloqueio some das
listagens do bloqueador.

### 🟡 2.6 — Sem deleção de conta / exportação de dados (LGPD)

- `AuthRepository.deleteUser` existe (`auth.repository.ts:36`) mas **nenhuma rota o
  expõe**. Não há `DELETE /users/me` nem export dos dados do usuário.
- O schema já tem `onDelete: Cascade` no `User`, então a deleção em si é simples;
  falta a rota (com reautenticação por senha) e o endpoint de export.

---

## 3. Upload de fotos

### 🟠 3.1 — Tipo do arquivo é o que o cliente disser

- `uploads.routes.ts:28`: valida só `file.mimetype.startsWith('image/')` — o
  mimetype é **declarado pelo cliente**, não verificado. Qualquer arquivo enviado
  com `Content-Type: image/png` é aceito e salvo como `.png`.

**Fazer:** validar os *magic bytes* reais do arquivo (ex.: `file-type`) e rejeitar
o que não bater com JPEG/PNG/WebP.

### 🟠 3.2 — SVG passa no filtro → XSS armazenado

- `image/svg+xml` satisfaz `startsWith('image/')` e cai no fallback
  `extname(file.filename)` (`uploads.routes.ts:32`), sendo salvo como `.svg`.
- O `@fastify/static` (`app.ts:39`) serve esse `.svg` **no domínio da API**, e o
  browser executa `<script>` dentro dele → **XSS armazenado** no domínio que
  hospeda a API.

**Fazer:** whitelist estrita de extensão (`.jpg/.png/.webp` apenas), servir
uploads com `Content-Disposition: attachment` ou de um domínio/bucket separado, e
adicionar `Content-Security-Policy` nos estáticos.

### 🟠 3.3 — `photoUrl` da captura é string livre

- `catches.schema.ts:5`: `photoUrl: z.string()`. O `POST /catches` **não valida**
  que a URL corresponde a um upload real feito pelo próprio usuário.
- Dá para gravar uma captura apontando para **qualquer URL externa**, que o app vai
  renderizar no feed dos amigos (conteúdo malicioso / rastreamento / imagem
  ofensiva hospedada fora).

**Fazer:** aceitar só caminhos `^/uploads/[uuid]\.(jpg|png|webp)$` e, idealmente,
conferir no banco/disco que aquele arquivo existe e foi enviado por aquele usuário.

### 🟡 3.4 — Fotos de captura são públicas

- `GET /uploads/:arquivo` (`app.ts:39-43`) **não tem autenticação**. Quem tiver a
  URL vê a foto, sem token, para sempre.
- Se a decisão de privacidade (2.4) for "capturas só para amigos", as fotos
  precisam do mesmo controle — servir via rota autenticada ou URLs assinadas com
  expiração.

### 🟡 3.5 — Uploads órfãos nunca são limpos

Foto enviada via `POST /uploads` e nunca vinculada a uma captura fica no disco
indefinidamente. Falta um job de limpeza (ou vincular o upload ao usuário e
coletar os não-referenciados).

---

## 4. Cabeçalhos, CORS e tratamento de erro

### 🟠 4.1 — Sem headers de segurança (`helmet`)

`@fastify/helmet` não está instalado. Faltam `X-Content-Type-Options: nosniff`,
`X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`,
`Referrer-Policy`.

### 🟡 4.2 — CORS reflete qualquer origem

- `app.ts:28-32`: `origin: true` — devolve `Access-Control-Allow-Origin` igual a
  qualquer origem que chamar.
- Como a autenticação é por header `Authorization` (não cookie), o risco prático é
  baixo, mas o certo é uma **allowlist** vinda de env (`CORS_ORIGINS`).

### 🟡 4.3 — `errorHandler` devolve a mensagem de erro crua

- `errorHandler.ts:41-42`: para qualquer erro não previsto, faz
  `request.log.error(error)` **e** `return reply.send(error)` — a `error.message`
  vai para o cliente. Pode vazar detalhe de query, de conexão, de caminho de
  arquivo.
- Também não trata `P2003` (violação de FK), `P2000` (valor muito longo), etc.

**Fazer:** logar o erro completo internamente e responder um `500` genérico
(`{ message: "Erro interno" }`) sem detalhes. Mapear os códigos Prisma restantes.

### 🟡 4.4 — `FriendshipController` tem tratamento de erro próprio e divergente

- `friendships.controller.ts:9-14`: `handleError` transforma **qualquer** erro não-
  `DomainError` em `400` com a mensagem crua, em vez de deixar o `errorHandler`
  global cuidar. Fica inconsistente com o resto da API (que usa o handler central)
  e mascara `500` como `400`.

**Fazer:** remover o `try/catch` do controller e deixar o `setErrorHandler` global
tratar (como fazem os outros módulos).

---

## 5. Integridade de dados e concorrência

### 🟡 5.1 — Criação de captura não é transacional

- `catches.service.ts:37-56`: `create` da `Catch`, `update` de `xp/level` e
  `checkAchievements` são **chamadas Prisma separadas**. Se o processo cair no
  meio, o `xp` do usuário não bate com a soma das capturas.
- Já registrado como pendência 2.2.2 no `SERVIDOR.md`.

**Fazer:** envolver tudo em `prisma.$transaction`.

### 🟡 5.2 — Atualização de XP sofre *lost update*

- `catches.service.ts:48` lê `user.xp` em memória, soma, e
  `users.repository.ts:22-29` grava `xp: newXp` **absoluto**.
- Duas capturas concorrentes do mesmo usuário leem o mesmo `xp` inicial → uma
  sobrescreve a outra e o XP some.

**Fazer:** `xp: { increment: xpAwarded }` no update e recalcular o `level` a partir
do valor retornado, dentro da transação de 5.1.

### 🟡 5.3 — `checkAchievements` é frágil

- `achievements.service.ts:50,56`: usa igualdade exata (`totalCatches === 1`,
  `distinctSpecies === 10`). Se a captura que deveria disparar falhar, a conquista
  **nunca mais** é concedida (a contagem já passou do número).
- `unlock` pode lançar `P2002` numa corrida e não há tratamento.

**Fazer:** usar `>=` + checar se já está desbloqueada antes de inserir; tratar
`P2002` como no-op.

### 🔵 5.4 — `respondedAt` nunca é preenchido

- `friendships.repository.ts:59-64` (`updateStatus`) só grava `status`. O
  `respondedAt` do schema fica sempre `null`, e o `orderBy: { respondedAt: 'desc' }`
  em `findManyByUser` (`:69`) não ordena nada de fato.

**Fazer:** setar `respondedAt: new Date()` no accept/block.

---

## 6. Validação de entrada

### 🟡 6.1 — Campos numéricos sem faixa

- `catches.schema.ts`: `locationLat`/`locationLng` só `z.number()` — aceita
  `999`/`-500`. `weightGrams`/`lengthCm` sem teto. `capturedAt` (`z.coerce.date()`)
  aceita **data no futuro**.

**Fazer:** `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`, pesos/comprimentos com máximo
razoável, `capturedAt <= agora`.

### 🟡 6.2 — `GET /catches/me` sem `limit` retorna tudo

- `catches.schema.ts:21-24`: `limit` é opcional; sem ele, `findManyByUser` não
  aplica `take` (`catches.repository.ts:52-64`) e devolve **todas** as capturas do
  usuário. Sem teto, cresce indefinidamente.

**Fazer:** `limit` default (ex.: 20) e máximo obrigatórios.

### 🔵 6.3 — `username` sem formato definido

- `auth.schema.ts:4`: `z.string().min(3)`. Aceita espaços, emojis, caracteres de
  controle. O `handle` derivado (`users.service.ts:36`) remove espaços, então
  `"a b"` e `"ab"` colidem no mesmo `@ab`.

**Fazer:** regex (`^[a-zA-Z0-9_.]{3,20}$`) e/ou derivar e persistir o `handle` como
coluna única.

---

## 7. Deploy e operação

### 🔴 7.1 — Build de produção não funciona

- `package.json:8-9`: `"build": "tsc"` / `"start": "node dist/server.js"`.
- O Prisma Client gerado é **TypeScript** em `generated/`, e o `tsconfig.json:19`
  **exclui `generated`** do build. O `dist/server.js` importaria
  `../generated/prisma/client` (um `.ts` não compilado) → quebra.
- Na prática, o projeto **só roda via `tsx`**. Não há pipeline de produção testado.

**Fazer:** decidir a estratégia — rodar em produção com `tsx`/`node --import tsx`,
ou ajustar o build para compilar/copiar o client gerado. Testar `start` num
container limpo.

### 🟠 7.2 — Storage em disco local não sobrevive a deploy

Fotos em `uploads/` (`uploads.constants.ts:6`) somem a cada redeploy/reinício de
container. Já previsto como pendência no `CLAUDE.md` (storage em bucket externo —
S3/R2/Supabase). Bloqueia deploy real.

### 🟡 7.3 — Sem `/health` real

- O `README.md` documenta `GET /health`, mas `app.ts:56` só tem `GET /` devolvendo
  `{ status: 200 }` **sem testar o banco**.

**Fazer:** `GET /health` que faz um `SELECT 1` no Postgres (readiness) e um
`GET /health/live` simples (liveness).

### 🟡 7.4 — Sem graceful shutdown

- `server.ts` dá `listen` e nada mais. Em `SIGTERM` (deploy, `docker stop`) o
  processo morre no meio das requisições e **não fecha o Prisma**.

**Fazer:** `app.close()` + `prisma.$disconnect()` em `SIGTERM`/`SIGINT`.

### 🟡 7.5 — Sem Dockerfile da aplicação

Existe `docker-compose.yml` só para o Postgres. Falta `Dockerfile`,
`.dockerignore` e um compose de produção para subir a API junto.

### 🟡 7.6 — Logs

`Fastify({ logger: true })` (`app.ts:23`) usa o logger padrão em todos os
ambientes. Falta nível por ambiente, redação de campos sensíveis (`Authorization`,
`password`) e formato adequado para agregador de logs.

---

## 8. CI, testes e cadeia de dependências

### 🟠 8.1 — Testes batem no banco de desenvolvimento

- `tests/helpers.ts` e o próprio `README.md`/`INTEGRACAO.md` admitem: os testes
  criam usuários/espécies no **banco de dev real** e o poluem (é preciso re-seed
  depois para o app abrir limpo).

**Fazer:** banco de teste dedicado (`DATABASE_URL` separada no `.env.test` /
testcontainers) e limpeza entre testes (`TRUNCATE` ou transação revertida).

### 🟡 8.2 — Faltam testes de autorização e de vazamento

Não há teste cobrindo: usuário A **não** acessa/edita recurso de B; nenhuma rota
devolve `passwordHash`; captura de não-amigo não aparece em `GET /catches/:id`.
(Vários já estavam listados como "a cobrir" na Fase 4.3 do `SERVIDOR.md` e não
foram feitos.)

### 🟡 8.3 — CI usa `npm install` em vez de `npm ci`

- `.github/workflows/ci.yml:43`: `npm install` reescreve o lockfile e não garante
  build reprodutível. Trocar por `npm ci`.
- O `tsc --noEmit` do CI exclui `generated/` (tsconfig), então o **client gerado
  não é type-checado**.

### 🟡 8.4 — Sem varredura de vulnerabilidades

Sem `npm audit` no CI, sem Dependabot/Renovate. Nenhum alerta automático quando uma
dependência tiver CVE.

### 🔵 8.5 — CI não roda em todas as branches

`ci.yml:4-8`: `push` só em `master` (e todo PR). Push direto numa branch de
feature sem PR não roda os testes.

---

## 9. Completude funcional (o produto "fechado")

Itens que não são falha de segurança, mas faltam para o backend cobrir tudo que a
ideia do produto pede:

- 🔵 **Buscar usuários** — `POST /friendships` recebe `targetUserId` (UUID). Não há
  `GET /users?search=` para achar alguém por username. Hoje só dá para adicionar
  amigo se você já souber o UUID.
- 🔵 **Desfazer amizade / cancelar pedido / recusar pedido** — só existem `accept` e
  `block`. Falta `DELETE /friendships/:id` (unfriend) e recusar sem bloquear.
- 🔵 **Editar perfil** — não há `PATCH /users/me` (trocar avatar, username).
- 🔵 **Editar/apagar captura** — decisão em aberto nº 9 do `CLAUDE.md`. Hoje captura
  é imutável e eterna; se o usuário erra a espécie, não tem conserto (e apagar
  exigiria estornar XP/nível).
- 🔵 **Refresh token / logout** — ver 1.2.
- 🔵 **Recuperação de senha** — ver 1.6.
- 🔵 **Notificações** — pedido de amizade recebido, reação na sua captura. Parte de
  "rede social", hoje inexistente.
- 🔵 **Paginação do feed por cursor** — hoje é offset (`feed.repository.ts:4-20`);
  decisão consciente (nº 3 do `CLAUDE.md`), mas com inserção concorrente pode
  duplicar/pular itens entre páginas. Migrar se a base crescer.

---

## 10. Checklist priorizado

Ordem sugerida de ataque (de cima para baixo):

### Antes de qualquer deploy público — 🔴

- [ ] 1.1 — `src/config/env.ts` com zod; `JWT_SECRET` forte e obrigatório
- [ ] 1.2 — Expiração no JWT + refresh token + logout
- [ ] 2.1 — `GET /users/:id` para de devolver `email` de terceiros
- [ ] 7.1 — Build/start de produção que realmente funciona (ou rodar com `tsx`)

### Hardening de segurança — 🟠

- [ ] 1.3 — `@fastify/rate-limit` (global + `/auth/*`)
- [ ] 1.4 — Igualar timing do login (hash dummy)
- [ ] 2.2 — `select` sem `passwordHash` / `toPublicUser()` + teste
- [ ] 2.3 — Regra de visibilidade de capturas/reações aplicada no service
- [ ] 2.4 — Privacidade das coordenadas GPS (decisão nº 7)
- [ ] 2.5 — Contrato do `BLOCKED` (decisão nº 8)
- [ ] 3.1 / 3.2 / 3.3 — Validar magic bytes, barrar SVG, `photoUrl` restrito
- [ ] 4.1 — `@fastify/helmet`
- [ ] 7.2 — Storage de fotos em bucket externo
- [ ] 8.1 — Banco de teste isolado

### Robustez e qualidade — 🟡

- [ ] 4.2 — CORS com allowlist
- [ ] 4.3 — `errorHandler` não vaza mensagem crua; mapear códigos Prisma restantes
- [ ] 4.4 — Remover tratamento de erro divergente do `FriendshipController`
- [ ] 5.1 / 5.2 — Transação + `increment` na criação de captura
- [ ] 5.3 — `checkAchievements` com `>=` e idempotente
- [ ] 6.1 / 6.2 — Faixas nos campos numéricos; teto de paginação
- [ ] 7.3 / 7.4 / 7.5 — `/health` real, graceful shutdown, Dockerfile
- [ ] 8.2 / 8.3 / 8.4 — Testes de autorização; `npm ci`; `npm audit`/Dependabot

### Completude de produto — 🔵

- [ ] 1.6 — Recuperação/troca de senha
- [ ] 2.6 — Deleção de conta + export de dados (LGPD)
- [ ] 5.4 / 6.3 — `respondedAt`; formato de `username`
- [ ] 9 — Busca de usuários, unfriend, editar perfil, editar/apagar captura,
      notificações

---

## Referência rápida — decisões em aberto do `CLAUDE.md`

Estes três itens já estavam marcados como "confirmar antes de avançar" no
`CLAUDE.md` e continuam sem resposta; aparecem acima com o impacto concreto:

| Item | Onde impacta neste doc |
| --- | --- |
| nº 7 — localização / privacidade | 2.4 |
| nº 8 — regras de `BLOCKED` | 2.5 |
| nº 9 — edição/remoção de `Catch` | 9 (completude) |
