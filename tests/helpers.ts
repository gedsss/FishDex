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

// PNG 1x1 válido, usado como foto de captura nos testes.
export const PNG_1PX = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
);

export function multipartFile(content: Buffer, filename: string, mimetype: string) {
    const boundary = "----fishdexboundary" + Math.random().toString(16).slice(2);
    const payload = Buffer.concat([
        Buffer.from(
            `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
                `Content-Type: ${mimetype}\r\n\r\n`,
        ),
        content,
        Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    return {
        payload,
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    };
}

// Faz o upload de uma foto e devolve a url ("/uploads/<id>") para usar em
// POST /catches.
export async function uploadTestPhoto(token: string): Promise<string> {
    const { payload, headers } = multipartFile(PNG_1PX, "peixe.png", "image/png");
    const response = await app.inject({
        method: "POST",
        url: "/uploads",
        payload,
        headers: { ...headers, authorization: `Bearer ${token}` },
    });
    return response.json().url;
}
