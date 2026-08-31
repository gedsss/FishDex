import { describe, it, expect } from "vitest";
import { app } from "../app";
import { registerAndLogin, createTestSpecies } from "./helpers";

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
                photoUrl: "http://foto.com/1.png",
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
                photoUrl: "http://foto.com/1.png",
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
                photoUrl: "http://foto.com/1.png",
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
