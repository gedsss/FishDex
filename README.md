# FishDex — API

App de pescaria estilo Pokédex. O usuário registra capturas de peixes, ganha XP e sobe de nível, e interage com amigos através de um feed com reações e conquistas.

Contexto completo de produto e decisões de modelagem em [CLAUDE.md](./CLAUDE.md). Guia de subir backend + app mobile juntos em [INTEGRACAO.md](./INTEGRACAO.md). Pendências de segurança, robustez e completude em [PENDENCIAS.md](./PENDENCIAS.md).

## Stack

- Node.js + Fastify
- TypeScript
- PostgreSQL via Docker
- Prisma 7 (com driver adapter `@prisma/adapter-pg`)
- zod (validação)
- bcrypt (hash de senha)
- `@fastify/jwt` (autenticação)
- `@fastify/multipart` (upload das fotos de captura, guardadas no Postgres) + `@fastify/static` (ilustrações das espécies)
- Vitest (testes)

## Rodando localmente

1. Subir o banco:

   ```bash
   docker compose up -d
   ```

   O Postgres do projeto fica na porta **5433** do host (a 5432 costuma estar ocupada pelo Postgres nativo do Windows). Se a 5433 também estiver em uso, troque em `docker-compose.yml` e no `DATABASE_URL` do `.env`.

2. Copiar as variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

3. Instalar as dependências:

   ```bash
   npm install
   ```

4. Aplicar as migrations e gerar o Prisma Client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. Popular o banco (catálogo de espécies + conquistas + usuários demo):

   ```bash
   npx tsx prisma/seed.ts
   ```

   O seed é idempotente. Ele cria:
   - **12 espécies** com ficha técnica completa (habitat, família, iscas, regiões, mapa…);
   - o catálogo de **3 conquistas**;
   - **3 usuários demo** já amigos, com capturas e reações, para o app abrir com conteúdo:

   | E-mail | Senha |
   | --- | --- |
   | `gedson@fishdex.app` | `pescaria123` |
   | `marina@fishdex.app` | `pescaria123` |
   | `caio@fishdex.app` | `pescaria123` |

