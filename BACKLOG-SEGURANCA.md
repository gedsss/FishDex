# Backlog de Segurança — FishDex API

Backlog derivado da auditoria de segurança de 18/09/2026 (ver `Auditoria-Seguranca-FishDex.docx`), mapeada no OWASP API Security Top 10 (2023).

**Total:** 28 cards — 5 críticos, 9 altos, 12 médios, 2 baixos.

---

## Como jogar isso no Trello

1. Crie 4 listas no board, nesta ordem:
   `🔴 Crítico — bloqueia deploy` · `🟠 Alto — hardening` · `🟡 Médio — robustez` · `🔵 Baixo — higiene`
2. Em cada lista, clique em **Adicionar cartão**, cole o bloco de títulos correspondente (seção "Títulos para colar") e confirme quando o Trello perguntar se quer criar **um cartão por linha**.
3. Abra cada cartão e cole a descrição correspondente da seção "Descrição dos cartões".
4. Sugestão de etiquetas: `OWASP-API1` … `OWASP-API10`, `backend`, `auth`, `upload`, `infra`.

---

## Títulos para colar

### Lista: 🔴 Crítico — bloqueia deploy

```
[F-17] Bloquear upload de SVG e validar magic bytes (XSS armazenado)
[F-05] Definir expiração no JWT + refresh token + logout
[F-06] Validar variáveis de ambiente com zod e gerar JWT_SECRET forte
[F-07] Instalar rate limiting global e agressivo em /auth
[F-01] Aplicar regra de visibilidade em GET /catches/:id e /users/:id/catches
```

### Lista: 🟠 Alto — hardening

```
[F-02] Bloquear reação em captura de quem não é amigo
[F-03] Proteger /uploads com autenticação ou URL assinada
[F-04] Fazer o status BLOCKED valer fora do feed
[F-10] Parar de expor e-mail de terceiros em GET /users/:id
[F-11] Definir privacidade das coordenadas GPS da captura
[F-13] Definir limites de consumo (rate limit, bodyLimit, timeout)
[F-18] Instalar @fastify/helmet e configurar CSP
[F-19] errorHandler não pode vazar caminho e código em produção
[F-26] Remover dependência "biome" e zerar o npm audit
```

### Lista: 🟡 Médio — robustez

```
[F-08] Equalizar tempo de resposta do login (anti-enumeração)
[F-09] Endurecer política de senha e custo do bcrypt
[F-12] Nunca retornar passwordHash do repositório + teste de regressão
[F-14] Tornar paginação obrigatória em GET /catches/me
[F-15] Corrigir upload truncado e limpar arquivos órfãos
[F-16] Proteger cadastro e pedido de amizade contra automação
[F-20] Trocar CORS origin:true por allowlist via env
[F-21] Implementar graceful shutdown (SIGTERM/SIGINT)
[F-22] Consertar o build de produção
[F-25] Adicionar /health, versionamento de rota e OpenAPI
[F-27] Trocar npm install por npm ci e adicionar npm audit no CI
[F-28] Envolver criação de captura em transação e usar increment no XP
```

### Lista: 🔵 Baixo — higiene

```
[F-23] Parametrizar porta do Postgres no docker-compose
[F-24] Não criar usuários demo com senha fixa fora de desenvolvimento
```

---

## Descrição dos cartões

### 🔴 Crítico

**[F-17] Bloquear upload de SVG e validar magic bytes (XSS armazenado)**
- **OWASP:** API8:2023 — Security Misconfiguration
- **Onde:** `src/modules/uploads/uploads.routes.ts:28-36`, `app.ts:39-43`
- **Problema:** o filtro aceita qualquer mimetype `image/*`; o que não está em `ALLOWED_EXT` cai num fallback que usa a extensão do nome de arquivo mandado pelo cliente. Um SVG com `<script>` foi salvo e servido de volta pela API como `image/svg+xml`, sem autenticação e sem CSP — **confirmado por exploração durante a auditoria**.
- **Correção:** rejeitar mimetype fora de `ALLOWED_EXT` (remover o fallback); validar magic bytes reais (pacote `file-type`); servir uploads com `Content-Disposition: attachment` + CSP restritiva.
- **Critério de aceite:** upload de `.svg` retorna 400; upload de arquivo `.jpg` renomeado com conteúdo não-imagem retorna 400; teste automatizado cobrindo os dois casos.

