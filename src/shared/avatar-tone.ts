// Paleta de gradientes para o avatar/placeholder do usuário no app mobile.
// O backend não guarda uma cor por usuário — deriva uma de forma determinística
// a partir do id, para que o mesmo usuário tenha sempre o mesmo tom em qualquer
// tela (feed, perfil, lista de amigos) sem precisar de coluna nova.
const AVATAR_TONES: [string, string][] = [
  ['#0a3d4a', '#073040'],
  ['#1b3f54', '#153446'],
  ['#134539', '#0e392f'],
  ['#42264d', '#341e3d'],
  ['#5b4614', '#4a3a11'],
  ['#2f4522', '#26381c'],
  ['#3e3120', '#32281a'],
  ['#182c52', '#132444'],
]

export function avatarToneFor(id: string): [string, string] {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % AVATAR_TONES.length
  return AVATAR_TONES[index]
}
