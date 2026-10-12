// Monta o SVG "adesivo realista" de uma espécie a partir da especificação em
// ./species-art.ts. Saída só com atributos de apresentação (sem <style>/CSS)
// para renderizar igual no expo-image (iOS/Android) e na web.

export interface Fin {
  d: string
  fill: string
  opacity?: number
  // Raios da nadadeira (traços finos escuros por cima da cor).
  rays?: string
}

export interface Mark {
  d: string
  fill?: string
  stroke?: string
  width?: number
  opacity?: number
}

export interface FishArt {
  id: string
  // Corpo fechado. A boca fica de fora (o recorte em "V" na frente) e é
  // desenhada por `gape`.
  body: string
  // Degradê vertical do dorso para a barriga: [offset 0–1, cor].
  gradient: [number, string][]
  // Nadadeiras atrás do corpo (cauda, dorsais, adiposa, anal).
  fins: Fin[]
  // Nadadeiras na frente do corpo (peitoral, pélvica).
  front?: Fin[]
  // Manchas, faixas e listras — recortadas pelo contorno do corpo.
  marks?: Mark[]
  // Textura de escamas: [x0, x1, y0, y1, passo, opacidade?].
  scales?: [number, number, number, number, number, number?]
  lateralLine?: string
  operculum?: string
  // Abertura da boca (preenchida escura) e lábios.
  gape?: string
  lowerLip?: [string, string, number]
  upperLip?: string
  teeth?: string
  barbels?: string
  // Cor do miolo dos barbilhões (a borda segue o recorte do adesivo).
  barbelColor?: string
  // Olho: [cx, cy, raio, cor da íris].
  eye: [number, number, number, string]
  // Reflexo no dorso: [cx, cy, rx, ry].
  highlight?: [number, number, number, number]
  // Detalhes por cima de tudo (ocelo, presas, quilhas, filamentos).
  extras?: Mark[]
}

const OUTLINE = '#1b1640'
const VIEWBOX = '-12 -18 224 136'

function scalePath(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  step: number
) {
  let d = ''
  let row = 0
  for (let y = y0; y <= y1; y += step * 0.72, row++) {
    const off = row % 2 ? step / 2 : 0
    for (let x = x0 + off; x <= x1; x += step) {
      d += `M${x.toFixed(1)} ${y.toFixed(1)}q${(step / 2).toFixed(1)} ${(step * 0.45).toFixed(1)} ${step.toFixed(1)} 0`
    }
  }
  return d
}

function attrs(values: Record<string, string | number | undefined>) {
  return Object.entries(values)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
}

function mark(m: Mark) {
  return `<path ${attrs({
    d: m.d,
    fill: m.fill ?? 'none',
    stroke: m.stroke,
    'stroke-width': m.stroke ? (m.width ?? 1.4) : undefined,
    'stroke-linecap': m.stroke ? 'round' : undefined,
    'stroke-linejoin': m.stroke ? 'round' : undefined,
    opacity: m.opacity,
  })}/>`
}

function fin(f: Fin) {
  const shape = `<path ${attrs({ d: f.d, fill: f.fill, opacity: f.opacity })}/>`
  const rays = f.rays
    ? `<path d="${f.rays}" fill="none" stroke="#000000" stroke-width="0.9" stroke-linecap="round" opacity="0.3"/>`
    : ''
  return shape + rays
}

export function renderFish(art: FishArt): string {
  const g = `g-${art.id}`
  const c = `c-${art.id}`
  const fins = art.fins
  const front = art.front ?? []

  // Silhueta do adesivo = tudo o que é sólido (nadadeiras + corpo + boca).
  const silhouette = [
    ...fins.map(f => f.d),
    ...front.map(f => f.d),
    art.body,
    art.gape ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const stops = art.gradient
    .map(([o, color]) => `<stop offset="${o}" stop-color="${color}"/>`)
    .join('')

  const parts: string[] = []
  parts.push(
    `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient><clipPath id="${c}"><path d="${art.body}"/></clipPath></defs>`
  )
  // Borda branca grossa + contorno índigo (o "recorte" de figurinha).
  parts.push(
    `<path d="${silhouette}" fill="#ffffff" stroke="#ffffff" stroke-width="12" stroke-linejoin="round"/>`
  )
  if (art.barbels)
    parts.push(
      `<path d="${art.barbels}" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>`
    )
  parts.push(
    `<path d="${silhouette}" fill="${OUTLINE}" stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round"/>`
  )
  if (art.barbels)
    parts.push(
      `<path d="${art.barbels}" fill="none" stroke="${OUTLINE}" stroke-width="4.2" stroke-linecap="round"/>`
    )
  for (const f of fins) parts.push(fin(f))
  parts.push(`<path d="${art.body}" fill="url(#${g})"/>`)

  const clipped: string[] = []
  for (const m of art.marks ?? []) clipped.push(mark(m))
  if (art.scales) {
    const [x0, x1, y0, y1, step, opacity] = art.scales
    clipped.push(
      `<path d="${scalePath(x0, x1, y0, y1, step)}" fill="none" stroke="#000000" stroke-width="0.8" opacity="${opacity ?? 0.2}"/>`
    )
  }
  if (art.highlight) {
    const [cx, cy, rx, ry] = art.highlight
    clipped.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="0.16"/>`
    )
  }
  if (clipped.length)
    parts.push(`<g clip-path="url(#${c})">${clipped.join('')}</g>`)

  if (art.lateralLine)
    parts.push(
      `<path d="${art.lateralLine}" fill="none" stroke="#000000" stroke-width="1" opacity="0.3"/>`
    )
  if (art.operculum)
    parts.push(
      `<path d="${art.operculum}" fill="none" stroke="#000000" stroke-width="1.6" stroke-linecap="round" opacity="0.38"/>`
    )
  for (const f of front) parts.push(fin(f))
  if (art.gape) parts.push(`<path d="${art.gape}" fill="#2e1210"/>`)
  if (art.teeth) parts.push(`<path d="${art.teeth}" fill="#f4f0dc"/>`)
  if (art.lowerLip) {
    const [d, color, width] = art.lowerLip
    parts.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`
    )
  }
  if (art.upperLip)
    parts.push(
      `<path d="${art.upperLip}" fill="none" stroke="${OUTLINE}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`
    )
  if (art.barbels)
    parts.push(
      `<path d="${art.barbels}" fill="none" stroke="${art.barbelColor ?? '#8a8478'}" stroke-width="1.8" stroke-linecap="round"/>`
    )
  for (const m of art.extras ?? []) parts.push(mark(m))

  const [ex, ey, er, iris] = art.eye
  parts.push(
    `<circle cx="${ex}" cy="${ey}" r="${er}" fill="${iris}"/><circle cx="${ex + er * 0.08}" cy="${ey}" r="${(er * 0.55).toFixed(2)}" fill="#0d0b1a"/><circle cx="${(ex + er * 0.3).toFixed(2)}" cy="${(ey - er * 0.28).toFixed(2)}" r="${(er * 0.2).toFixed(2)}" fill="#ffffff"/>`
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">${parts.join('')}</svg>\n`
}
