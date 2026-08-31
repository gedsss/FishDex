import { describe, it, expect } from "vitest";
import { app } from "../app";
import { registerAndLogin } from "./helpers";

describe("GET /users/me", () => {
    it("retorna 401 sem token", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/users/me",
        });

        expect(response.statusCode).toBe(401);
    });

    it("retorna o perfil do usuario logado", async () => {
        const { token } = await registerAndLogin();

        const response = await app.inject({
            method: "GET",
            url: "/users/me",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.username).toBeDefined();
        expect(body.passwordHash).toBeUndefined();
    });
});

describe("GET /users/:id", () => {
    it("retorna o perfil de outro usuario", async () => {
        const { token } = await registerAndLogin();
        const other = await registerAndLogin();

        const response = await app.inject({
            method: "GET",
            url: "/users/" + other.userId,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().id).toBe(other.userId);
    });

    it("retorna 404 para id inexistente", async () => {
        const { token } = await registerAndLogin();

        const response = await app.inject({
            method: "GET",
            url: "/users/00000000-0000-0000-0000-000000000000",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(404);
    });
});