6. Subir o servidor:

   ```bash
   npm run dev
   ```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT` no `.env`).

## Testes

```bash
npm test
```

Os testes usam `app.inject()` do Fastify (chamada HTTP simulada, sem precisar da porta aberta) e batem no banco de verdade — precisa do `docker compose up -d` rodando antes. Como criam espécies/usuários descartáveis no banco de dev, rode `npx tsx prisma/seed.ts` de novo (ou recrie o volume: `docker compose down -v && docker compose up -d && npx prisma migrate deploy`) antes de demonstrar o app.

## CI

Todo push e pull request roda automaticamente, via GitHub Actions (`.github/workflows/ci.yml`):

1. Instala as dependências
2. Gera o Prisma Client
3. Checa os tipos (`tsc --noEmit`)
4. Roda o lint
5. Sobe um Postgres descartável, aplica as migrations e o seed
6. Roda os testes

## Contrato da API

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| POST | `/auth/register` | não | cria conta, retorna `{ id, username, email }` |
| POST | `/auth/login` | não | autentica, retorna `{ token, user }` |
| GET | `/users/me` | sim | perfil do usuário logado |
| GET | `/users/:id` | sim | perfil de outro usuário |
| GET | `/users/:id/catches` | sim | capturas de um usuário (galeria do perfil, 30 mais recentes) |
| GET | `/users/:id/achievements` | sim | conquistas desbloqueadas por um usuário |
| GET | `/species` | não | catálogo de espécies, ordenado por `dexOrder` |
| GET | `/species/:id` | não | detalhe de uma espécie (com ficha técnica) |
| POST | `/uploads` | sim | envia a foto da captura (multipart, campo `file`, ≤ 8 MB, JPEG/PNG/WebP/HEIC), grava no banco e retorna `{ id, url, mimeType, sizeBytes, createdAt }` |
| GET | `/uploads/:id` | não | devolve os bytes da foto guardada no banco (`Content-Type` real, cache imutável) |
| GET | `/illustrations/:arquivo` | não | serve a ilustração SVG da espécie (estático, `public/illustrations/`) |
| POST | `/catches` | sim | registra uma captura, concede XP, checa conquistas. `photoUrl` deve ser a `url` de um upload do próprio usuário ainda não usado |
| GET | `/catches/me` | sim | capturas do usuário logado (enriquecidas); com `?page=&limit=` pagina |
| GET | `/catches/:id` | sim | detalhe de uma captura (enriquecida) |
| PUT | `/catches/:catchId/reaction` | sim | reage / troca reação numa captura |
| DELETE | `/catches/:catchId/reaction` | sim | remove a própria reação |
| POST | `/friendships` | sim | envia pedido de amizade (`{ targetUserId }`) |
| PATCH | `/friendships/:id/accept` | sim | aceita pedido (só quem recebeu) |
| PATCH | `/friendships/:id/block` | sim | bloqueia |
| GET | `/friendships` | sim | `{ friends, pendingSent, pendingReceived }` |
| GET | `/feed` | sim | capturas dos amigos, paginado (`?page=&limit=`) |
| GET | `/achievements` | não | catálogo de conquistas |
| GET | `/achievements/:id` | não | detalhe de uma conquista |

### Captura "enriquecida"

`GET /feed`, `GET /catches/me` e `GET /catches/:id` devolvem, além dos campos da captura, o que o app mobile usa direto na tela:

```jsonc
{
  "...": "campos normais da Catch",
  "authorUsername": "Marina Duarte",
  "authorLevel": 3,
  "authorAvatarUrl": null,
  "authorAvatarTone": ["#42264d", "#341e3d"], // gradiente determinístico do id
  "reactionCounts": { "FIRE": 2, "WOW": 1 },  // contagem por emoji
  "myReaction": "FIRE",                        // reação de quem está pedindo, ou null
  "isNewSpecies": true,                        // primeira captura dessa espécie pelo autor
  "mine": false                               // a captura é de quem está pedindo?
}
```

### Espécie (`GET /species` e `GET /species/:id`)

Devolve a linha inteira da espécie. Além de `name`, `scientificName`, `difficulty`, `baseXp`, `description` e da ficha técnica (`dexOrder`, `habitat`, `family`, `averageSizeCm`, `diet`, `baits`, `regions`, `mapPins`, `tone`), traz:

```jsonc
{
  "referenceImageUrl": "/illustrations/dourado.svg", // ilustração da carta (também vira a silhueta)
  "bestTime": "Manhã, em corredeiras e saídas de lagoa",
  "techniques": ["Meia-água com isca artificial"],
  "closedSeasons": [                                   // defeso, por região
    { "region": "Bacia do Paraná (SP/PR/MS/MG/GO)", "period": "1 nov – 28 fev", "rule": "Piracema: ..." }
  ],
  "tipsReviewed": false                                // dicas ainda não revisadas por pescador
}
```

`mapPins` tem um pino por região, na mesma ordem de `regions`: `x`/`y` em % sobre o mapa do Brasil do app (a partir de lat/lng reais) e `label` com o número da região (`"1"`, `"2"`…).

O catálogo é curado à mão em `prisma/data/species.ts`. `npm run gbif:check` confere nome científico, família e registros no Brasil na API da GBIF (só leitura).

### Perfil (`GET /users/me` e `GET /users/:id`)

Além de `id`, `username`, `email`, `level`, `xp`, `catchesBySpecies`, devolve `avatarUrl`, `handle` (derivado do username), `memberSince` (data de criação) e `avatarTone` (gradiente determinístico).

### Upload de fotos

As fotos ficam na tabela `media` do Postgres (coluna `bytea`), com o dono (`userId`), o tipo e o tamanho. O tipo é detectado pelos *magic bytes* do arquivo — o mimetype declarado pelo cliente é ignorado, então SVG ou um texto renomeado para `.jpg` são recusados com 400. O arquivo é lido inteiro em memória antes de gravar; se passar de 8 MB nada é salvo. A `url` devolvida (`/uploads/<id>`) é o que o app grava em `photoUrl` da captura.

Ao criar a captura, o backend confere a foto e a vincula (`Catch.mediaId`): `photoUrl` fora do formato `/uploads/<uuid>` ou de upload inexistente → 400; foto de outro usuário → 403; foto já usada em outra captura → 409. Nesses casos nenhum XP é concedido.

Fotos órfãs (enviadas e não usadas em captura por mais de 24h) são apagadas automaticamente: ao subir o servidor e de hora em hora. Para rodar manualmente: `npm run uploads:cleanup`.

```bash
curl -X POST http://localhost:3000/uploads \n  -H "Authorization: Bearer $TOKEN" \n  -F "file=@peixe.jpg"
```

### Status de erro

| Status | Quando |
| --- | --- |
| 400 | payload inválido (falha de validação zod), upload sem arquivo / formato não suportado (inclui SVG) / grande demais |
| 401 | token ausente/inválido, ou credenciais erradas no login |
| 403 | tentar aceitar/bloquear um pedido de amizade que você mesmo enviou; usar foto de outro usuário numa captura |
| 404 | recurso não encontrado |
| 409 | conflito (email/username já cadastrado, amizade duplicada, foto já usada em outra captura, etc.) |

## Arquitetura

Cada módulo em `src/modules/<nome>/` segue o mesmo padrão em camadas:

```
routes -> controller -> service -> repository -> Prisma
```

- **routes**: registra as rotas do Fastify e monta a cadeia de dependências do módulo.
- **controller**: valida request com o schema zod, chama o service, formata a resposta.
- **service**: regra de negócio. Não conhece o Fastify (nunca recebe `request`/`reply`).
- **repository**: única camada que fala com o Prisma.
- **schema**: schemas zod de entrada (body/params/query).

`src/shared/feed-catch.ts` (`toFeedCatches`) é o helper que enriquece capturas com autor + reações + "nova espécie", reusado por feed e catches. `src/shared/avatar-tone.ts` deriva o gradiente do avatar a partir do id.

Erros de negócio usam as classes de `src/shared/errors.ts` (`NotFoundError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`), tratadas centralmente pelo `errorHandler` em `src/middlewares/errorHandler.ts`.

## Integração com o app mobile

O app em `../PROJETO-INTEGRADOR FRONT 2026-2/mobile` consome esta API. Passo a passo de subir os dois juntos (Docker, IP da rede, `.env` do mobile, troubleshooting) em [INTEGRACAO.md](./INTEGRACAO.md).

## Instalar o app no celular (PWA via túnel HTTPS)

O app mobile também roda como **PWA**: dá para instalar pelo navegador do celular ("Instalar app" / "Adicionar à Tela de Início"). Duas regras do navegador mandam em tudo:

- **Só oferece instalar em HTTPS** (ou `localhost`). Pelo IP da rede (`http://192.168...`) no celular não aparece.
- **Só funciona no build de produção.** Com `npm start` (modo dev) o service worker não é registrado.

