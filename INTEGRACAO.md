# Integração — backend + app mobile

Como subir a stack completa do FishDex (API Fastify + app Expo) rodando com dados
reais do Postgres, sem mocks.

Os dois projetos são repositórios separados, lado a lado:

```
FACULDADE/
├── PROJETO-INTEGRADOR BACK 2026-2/     # esta API
└── PROJETO-INTEGRADOR FRONT 2026-2/
    └── mobile/                         # o app Expo
```

---

## 1. Backend

```bash
cd "PROJETO-INTEGRADOR BACK 2026-2"

docker compose up -d            # Postgres na porta 5433 do host
cp .env.example .env            # já vem com a porta 5433 e PORT=3000
npm install
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts          # 12 espécies + conquistas + 3 usuários demo
npm run dev                     # sobe em http://localhost:3000
```

Teste rápido: `curl http://localhost:3000/species` deve devolver 12 espécies.

### Usuários demo (criados pelo seed)

| E-mail | Senha | Papel |
| --- | --- | --- |
| `gedson@fishdex.app` | `pescaria123` | login principal — já é amigo da Marina e do Caio, tem capturas e feed cheio |
| `marina@fishdex.app` | `pescaria123` | amiga |
| `caio@fishdex.app` | `pescaria123` | amigo |

> Rodou `npm test`? Os testes criam espécies/usuários descartáveis no banco de
> dev. Para o app abrir limpo, recrie o banco:
> `docker compose down -v && docker compose up -d && npx prisma migrate deploy && npx tsx prisma/seed.ts`

---

## 2. Descobrir o IP da máquina

O app roda no navegador **ou** no celular (Expo Go). No celular, `localhost` aponta
para o próprio aparelho — é preciso o IP da máquina que roda o backend, na mesma
rede Wi-Fi.

- **Windows**: `ipconfig` → "Endereço IPv4" do adaptador Wi-Fi/Ethernet (algo como `192.168.x.x`).
- **macOS/Linux**: `ifconfig` ou `ip addr`.

No navegador, na mesma máquina do backend, `http://localhost:3000` também serve.

---

## 3. App mobile

```bash
cd "PROJETO-INTEGRADOR FRONT 2026-2/mobile"

cp .env.example .env
```

Edite o `.env`:

```bash
EXPO_PUBLIC_API_URL=http://SEU-IP:3000     # ex.: http://192.168.18.42:3000
EXPO_PUBLIC_USE_MOCKS=false                # false = fala com o backend de verdade
```

Depois:

```bash
npm install
npm start
```

- Pressione **`w`** para abrir no navegador, ou
- escaneie o QR code com o app **Expo Go** no celular.

Faça login com `gedson@fishdex.app` / `pescaria123`.

---

## 4. O que dá pra fazer com dados reais

| Tela | Vem do backend |
| --- | --- |
| Catálogo / Coleção | `GET /species` (12 espécies com ficha técnica), progresso do Dex a partir de `GET /users/me` |
| Ficha da espécie | `GET /species/:id` — família, habitat, tamanho, dieta, iscas, mapa de ocorrência, seus registros |
| Novo registro | foto sobe via `POST /uploads`, captura via `POST /catches`; XP e nível sobem na hora |
| Feed › Amigos | `GET /feed` — capturas da Marina e do Caio com nome, nível, contadores de reação |
| Feed › Minhas | `GET /catches/me?page=&limit=` |
| Reagir | `PUT`/`DELETE /catches/:id/reaction` — contador atualiza |
| Perfil | XP, conquistas (`GET /users/:id/achievements`), diário de pesca |
| Perfil de amigo | nível, conquistas, **galeria de capturas** (`GET /users/:id/catches`), contagem por espécie |
| Amigos | `GET /friendships`, `POST /friendships`, `PATCH .../accept` |

---

## 5. Troubleshooting

| Sintoma | Causa provável / solução |
| --- | --- |
| App trava em "Carregando…" / erro de rede | Backend não está no ar, ou `EXPO_PUBLIC_API_URL` com IP errado. Confirme `curl http://SEU-IP:3000/species` do **celular** (navegador do aparelho). |
| Funciona no navegador, não no celular | `localhost` no `.env` em vez do IP da rede; ou firewall do Windows bloqueando a porta 3000 (libere para Node.js na rede privada); ou aparelho em rede diferente. |
| `401` / cai pro login sozinho | Token expirou ou o `JWT_SECRET` do `.env` mudou depois do login. Faça login de novo. |
| Catálogo vazio | Seed não rodou: `npx tsx prisma/seed.ts`. |
| Feed "Amigos" vazio no login demo | Banco recriado sem re-seed — o seed é quem cria as amizades. Rode o seed. |
| Foto da captura não aparece (web) | O backend guarda `/uploads/x.jpg` (caminho relativo); o app prefixa `EXPO_PUBLIC_API_URL` via `src/utils/photo.ts`. Confira que a URL da API está certa. |
| Mudou a porta do Postgres | Ajuste `docker-compose.yml` **e** `DATABASE_URL` no `.env` juntos, e recrie: `docker compose down -v && docker compose up -d`. |
| `docker compose up` falha por conflito de nome/porta | Outro container `fishdex-postgres` ou algo na 5433. `docker rm -f fishdex-postgres` e/ou troque a porta. |

---

## 6. Modo demo (sem backend)

Só para navegar pelas telas sem subir nada: no `.env` do mobile, `EXPO_PUBLIC_USE_MOCKS=true`.
Aí o app usa dados fictícios em memória (`src/api/mock/`) e qualquer e-mail/senha loga.
