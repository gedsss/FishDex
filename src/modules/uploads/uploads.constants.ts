export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

// Foto enviada e não usada em nenhuma captura depois desse prazo é apagada.
// O prazo cobre o usuário que envia a foto e demora para terminar o formulário.
export const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Intervalo da limpeza automática de órfãs (ver server.ts).
export const ORPHAN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000

// Formatos de foto aceitos. O tipo é detectado pelos magic bytes do conteúdo
// (ver detectImageMime em uploads.service.ts) — o mimetype que o cliente
// declara no multipart é ignorado, então um .svg ou um texto renomeado para
// .jpg não passa.
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]
