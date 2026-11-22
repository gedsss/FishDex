import { describe, it, expect } from "vitest";
import { app } from "../app";
import { prisma } from "../prisma/prisma.client";
import { registerAndLogin, createTestSpecies, uploadTestPhoto } from "./helpers";

describe("POST /catches", () => {
    it("retorna 401 sem token", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/catches",
            payload: {},
        });

        expect(response.statusCode).toBe(401);
    });

    it("cria uma captura e concede o xp da especie", async () => {
        const { token } = await registerAndLogin();
        const species = await createTestSpecies(50);

        const response = await app.inject({
            method: "POST",
            url: "/catches",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                speciesId: species.id,
                photoUrl: await uploadTestPhoto(token),
                capturedAt: new Date().toISOString(),
            },
        });

        expect(response.statusCode).toBe(201);
        expect(response.json().xpAwarded).toBe(50);
    });

    it("retorna 404 para especie inexistente", async () => {
        const { token } = await registerAndLogin();

        const response = await app.inject({
            method: "POST",
            url: "/catches",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                speciesId: "00000000-0000-0000-0000-000000000000",
                photoUrl: await uploadTestPhoto(token),
                capturedAt: new Date().toISOString(),
            },
        });

        expect(response.statusCode).toBe(404);
    });
});

describe("GET /catches/me", () => {
    it("lista as capturas do usuario logado", async () => {
        const { token } = await registerAndLogin();
        const species = await createTestSpecies();

        await app.inject({
            method: "POST",
            url: "/catches",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                speciesId: species.id,
                photoUrl: await uploadTestPhoto(token),
                capturedAt: new Date().toISOString(),
            },
        });

        const response = await app.inject({
            method: "GET",
            url: "/catches/me",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().length).toBe(1);
    });
});

describe("GET /catches/:id", () => {
    it("retorna 404 para id inexistente", async () => {
        const { token } = await registerAndLogin();

        const response = await app.inject({
            method: "GET",
            url: "/catches/00000000-0000-0000-0000-000000000000",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(404);
    });
});

describe("POST /catches — validacao da foto", () => {
    async function createCatch(token: string, photoUrl: string) {
        const species = await createTestSpecies();
        return app.inject({
            method: "POST",
            url: "/catches",
            headers: { authorization: `Bearer ${token}` },
            payload: { speciesId: species.id, photoUrl, capturedAt: new Date().toISOString() },
        });
    }

    it("vincula a foto enviada a captura", async () => {
        const { token } = await registerAndLogin();
        const photoUrl = await uploadTestPhoto(token);

        const response = await createCatch(token, photoUrl);

        expect(response.statusCode).toBe(201);
        expect(response.json().photoUrl).toBe(photoUrl);
        expect(response.json().mediaId).toBe(photoUrl.split("/").pop());
    });

    it("recusa url externa", async () => {
        const { token } = await registerAndLogin();

        const response = await createCatch(token, "http://foto.com/1.png");

        expect(response.statusCode).toBe(400);
    });

    it("recusa upload inexistente", async () => {
        const { token } = await registerAndLogin();

        const response = await createCatch(token, "/uploads/00000000-0000-0000-0000-000000000000");

        expect(response.statusCode).toBe(400);
    });

    it("recusa foto enviada por outro usuario", async () => {
        const owner = await registerAndLogin();
        const other = await registerAndLogin();
        const photoUrl = await uploadTestPhoto(owner.token);

        const response = await createCatch(other.token, photoUrl);

        expect(response.statusCode).toBe(403);
    });

    it("recusa reaproveitar a mesma foto em outra captura", async () => {
        const { token } = await registerAndLogin();
        const photoUrl = await uploadTestPhoto(token);

        expect((await createCatch(token, photoUrl)).statusCode).toBe(201);
        const second = await createCatch(token, photoUrl);

        expect(second.statusCode).toBe(409);
    });

    it("nao concede XP quando a foto e invalida", async () => {
        const { token, userId } = await registerAndLogin();

        await createCatch(token, "/uploads/00000000-0000-0000-0000-000000000000");

        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
        expect(user.xp).toBe(0);
    });
});
