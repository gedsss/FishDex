import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Pasta onde as fotos de captura ficam salvas (gitignorada). Fica na raiz do
// projeto, ao lado de package.json.
export const UPLOADS_DIR = join(process.cwd(), 'uploads')

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

// Garante que a pasta existe antes de o @fastify/static apontar para ela.
mkdirSync(UPLOADS_DIR, { recursive: true })
