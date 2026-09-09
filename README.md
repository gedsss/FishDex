# FishDex — API

App de pescaria estilo Pokédex. O usuário registra capturas de peixes, ganha XP e sobe de nível, e interage com amigos através de um feed com reações e conquistas.

Contexto completo de produto e decisões de modelagem em [CLAUDE.md](./CLAUDE.md). Plano de execução e checklist de fases em [SERVIDOR.md](./SERVIDOR.md). Guia de subir backend + app mobile juntos em [INTEGRACAO.md](./INTEGRACAO.md).

## Stack

- Node.js + Fastify
- TypeScript
- PostgreSQL via Docker
- Prisma 7 (com driver adapter `@prisma/adapter-pg`)
- zod (validação)
- bcrypt (hash de senha)
- `@fastify/jwt` (autenticação)
- `@fastify/multipart` + `@fastify/static` (upload e entrega das fotos de captura)
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
| POST | `/uploads` | sim | envia a foto da captura (multipart, campo `file`, ≤ 8 MB), retorna `{ url }` |
| GET | `/uploads/:arquivo` | não | serve a foto enviada (estático) |
| POST | `/catches` | sim | registra uma captura, concede XP, checa conquistas |
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

### Perfil (`GET /users/me` e `GET /users/:id`)

Além de `id`, `username`, `email`, `level`, `xp`, `catchesBySpecies`, devolve `avatarUrl`, `handle` (derivado do username), `memberSince` (data de criação) e `avatarTone` (gradiente determinístico).

### Status de erro

| Status | Quando |
| --- | --- |
| 400 | payload inválido (falha de validação zod), upload sem arquivo / não-imagem / grande demais |
| 401 | token ausente/inválido, ou credenciais erradas no login |
| 403 | tentar aceitar/bloquear um pedido de amizade que você mesmo enviou |
| 404 | recurso não encontrado |
| 409 | conflito (email/username já cadastrado, amizade duplicada, etc.) |

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