**[F-05] Definir expiração no JWT + refresh token + logout**
- **OWASP:** API2:2023 — Broken Authentication
- **Onde:** `app.ts:33`, `src/modules/auth/auth.controller.ts:21`
- **Problema:** token emitido sem claim `exp` — vale para sempre. Payload real capturado: `{"sub":"...","iat":...}`. Não existe logout nem revogação.
- **Correção:** `expiresIn` de 15min a 1h no registro do plugin; refresh token rotacionado e persistido; `POST /auth/refresh` e `POST /auth/logout`.
- **Critério de aceite:** token decodificado contém `exp`; token expirado retorna 401; refresh emite novo par e invalida o anterior.

**[F-06] Validar variáveis de ambiente com zod e gerar JWT_SECRET forte**
- **OWASP:** API2:2023 — Broken Authentication
- **Onde:** `app.ts:33`, `.env.example:2`
- **Problema:** `process.env.JWT_SECRET as string` — o cast mascara ausência/vazio; o exemplo distribuído é `change-me-in-production`. Não existe `src/config/env.ts`.
- **Correção:** criar `src/config/env.ts` com zod (`JWT_SECRET` obrigatório, mín. 32 chars; `DATABASE_URL` url; `PORT` número) e abortar o boot se inválido. Gerar segredo com `openssl rand -base64 48`.
- **Critério de aceite:** subir sem `JWT_SECRET` falha no boot com mensagem clara; segredo menor que 32 chars é rejeitado.

**[F-07] Instalar rate limiting global e agressivo em /auth**
- **OWASP:** API2:2023 / API4:2023
- **Onde:** `package.json`, `src/modules/auth/auth.routes.ts`
- **Problema:** `@fastify/rate-limit` não instalado. **15 tentativas seguidas de senha errada foram processadas sem nenhum bloqueio** (confirmado em teste).
- **Correção:** rate limit global (~100 req/min/IP) + limite em `/auth/*` (~5 tentativas/15min por IP+e-mail), com bloqueio progressivo.
- **Critério de aceite:** 6ª tentativa de login errada no mesmo IP+e-mail retorna 429; teste automatizado cobrindo o 429.

**[F-01] Aplicar regra de visibilidade em GET /catches/:id e /users/:id/catches**
- **OWASP:** API1:2023 — Broken Object Level Authorization
- **Onde:** `src/modules/catches/catches.service.ts:60-86`
- **Problema:** as rotas só exigem token; não checam amizade. `viewerId` chega ao service mas só enriquece a resposta. **Confirmado:** usuário sem amizade leu captura e galeria alheias (HTTP 200).
- **Correção:** decidir a regra (só amigos vs. público) e implementar no service; negar com 404 para não confirmar existência do recurso.
- **Critério de aceite:** não-amigo recebe 404 em `GET /catches/:id`; amigo aceito recebe 200; teste automatizado dos dois caminhos.
- **⚠️ Depende de:** decisão de produto sobre visibilidade de capturas (bloqueia também F-02, F-03, F-04, F-11).

### 🟠 Alto

**[F-02] Bloquear reação em captura de quem não é amigo**
- **OWASP:** API1:2023 · **Onde:** `src/modules/reactions/reactions.service.ts:13-25`
- **Problema:** `react()` só verifica se a captura existe. **Confirmado:** não-amigo gravou reação `FIRE` em captura alheia (HTTP 200).
- **Correção:** aplicar a mesma regra do F-01 antes do upsert, incluindo checagem de bloqueio.
- **Critério de aceite:** `PUT /catches/:id/reaction` de não-amigo retorna 403/404; teste cobrindo.

**[F-03] Proteger /uploads com autenticação ou URL assinada**
- **OWASP:** API1:2023 · **Onde:** `app.ts:39-43`
- **Problema:** `@fastify/static` serve as fotos sem nenhum `preHandler`. Qualquer um com a URL vê a foto, para sempre.
- **Correção:** rota autenticada que valide visibilidade, ou bucket externo com URL assinada de curta duração.
- **Critério de aceite:** `GET /uploads/<arquivo>` sem token retorna 401.

**[F-04] Fazer o status BLOCKED valer fora do feed**
- **OWASP:** API1:2023 · **Onde:** `src/modules/friendships/friendships.service.ts:12-30, 55-72`
- **Problema:** `block()` só grava o status; nenhum outro módulo consulta. `sendRequest()` também não olha o status ao checar duplicidade.
- **Correção:** definir o contrato do bloqueio e criar helper central `canView(viewerId, ownerId)` usado por users, catches e reactions.
- **Critério de aceite:** usuário bloqueado recebe 403/404 em perfil, capturas e reação; não consegue reenviar pedido.

**[F-10] Parar de expor e-mail de terceiros em GET /users/:id**
- **OWASP:** API3:2023 · **Onde:** `src/modules/users/users.service.ts:23-41`
- **Problema:** `getProfile()` inclui `email` e serve tanto `/users/me` quanto `/users/:id`. **Confirmado:** usuário sem relação leu `gedson@fishdex.app`. Dado pessoal → risco LGPD.
- **Correção:** mappers separados — perfil próprio com e-mail, perfil de terceiro só com o subconjunto público.
- **Critério de aceite:** `GET /users/:id` de outro usuário não contém `email`; `/users/me` continua contendo; teste cobrindo.

