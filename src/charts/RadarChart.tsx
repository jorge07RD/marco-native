import type { HabitoStat } from './habitoStats'
import { formatPct } from './habitoStats'
import { Legend } from './Legend'
import { FONDO, GUIA, LINEA, n1, PISTA } from './paleta'
import { polarToCartesian } from './svgMath'

const SIZE = 260
const CENTER = SIZE / 2
const MAX_RADIUS = 112

/**
 * Equilibrio entre hábitos: cuanto más redonda la figura, más parejo el
 * cumplimiento. El borde exterior es el 100 % y los dos anillos de dentro son
 * el 60 y el 80, las mismas guías que la línea de «Cada día».
 */
function buildRadarMarkup(stats: HabitoStat[]): string {
  const n = Math.max(stats.length, 3)
  const per = 360 / n
  const poligono = (f: number) =>
    Array.from({ length: n }, (_, i) => polarToCartesian(CENTER, CENTER, MAX_RADIUS * f, i * per))
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${n1(p.x)} ${n1(p.y)}`)
      .join(' ') + ' Z'

  const fondo = `<path d="${poligono(1)}" fill="${PISTA}" fill-opacity="0.35" stroke="${PISTA}" stroke-width="1.5"/>`
  const guias = [0.8, 0.6]
    .map((f) => `<path d="${poligono(f)}" fill="none" stroke="${GUIA}" stroke-width="1" stroke-dasharray="2 4"/>`)
    .join('')
  // <path> y no <line>: el renderer SVG de Lynx ignora <line>.
  const radios = Array.from({ length: n }, (_, i) => {
    const p = polarToCartesian(CENTER, CENTER, MAX_RADIUS, i * per)
    return `<path d="M ${CENTER} ${CENTER} L ${n1(p.x)} ${n1(p.y)}" stroke="${PISTA}" stroke-width="1" fill="none"/>`
  }).join('')

  const puntos = stats.map((s, i) =>
    polarToCartesian(CENTER, CENTER, Math.max(0.02, Math.min(1, s.pct)) * MAX_RADIUS, i * per),
  )
  const figura =
    puntos.length > 0
      ? `<path d="${puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${n1(p.x)} ${n1(p.y)}`).join(' ')} Z" ` +
        `fill="${LINEA}" fill-opacity="0.18" stroke="${LINEA}" stroke-width="2" stroke-linejoin="round"/>`
      : ''
  const marcas = puntos
    .map(
      (p, i) =>
        `<circle cx="${n1(p.x)}" cy="${n1(p.y)}" r="6" fill="${stats[i].color}" stroke="${FONDO}" stroke-width="2.5"/>`,
    )
    .join('')

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    fondo +
    radios +
    guias +
    figura +
    marcas +
    `</svg>`
  )
}

export function RadarChart({ stats, size = SIZE }: { stats: HabitoStat[]; size?: number }) {
  return (
    <>
      <svg content={buildRadarMarkup(stats)} style={{ width: `${size}px`, height: `${size}px` }} />
      <Legend
        items={stats.map((s) => ({ id: s.id, nombre: s.nombre, color: s.color, valueLabel: formatPct(s.pct) }))}
      />
    </>
  )
}
