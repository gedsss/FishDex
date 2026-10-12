import { SPECIES, type SpeciesSeed } from '../prisma/data/species'

const GBIF_API = 'https://api.gbif.org/v1'

interface GbifMatch {
  usageKey?: number
  acceptedUsageKey?: number
  canonicalName?: string
  species?: string
  family?: string
  matchType: string
  status?: string
}

interface GbifOccurrenceSearch {
  count: number
  facets: { counts: { name: string; count: number }[] }[]
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GBIF respondeu ${response.status} em ${url}`)
  }
  return (await response.json()) as T
}

async function checkSpecies(species: SpeciesSeed) {
  const name = encodeURIComponent(species.scientificName)
  const match = await getJson<GbifMatch>(
    `${GBIF_API}/species/match?scientificName=${name}&kingdom=Animalia`
  )

  const problems: string[] = []
  if (match.matchType !== 'EXACT') {
    problems.push(`match ${match.matchType}`)
  }
  if (match.canonicalName && match.canonicalName !== species.scientificName) {
    problems.push(`GBIF achou "${match.canonicalName}"`)
  }
  if (match.status === 'SYNONYM') {
    problems.push(`sinônimo de "${match.species}"`)
  }
  if (match.family !== species.family) {
    problems.push(`família na GBIF: ${match.family ?? '?'}`)
  }

  let recordsInBrazil = 0
  let topStates = ''
  if (match.usageKey) {
    const taxonKey = match.acceptedUsageKey ?? match.usageKey
    const occurrences = await getJson<GbifOccurrenceSearch>(
      `${GBIF_API}/occurrence/search?taxonKey=${taxonKey}&country=BR&limit=0&facet=stateProvince&facetLimit=6`
    )
    recordsInBrazil = occurrences.count
    const counts = occurrences.facets[0]?.counts ?? []
    topStates = counts.map(state => `${state.name} (${state.count})`).join(', ')
  }

  let status = 'OK'
  if (problems.length > 0) {
    status = 'DIVERGE'
  } else if (recordsInBrazil === 0) {
    status = 'SEM REGISTRO NO BR'
  }

  return { status, problems, recordsInBrazil, topStates }
}

async function main() {
  let okCount = 0

  for (const species of SPECIES) {
    const result = await checkSpecies(species)
    if (result.status === 'OK') {
      okCount++
    }

    console.log(`[${result.status}] ${species.name} — ${species.scientificName}`)
    for (const problem of result.problems) {
      console.log(`    ! ${problem}`)
    }
    console.log(`    registros no BR: ${result.recordsInBrazil}`)
    if (result.topStates) {
      console.log(`    estados: ${result.topStates}`)
    }

    await wait(300)
  }

  console.log(`\n${okCount}/${SPECIES.length} espécies OK.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
