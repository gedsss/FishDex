import { describe, it, expect } from "vitest";
import { app } from "../app";
import { registerAndLogin, createTestSpecies } from "./helpers";

describe("GET /feed", () => {
    it("retorna 401 sem token", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/feed",
        });

        expect(response.statusCode).toBe(401);
    });

    it("retorna vazio sem amigos aceitos", async () => {
        const { token } = await registerAndLogin();

        const response = await app.inject({
            method: "GET",
            url: "/feed",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().length).toBe(0);
    });

    it("mostra captura de amigo aceito", async () => {
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();

        const sendResponse = await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userB.userId },
        });
        const friendshipId = sendResponse.json().id;

        await app.inject({
            method: "PATCH",
            url: `/friendships/${friendshipId}/accept`,
            headers: { authorization: `Bearer ${userB.token}` },
        });

        const species = await createTestSpecies();
        await app.inject({
            method: "POST",
            url: "/catches",
            headers: { authorization: `Bearer ${userB.token}` },
            payload: {
                speciesId: species.id,
                photoUrl: "http://foto.com/1.png",
                capturedAt: new Date().toISOString(),
            },
        });

        const response = await app.inject({
            method: "GET",
            url: "/feed",
            headers: { authorization: `Bearer ${userA.token}` },
        });

        expect(response.statusCode).toBe(200);
        const feed = response.json();
        expect(feed.length).toBe(1);
        expect(feed[0].userId).toBe(userB.userId);
    });
});
