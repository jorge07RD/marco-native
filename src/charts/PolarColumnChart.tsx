import type { HabitoStat } from './habitoStats'
import { formatPct } from './habitoStats'
import { ChartCentro, Legend } from './Legend'
import { FONDO, PISTA } from './paleta'
import { annulusSectorPath } from './svgMath'

const SIZE = 260
const CENTER = SIZE / 2
const R_MAX = 120
const R_MIN = 52 // hueco central para la cifra
const GAP_DEG = 3

/**
 * Rueda de hábitos: una porción por hábito que crece hacia fuera con su
 * cumplimiento. Detrás de cada porción va su pista entera, como el anillo del
 * Dashboard: se ve lo hecho y también lo que falta.
 */
function buildPolarColumnMarkup(stats: HabitoStat[]): string {
  if (stats.length === 0) {
    return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg"></svg>`
  }
  const per = 360 / stats.length
  const gap = stats.length > 1 ? GAP_DEG : 0
  const sectores = stats
    .map((s, i) => {
      const a0 = i * per + gap / 2
      const a1 = (i + 1) * per - gap / 2
      const r = R_MIN + Math.max(0.03, Math.min(1, s.pct)) * (R_MAX - R_MIN)
      return (
        `<path d="${annulusSectorPath(CENTER, CENTER, R_MAX, R_MIN, a0, a1)}" fill="${PISTA}"/>` +
        // Al 0 % queda solo la pista, como el anillo vacío del Dashboard.
        (s.pct > 0 ? `<path d="${annulusSectorPath(CENTER, CENTER, r, R_MIN, a0, a1)}" fill="${s.color}"/>` : '')
      )
    })
    .join('')
  // Un solo hábito: la porción es el círculo entero y el arco de 360° no se
  // dibuja. Se parte en dos mitades iguales sin hueco.
  const unico =
    stats.length === 1
      ? (() => {
          const r = R_MIN + Math.max(0.03, Math.min(1, stats[0].pct)) * (R_MAX - R_MIN)
          return (
            `<path d="${annulusSectorPath(CENTER, CENTER, R_MAX, R_MIN, 0, 180)}" fill="${PISTA}"/>` +
            `<path d="${annulusSectorPath(CENTER, CENTER, R_MAX, R_MIN, 180, 360)}" fill="${PISTA}"/>` +
            `<path d="${annulusSectorPath(CENTER, CENTER, r, R_MIN, 0, 180)}" fill="${stats[0].color}"/>` +
            `<path d="${annulusSectorPath(CENTER, CENTER, r, R_MIN, 180, 360)}" fill="${stats[0].color}"/>`
          )
        })()
      : null

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    (unico ?? sectores) +
    `<circle cx="${CENTER}" cy="${CENTER}" r="${R_MIN - 1}" fill="${FONDO}"/>` +
    `</svg>`
  )
}

export function PolarColumnChart({ stats, size = SIZE }: { stats: HabitoStat[]; size?: number }) {
  const prom = stats.length > 0 ? stats.reduce((acc, s) => acc + s.pct, 0) / stats.length : 0
  const ordenados = [...stats].sort((a, b) => b.pct - a.pct)
  return (
    <>
      <ChartCentro
        markup={buildPolarColumnMarkup(stats)}
        width={size}
        height={size}
        valor={formatPct(prom)}
        label="promedio"
      />
      <Legend
        items={ordenados.map((s) => ({ id: s.id, nombre: s.nombre, color: s.color, valueLabel: formatPct(s.pct) }))}
      />
    </>
  )
}
