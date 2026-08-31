import { describe, it, expect } from "vitest";
import { app } from "../app";
import { registerAndLogin, createTestSpecies } from "./helpers";

describe("GET /achievements", () => {
    it("lista o catalogo de conquistas", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/achievements",
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.length).toBeGreaterThanOrEqual(3);
        expect(body.some((a: { code: string }) => a.code === "FIRST_CATCH")).toBe(true);
    });
});

describe("GET /achievements/:id", () => {
    it("retorna 404 para id inexistente", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/achievements/00000000-0000-0000-0000-000000000000",
        });

        expect(response.statusCode).toBe(404);
    });
});

describe("GET /users/:id/achievements", () => {
    it("retorna 401 sem token", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/users/00000000-0000-0000-0000-000000000000/achievements",
        });

        expect(response.statusCode).toBe(401);
    });

    it("usuario novo nao tem conquista nenhuma", async () => {
        const { token, userId } = await registerAndLogin();

        const response = await app.inject({
            method: "GET",
            url: `/users/${userId}/achievements`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().length).toBe(0);
    });

    it("desbloqueia FIRST_CATCH na primeira captura", async () => {
        const { token, userId } = await registerAndLogin();
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
            url: `/users/${userId}/achievements`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        const codes = response.json().map((a: { code: string }) => a.code);
        expect(codes).toContain("FIRST_CATCH");
    });
});
