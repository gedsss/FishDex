import { app } from "../app";
import { prisma } from "../prisma/prisma.client";

export async function registerAndLogin() {
    const suffix = Date.now() + "_" + Math.floor(Math.random() * 100000);
    const email = `user_${suffix}@example.com`;
    const password = "123456";

    await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
            username: "user_" + suffix,
            email,
            password,
        },
    });

    const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password },
    });

    const body = loginResponse.json();

    return { token: body.token as string, userId: body.user.id as string };
}

export async function createTestSpecies(baseXp = 10) {
    const suffix = Date.now() + "_" + Math.floor(Math.random() * 100000);

    const species = await prisma.species.create({
        data: {
            name: "Especie teste " + suffix,
            difficulty: "EASY",
            baseXp,
        },
    });

    return species;
}