**[F-11] Definir privacidade das coordenadas GPS da captura**
- **OWASP:** API3:2023 · **Onde:** `src/shared/feed-catch.ts:111-113`
- **Problema:** `locationLat`/`locationLng` vão crus para qualquer visualizador. A função tem `viewerId` e calcula `mine`, mas não usa para decidir.
- **Correção:** arredondar para ~1 km para não-donos, ou expor só `locationName`, mantendo exato quando `mine === true`.
- **Critério de aceite:** resposta para não-dono não traz coordenada exata; teste cobrindo.

**[F-13] Definir limites de consumo (rate limit, bodyLimit, timeout)**
- **OWASP:** API4:2023 · **Onde:** `app.ts`
- **Problema:** sem rate limit, sem `bodyLimit` explícito, sem timeout de requisição. Um cliente satura processo e pool do Postgres.
- **Correção:** `@fastify/rate-limit` global, `bodyLimit` na instância Fastify, timeouts configurados.
- **Critério de aceite:** payload acima do limite retorna 413; excesso de requisições retorna 429.

**[F-18] Instalar @fastify/helmet e configurar CSP**
- **OWASP:** API8:2023 · **Onde:** `app.ts`, `package.json`
- **Problema:** **confirmado** — nenhum header de segurança nas respostas (sem `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `CSP`, `Referrer-Policy`).
- **Correção:** registrar `@fastify/helmet`, com CSP específica para a rota de estáticos (defesa em profundidade para o F-17).
- **Critério de aceite:** resposta de `GET /species` traz `nosniff`, `X-Frame-Options` e `CSP`.

**[F-19] errorHandler não pode vazar caminho e código em produção**
- **OWASP:** API8:2023 · **Onde:** `src/middlewares/errorHandler.ts:41-42`
- **Problema:** `reply.send(error)` devolve a mensagem crua. **Capturado na auditoria:** a API respondeu com o caminho absoluto do arquivo no servidor e um trecho do código-fonte.
- **Correção:** logar completo internamente e responder 500 genérico quando `NODE_ENV === 'production'`; mapear também `P2003` e `P2000`.
- **Critério de aceite:** erro não tratado em produção responde `{"message":"Erro interno"}` sem stack nem caminho.

**[F-26] Remover dependência "biome" e zerar o npm audit**
- **OWASP:** API10:2023 · **Onde:** `package.json:31`
- **Problema:** `npm audit` → **14 vulnerabilidades (3 críticas, 4 altas, 7 moderadas)**. A cadeia vem do pacote `biome@0.3.3` em `dependencies` — que **não** é o linter do projeto (esse é `@biomejs/biome`, já em devDependencies) e arrasta o pacote deprecado `request`.
- **Correção:** remover `biome`, rodar `npm audit fix`, adicionar `npm audit --audit-level=high` no CI e ativar Dependabot/Renovate.
- **Critério de aceite:** `npm audit` sem vulnerabilidades high/critical; CI falha se aparecerem novas.

### 🟡 Médio

**[F-08] Equalizar tempo de resposta do login (anti-enumeração)** — API2 · `auth.service.ts:30-40`. E-mail inexistente retorna antes do `bcrypt.compare`, e a diferença de latência revela quem está cadastrado. Rodar compare contra hash dummy fixo. *Aceite:* diferença de tempo entre e-mail existente e inexistente dentro do ruído.

**[F-09] Endurecer política de senha e custo do bcrypt** — API2 · `auth.schema.ts:6,11`, `auth.service.ts:15`. Hoje `min(6)` (aceita `123456`) e custo 10 fixo. Subir para 10–12 chars, bloquear senhas comuns, custo 12 vindo de config. *Aceite:* `123456` é rejeitada no registro.

**[F-12] Nunca retornar passwordHash do repositório + teste de regressão** — API3 · `users.repository.ts:4-10`. `findById` sem `select` traz o registro inteiro. Hoje não vaza porque `getProfile` remonta campo a campo — é bomba-relógio. Adicionar `select` explícito ou `toPublicUser()`. *Aceite:* teste que varre respostas de todas as rotas e falha se achar `passwordHash`.

**[F-14] Tornar paginação obrigatória em GET /catches/me** — API4 · `catches.schema.ts:21-24`. Sem `limit` devolve a coleção inteira, sem teto. Aplicar default (20) e máximo (50) sempre. *Aceite:* chamada sem query params devolve no máximo 20 itens.

**[F-15] Corrigir upload truncado e limpar arquivos órfãos** — API4 · `uploads.routes.ts:36-40`. O `pipeline` grava antes de checar `truncated`: upload acima de 8 MB retorna 400 mas o arquivo truncado fica no disco. Uploads nunca vinculados a uma captura também ficam para sempre. *Aceite:* arquivo truncado é removido; rotina de limpeza de órfãos existe e roda.

**[F-16] Proteger cadastro e pedido de amizade contra automação** — API6 · `auth.routes.ts`, `friendships.routes.ts`. Sem rate limit, captcha ou verificação de e-mail. *Aceite:* rate limit por IP no registro; teto diário de pedidos de amizade por usuário.

**[F-20] Trocar CORS origin:true por allowlist via env** — API8 · `app.ts:28-32`. Reflete qualquer origem e libera `Authorization`. Risco baixo por usar header (não cookie), mas produção pede allowlist. *Aceite:* origem fora da allowlist recebe erro de CORS em produção.

**[F-21] Implementar graceful shutdown (SIGTERM/SIGINT)** — API8 · `server.ts:1-11`. Só faz `listen()`; em deploy as requisições morrem no meio e o Prisma não desconecta. *Aceite:* `SIGTERM` drena as requisições em voo e fecha a conexão antes de sair.

**[F-22] Consertar o build de produção** — API8 · `package.json`, `tsconfig.json`. `build: tsc` + `start: node dist/server.js`, mas o `tsconfig` exclui `generated/` (onde vive o Prisma Client em TS) → o `dist` importaria um `.ts` inexistente. Hoje só roda via `tsx`. *Aceite:* `npm run build && npm start` sobe a API num container limpo.

**[F-25] Adicionar /health, versionamento de rota e OpenAPI** — API9 · `app.ts:56-58`. Não existe `/health` que teste o banco; sem `/v1`; sem spec publicada. *Aceite:* `/health` faz `SELECT 1` e retorna 503 se o banco cair; OpenAPI acessível.

**[F-27] Trocar npm install por npm ci e adicionar npm audit no CI** — API10 · `.github/workflows/ci.yml`. `npm install` não garante build reprodutível; não há gate de dependências nem secret scanning. *Aceite:* CI usa `npm ci` e falha com vulnerabilidade high/critical.

**[F-28] Envolver criação de captura em transação e usar increment no XP** — Integridade · `catches.service.ts:37-55`, `users.repository.ts:22-29`. Quatro chamadas Prisma sem `$transaction`, e o XP é gravado como valor absoluto lido em memória (duas capturas concorrentes → perda de atualização). *Aceite:* fluxo dentro de `$transaction`; update usa `xp: { increment: xpAwarded }`; teste de concorrência com duas capturas simultâneas mantém o XP correto.

### 🔵 Baixo

**[F-23] Parametrizar porta do Postgres no docker-compose** — API8 · `docker-compose.yml:13`. O compose fixa 5433 mas o `.env` em uso aponta para 5434; recriar o container quebra o ambiente de forma confusa. Usar `${POSTGRES_PORT:-5433}:5432` e alinhar README/.env.example. *Aceite:* `docker compose up -d` funciona em máquina com a 5433 ocupada, só mudando o `.env`.

**[F-24] Não criar usuários demo com senha fixa fora de desenvolvimento** — API8 · `README.md`, `prisma/seed.ts`. Três contas com senha `pescaria123` versionadas. Condicionar a `NODE_ENV !== 'production'` e gerar senha aleatória impressa no console. *Aceite:* seed em produção não cria contas demo.

---

## Ordem sugerida de execução

1. **Fase 1 (crítico):** F-17 → F-06 → F-05 → F-07 → F-01
   *F-06 antes de F-05 porque a validação de env é pré-requisito para configurar o segredo e a expiração com segurança.*
2. **Fase 2 (alto):** F-01 destrava F-02, F-03, F-04 e F-11 (todos dependem da mesma decisão de visibilidade). Em paralelo: F-10, F-18, F-19, F-26, F-13.
3. **Fase 3 (médio):** integridade primeiro (F-28), depois autenticação (F-08, F-09, F-12), limites (F-14, F-15, F-16) e operação (F-20, F-21, F-22, F-25, F-27).
4. **Fase 4 (baixo):** F-23, F-24.

## Decisões de produto que bloqueiam cards

| Decisão pendente | Bloqueia |
| --- | --- |
| Capturas são públicas ou só para amigos? | F-01, F-02, F-03, F-11 |
| O que exatamente o bloqueio impede? | F-04 |
| Fotos ficam em disco local ou bucket externo? | F-03, F-22 |
