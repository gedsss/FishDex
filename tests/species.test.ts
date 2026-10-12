import { describe, it, expect } from "vitest";
import { app } from "../app";
import { prisma } from "../prisma/prisma.client";
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

    it("retorna as dicas de pesca da especie", async () => {
        const species = await createTestSpecies();
        const closedSeasons = [
            { region: "Bacia do Paraná", period: "1 nov – 28 fev", rule: "Piracema" },
        ];

        await prisma.species.update({
            where: { id: species.id },
            data: {
                bestTime: "Amanhecer",
                techniques: ["Isca de superfície"],
                closedSeasons,
            },
        });

        const response = await app.inject({
            method: "GET",
            url: "/species/" + species.id,
        });

        const body = response.json();
        expect(response.statusCode).toBe(200);
        expect(body.bestTime).toBe("Amanhecer");
        expect(body.techniques).toEqual(["Isca de superfície"]);
        expect(body.closedSeasons).toEqual(closedSeasons);
        expect(body.tipsReviewed).toBe(false);
    });
});

describe("GET /illustrations/:file", () => {
    it("serve a ilustracao em svg", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/illustrations/dourado.svg",
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("image/svg+xml");
    });
});
