import { describe, it, expect } from "vitest";
import { app } from "../app";
import { registerAndLogin, createTestSpecies } from "./helpers";

async function createCatch(token: string) {
    const species = await createTestSpecies();

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

    return response.json().id as string;
}

describe("PUT /catches/:catchId/reaction", () => {
    it("retorna 401 sem token", async () => {
        const response = await app.inject({
            method: "PUT",
            url: "/catches/00000000-0000-0000-0000-000000000000/reaction",
            payload: { emoji: "LIKE" },
        });

        expect(response.statusCode).toBe(401);
    });

    it("retorna 400 para emoji invalido", async () => {
        const { token } = await registerAndLogin();
        const catchId = await createCatch(token);

        const response = await app.inject({
            method: "PUT",
            url: `/catches/${catchId}/reaction`,
            headers: { authorization: `Bearer ${token}` },
            payload: { emoji: "NAO_EXISTE" },
        });

        expect(response.statusCode).toBe(400);
    });

    it("reage a uma captura", async () => {
        const { token } = await registerAndLogin();
        const catchId = await createCatch(token);

        const response = await app.inject({
            method: "PUT",
            url: `/catches/${catchId}/reaction`,
            headers: { authorization: `Bearer ${token}` },
            payload: { emoji: "LIKE" },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().emoji).toBe("LIKE");
    });

    it("troca a reacao em vez de duplicar", async () => {
        const { token } = await registerAndLogin();
        const catchId = await createCatch(token);

        await app.inject({
            method: "PUT",
            url: `/catches/${catchId}/reaction`,
            headers: { authorization: `Bearer ${token}` },
            payload: { emoji: "LIKE" },
        });

        const response = await app.inject({
            method: "PUT",
            url: `/catches/${catchId}/reaction`,
            headers: { authorization: `Bearer ${token}` },
            payload: { emoji: "FIRE" },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().emoji).toBe("FIRE");
    });
});

describe("DELETE /catches/:catchId/reaction", () => {
    it("remove a propria reacao", async () => {
        const { token } = await registerAndLogin();
        const catchId = await createCatch(token);

        await app.inject({
            method: "PUT",
            url: `/catches/${catchId}/reaction`,
            headers: { authorization: `Bearer ${token}` },
            payload: { emoji: "LIKE" },
        });

        const response = await app.inject({
            method: "DELETE",
            url: `/catches/${catchId}/reaction`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(204);
    });

    it("retorna 404 ao remover reacao que nao existe", async () => {
        const { token } = await registerAndLogin();
        const catchId = await createCatch(token);

        const response = await app.inject({
            method: "DELETE",
            url: `/catches/${catchId}/reaction`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(404);
    });
});
