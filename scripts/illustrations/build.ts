// Gera public/illustrations/<espécie>.svg no estilo "adesivo realista".
// Uso: npm run illustrations
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SPECIES } from '../../prisma/data/species'
import { renderFish } from './render'
import { SPECIES_ART } from './species-art'

const outDir = join(process.cwd(), 'public', 'illustrations')
mkdirSync(outDir, { recursive: true })

const byId = new Map(SPECIES_ART.map(art => [art.id, art]))
const missing = SPECIES.map(s => s.illustration).filter(id => !byId.has(id))
if (missing.length) {
  console.error(`Sem arte para: ${missing.join(', ')}`)
  process.exit(1)
}

for (const art of SPECIES_ART) {
  const svg = renderFish(art)
  writeFileSync(join(outDir, `${art.id}.svg`), svg)
  console.log(`${art.id}.svg  ${(svg.length / 1024).toFixed(1)} KB`)
}
console.log(`${SPECIES_ART.length} ilustrações geradas em ${outDir}`)
