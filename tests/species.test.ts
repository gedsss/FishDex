import { describe, it, expect } from "vitest";
import { app } from "../app";
import { createTestSpecies } from "./helpers";

describe("GET /species", () => {
    it("lista as especies", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/species",
        });

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.json())).toBe(true);
    });
});

describe("GET /species/:id", () => {
    it("retorna a especie pelo id", async () => {
        const species = await createTestSpecies();

        const response = await app.inject({
            method: "GET",
            url: "/species/" + species.id,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().id).toBe(species.id);
    });

    it("retorna 404 para id inexistente", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/species/00000000-0000-0000-0000-000000000000",
        });

        expect(response.statusCode).toBe(404);
    });
});
