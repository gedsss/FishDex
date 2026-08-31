export const ACHIEVEMENT_CODES = {
  FIRST_CATCH: 'FIRST_CATCH',
  TEN_SPECIES: 'TEN_SPECIES',
  FIRST_LEGENDARY: 'FIRST_LEGENDARY',
} as const

export const ACHIEVEMENT_CATALOG = [
  {
    code: ACHIEVEMENT_CODES.FIRST_CATCH,
    name: 'Primeira Captura',
    description: 'Registrou sua primeira captura.',
  },
  {
    code: ACHIEVEMENT_CODES.TEN_SPECIES,
    name: 'Colecionador',
    description: 'Capturou 10 espécies diferentes.',
  },
  {
    code: ACHIEVEMENT_CODES.FIRST_LEGENDARY,
    name: 'Lendário',
    description:
      'Capturou uma espécie de dificuldade LEGENDARY pela primeira vez.',
  },
]