E, se o app estiver em HTTPS, a API também precisa estar (senão o navegador bloqueia as chamadas por conteúdo misto). Por isso usamos **dois túneis** do Cloudflare (gratuitos, sem conta): um para a API e um para o app.

```
Celular abre o app  ──►  túnel do front  ──►  PC :8080  (build web do app)
App pede os dados   ──►  túnel da API    ──►  PC :3000  ──►  Postgres (Docker :5433)
```

### Instalação (uma vez só)

```powershell
winget install --id Cloudflare.cloudflared
```

Abra um terminal novo depois de instalar. Se o comando `cloudflared` não for reconhecido, use o caminho completo: `& "C:\Program Files (x86)\cloudflared\cloudflared.exe"`.

### Ordem dos comandos (4 terminais)

Cada processo que fica rodando precisa do próprio terminal. **A ordem importa**: o build do app (terminal 3) precisa do endereço do túnel da API (terminal 2).

**Terminal 1 — banco + backend** (com o Docker Desktop aberto):

```powershell
cd "PROJETO-INTEGRADOR BACK 2026-2"
docker compose up -d
npx prisma migrate deploy   # só se o banco foi recriado ou há migration nova
npx prisma generate         # idem
npx tsx prisma/seed.ts      # idem (dados demo)
npm run dev                 # API em localhost:3000
```

**Terminal 2 — túnel da API:**

```powershell
cloudflared tunnel --url http://localhost:3000
```

Na saída aparece um endereço `https://<aleatorio>.trycloudflare.com`. **Copie** — ele vai no próximo passo.

**Terminal 3 — build e servidor do app:**

```powershell
cd "PROJETO-INTEGRADOR FRONT 2026-2/mobile"
$env:EXPO_PUBLIC_API_URL = "https://ENDERECO-DA-API.trycloudflare.com"
$env:EXPO_PUBLIC_USE_MOCKS = "false"
npx expo export -p web               # gera dist/ com o endereço da API embutido
npx serve dist --single -l 8080      # porta 8080 (a 3000 é do backend)
```

As linhas `$env:` valem só para esse terminal e têm prioridade sobre o `.env` do mobile — o arquivo não é alterado.

**Terminal 4 — túnel do app:**

```powershell
cloudflared tunnel --url http://localhost:8080
```

O endereço `https://<aleatorio>.trycloudflare.com` que aparecer aqui é o que se abre no celular.

### Instalando no celular

- **Android (Chrome):** menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**.

Login demo: `gedson@fishdex.app` / `pescaria123`.

### Cuidados

- **O PC precisa ficar ligado** com os 4 terminais rodando. Desligou, o app instalado abre mas não carrega dados.
- **Os endereços dos túneis mudam a cada vez que são reiniciados.** Como o endereço da API fica embutido no build, mudou o túnel da API → refazer o build (terminal 3) e reinstalar o app no celular. Para endereço fixo: túnel nomeado do Cloudflare (precisa de conta e domínio) ou deploy de verdade.
- **Catálogo com espécies "Especie teste…"**: são sobras do `npm test`. Para apresentar limpo, recrie o banco: `docker compose down -v && docker compose up -d && npx prisma migrate deploy && npx tsx prisma/seed.ts` (apaga todos os dados).
- **Para desligar:** `Ctrl+C` em cada terminal; `docker compose down` para parar o Postgres.
