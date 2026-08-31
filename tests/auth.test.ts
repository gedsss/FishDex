import { describe, it, expect } from "vitest";
import { app } from "../app";

describe("POST /auth/register", () => {
    it("cria um usuario novo", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/auth/register",
            payload: {
                username: "teste_" + Date.now(),
                email: `teste_${Date.now()}@example.com`,
                password: "123456",
            },
        });

        expect(response.statusCode).toBe(201);
    });

    it("retorna erro ao registrar com email ja usado", async () => {
        const email = `duplicado_${Date.now()}@example.com`;

        await app.inject({
            method: "POST",
            url: "/auth/register",
            payload: {
                username: "primeiro_" + Date.now(),
                email,
                password: "123456",
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/auth/register",
            payload: {
                username: "segundo_" + Date.now(),
                email,
                password: "123456",
            },
        });

        expect(response.statusCode).toBe(409);
    });
});

describe("POST /auth/login", () => {
    it("loga com credenciais corretas e retorna um token", async () => {
        const email = `login_${Date.now()}@example.com`;
        const password = "123456";

        await app.inject({
            method: "POST",
            url: "/auth/register",
            payload: {
                username: "loginuser_" + Date.now(),
                email,
                password,
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email, password },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().token).toBeDefined();
    });

    it("retorna 401 com senha errada", async () => {
        const email = `senhaerrada_${Date.now()}@example.com`;

        await app.inject({
            method: "POST",
            url: "/auth/register",
            payload: {
                username: "senhaerrada_" + Date.now(),
                email,
                password: "123456",
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email, password: "senhaerrada" },
        });

        expect(response.statusCode).toBe(401);
    });
});
