# FishDex

App de pescaria estilo Pokédex. O usuário registra capturas de peixes, ganha XP e sobe de nível, e interage com amigos através de um feed com reações e conquistas.

Contexto completo de produto e decisões de modelagem em [CLAUDE.md](./CLAUDE.md). Plano de execução e checklist de fases em [SERVIDOR.md](./SERVIDOR.md).

## Stack

- Node.js + Fastify
- TypeScript
- PostgreSQL via Docker
- Prisma 7 (com driver adapter `@prisma/adapter-pg`)
- zod (validação)
- bcrypt (hash de senha)
- `@fastify/jwt` (autenticação)
- Vitest (testes)
- Biome (lint/format)

## Rodando localmente

1. Subir o banco:

   ```bash
   docker compose up -d
   ```

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

5. Popular o catálogo de conquistas:

   ```bash
   npx tsx prisma/seed.ts
   ```

6. Subir o servidor:

   ```bash
   npm run dev
   ```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT` no `.env`).

## Testes

```bash
npm test
```

Os testes usam `app.inject()` do Fastify (chamada HTTP simulada, sem precisar da porta aberta) e batem no banco de verdade — precisa do `docker compose up -d` rodando antes.

## CI

Todo push e pull request roda automaticamente, via GitHub Actions (`.github/workflows/ci.yml`):

1. Instala as dependências
2. Checa os tipos (`tsc --noEmit`)
3. Roda o lint (Biome)
4. Sobe um Postgres descartável, aplica as migrations e o seed
5. Roda os testes

## Contrato da API

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| POST | `/auth/register` | não | cria conta |
| POST | `/auth/login` | não | autentica, retorna JWT |
| GET | `/users/me` | sim | dados do usuário logado |
| GET | `/users/:id` | sim | perfil de outro usuário |
| GET | `/species` | não | catálogo de espécies |
| GET | `/species/:id` | não | detalhe de uma espécie |
| POST | `/catches` | sim | registra uma captura, concede XP |
| GET | `/catches/me` | sim | capturas do usuário logado |
| GET | `/catches/:id` | sim | detalhe de uma captura |
| PUT | `/catches/:catchId/reaction` | sim | reage/troca reação numa captura |
| DELETE | `/catches/:catchId/reaction` | sim | remove a própria reação |
| POST | `/friendships` | sim | envia pedido de amizade |
| PATCH | `/friendships/:id/accept` | sim | aceita pedido (só quem recebeu) |
| PATCH | `/friendships/:id/block` | sim | bloqueia |
| GET | `/friendships` | sim | lista amigos aceitos + pedidos pendentes |
| GET | `/feed` | sim | capturas dos amigos, paginado (`?page=&limit=`) |
| GET | `/achievements` | não | catálogo de conquistas |
| GET | `/achievements/:id` | não | detalhe de uma conquista |
| GET | `/users/:id/achievements` | sim | conquistas desbloqueadas por um usuário |

### Status de erro

| Status | Quando |
| --- | --- |
| 400 | payload inválido (falha de validação zod) |
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

Erros de negócio usam as classes de `src/shared/errors.ts` (`NotFoundError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`), tratadas centralmente pelo `errorHandler` em `src/middlewares/errorHandler.ts`.
