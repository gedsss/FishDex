import { describe, it, expect } from "vitest";
import { app } from "../app";
import { registerAndLogin } from "./helpers";

describe("POST /friendships", () => {
    it("retorna 401 sem token", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/friendships",
            payload: { targetUserId: "00000000-0000-0000-0000-000000000000" },
        });

        expect(response.statusCode).toBe(401);
    });

    it("nao deixa adicionar a si mesmo", async () => {
        const userA = await registerAndLogin();

        const response = await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userA.userId },
        });

        expect(response.statusCode).toBe(409);
    });

    it("envia um pedido de amizade", async () => {
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();

        const response = await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userB.userId },
        });

        expect(response.statusCode).toBe(201);
    });

    it("nao deixa duplicar pedido pro mesmo par", async () => {
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();

        await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userB.userId },
        });

        const response = await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userB.userId },
        });

        expect(response.statusCode).toBe(409);
    });
});

describe("PATCH /friendships/:id/accept", () => {
    it("nao deixa quem pediu aceitar o proprio pedido", async () => {
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();

        const sendResponse = await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userB.userId },
        });

        const friendshipId = sendResponse.json().id;

        const response = await app.inject({
            method: "PATCH",
            url: `/friendships/${friendshipId}/accept`,
            headers: { authorization: `Bearer ${userA.token}` },
        });

        expect(response.statusCode).toBe(403);
    });

    it("deixa quem recebeu aceitar o pedido", async () => {
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();

        const sendResponse = await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userB.userId },
        });

        const friendshipId = sendResponse.json().id;

        const response = await app.inject({
            method: "PATCH",
            url: `/friendships/${friendshipId}/accept`,
            headers: { authorization: `Bearer ${userB.token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().status).toBe("ACCEPTED");
    });
});

describe("GET /friendships", () => {
    it("lista amigos aceitos e pedidos pendentes", async () => {
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();

        await app.inject({
            method: "POST",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
            payload: { targetUserId: userB.userId },
        });

        const response = await app.inject({
            method: "GET",
            url: "/friendships",
            headers: { authorization: `Bearer ${userA.token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().pendingSent.length).toBe(1);
    });
});
