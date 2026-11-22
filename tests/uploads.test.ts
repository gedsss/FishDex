import { describe, it, expect } from "vitest";
import { app } from "../app";
import { prisma } from "../prisma/prisma.client";
import { PNG_1PX, multipartFile as multipart, registerAndLogin } from "./helpers";
import { UploadsRepository } from "../src/modules/uploads/uploads.repository";
import { UploadsService } from "../src/modules/uploads/uploads.service";

async function upload(token: string | null, content: Buffer, filename: string, mimetype: string) {
    const { payload, headers } = multipart(content, filename, mimetype);
    return app.inject({
        method: "POST",
        url: "/uploads",
        payload,
        headers: token ? { ...headers, authorization: `Bearer ${token}` } : headers,
    });
}

describe("POST /uploads", () => {
    it("exige autenticacao", async () => {
        const response = await upload(null, PNG_1PX, "peixe.png", "image/png");
        expect(response.statusCode).toBe(401);
    });

    it("salva a imagem no banco e devolve a url", async () => {
        const { token, userId } = await registerAndLogin();

        const response = await upload(token, PNG_1PX, "peixe.png", "image/png");

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body.url).toBe(`/uploads/${body.id}`);
        expect(body.mimeType).toBe("image/png");
        expect(body.sizeBytes).toBe(PNG_1PX.length);

        const media = await prisma.media.findUnique({ where: { id: body.id } });
        expect(media?.userId).toBe(userId);
        expect(Buffer.from(media!.data).equals(PNG_1PX)).toBe(true);
    });

    it("usa o tipo real do conteudo, nao o declarado", async () => {
        const { token } = await registerAndLogin();

        const response = await upload(token, PNG_1PX, "foto.jpg", "image/jpeg");

        expect(response.statusCode).toBe(201);
        expect(response.json().mimeType).toBe("image/png");
    });

    it("recusa SVG", async () => {
        const { token } = await registerAndLogin();
        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

        const response = await upload(token, svg, "x.svg", "image/svg+xml");

        expect(response.statusCode).toBe(400);
    });

    it("recusa arquivo que nao e imagem disfarcado de .jpg", async () => {
        const { token } = await registerAndLogin();

        const response = await upload(token, Buffer.from("nao sou uma imagem"), "x.jpg", "image/jpeg");

        expect(response.statusCode).toBe(400);
    });

    it("recusa arquivo maior que 8 MB sem gravar nada", async () => {
        const { token, userId } = await registerAndLogin();
        const big = Buffer.concat([PNG_1PX, Buffer.alloc(8 * 1024 * 1024 + 1)]);

        const response = await upload(token, big, "grande.png", "image/png");

        expect(response.statusCode).toBe(400);
        expect(await prisma.media.count({ where: { userId } })).toBe(0);
    });

    it("recusa requisicao sem arquivo", async () => {
        const { token } = await registerAndLogin();

        const response = await app.inject({
            method: "POST",
            url: "/uploads",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(400);
        expect(response.statusCode).toBeLessThan(500);
    });
});

describe("GET /uploads/:id", () => {
    it("devolve os bytes da imagem com o content-type correto", async () => {
        const { token } = await registerAndLogin();
        const { id } = (await upload(token, PNG_1PX, "peixe.png", "image/png")).json();

        const response = await app.inject({ method: "GET", url: `/uploads/${id}` });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toBe("image/png");
        expect(response.headers["x-content-type-options"]).toBe("nosniff");
        expect(response.rawPayload.equals(PNG_1PX)).toBe(true);
    });

    it("retorna 404 para id inexistente", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/uploads/00000000-0000-0000-0000-000000000000",
        });

        expect(response.statusCode).toBe(404);
    });

    it("retorna 400 para id invalido", async () => {
        const response = await app.inject({ method: "GET", url: "/uploads/../../etc/passwd" });

        expect([400, 404]).toContain(response.statusCode);
    });
});

describe("limpeza de fotos orfas", () => {
    it("apaga so fotos sem captura e mais antigas que o prazo", async () => {
        const { token, userId } = await registerAndLogin();
        const day = 24 * 60 * 60 * 1000;
        const old = new Date(Date.now() - 2 * day);

        // Órfã antiga → deve sumir.
        const orphanOld = (await upload(token, PNG_1PX, "a.png", "image/png")).json();
        // Órfã recente → fica (usuário ainda pode estar no formulário).
        const orphanNew = (await upload(token, PNG_1PX, "b.png", "image/png")).json();
        // Antiga mas usada numa captura → fica.
        const used = (await upload(token, PNG_1PX, "c.png", "image/png")).json();
        const species = await prisma.species.findFirstOrThrow();
        const created = await app.inject({
            method: "POST",
            url: "/catches",
            headers: { authorization: `Bearer ${token}` },
            payload: { speciesId: species.id, photoUrl: used.url, capturedAt: new Date().toISOString() },
        });
        expect(created.statusCode).toBe(201);

        await prisma.media.updateMany({
            where: { id: { in: [orphanOld.id, used.id] } },
            data: { createdAt: old },
        });

        await new UploadsService(new UploadsRepository()).cleanupOrphans(day);

        const remaining = await prisma.media.findMany({ where: { userId }, select: { id: true } });
        const ids = remaining.map(m => m.id).sort();
        expect(ids).toEqual([orphanNew.id, used.id].sort());
    });
});
