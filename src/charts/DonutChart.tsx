import { formatNumero } from '../lib/formato'
import type { HabitoStat } from './habitoStats'
import { ChartCentro, Legend } from './Legend'
import { PISTA } from './paleta'
import { annulusSectorPath } from './svgMath'

const SIZE = 260
const CENTER = SIZE / 2
const R_OUTER = 120
const R_INNER = 96
const GAP_DEG = 2

/** El anillo entero en dos mitades: un arco de 360° no se dibuja. */
function anilloCompleto(color: string): string {
  return (
    `<path d="${annulusSectorPath(CENTER, CENTER, R_OUTER, R_INNER, 0, 180)}" fill="${color}"/>` +
    `<path d="${annulusSectorPath(CENTER, CENTER, R_OUTER, R_INNER, 180, 360)}" fill="${color}"/>`
  )
}

/**
 * Cómo se reparte lo cumplido entre los hábitos: un anillo grueso, como el del
 * Dashboard, partido en el color de cada hábito. Sin nada cumplido queda la
 * pista vacía.
 */
function buildDonutMarkup(stats: HabitoStat[]): string {
  const conDatos = stats.filter((s) => s.completados > 0)
  const total = conDatos.reduce((acc, s) => acc + s.completados, 0)
  let cuerpo: string
  if (total <= 0) {
    cuerpo = anilloCompleto(PISTA)
  } else if (conDatos.length === 1) {
    cuerpo = anilloCompleto(conDatos[0].color)
  } else {
    let cursor = 0
    cuerpo = conDatos
      .map((s) => {
        const a0 = cursor * 360 + GAP_DEG / 2
        cursor += s.completados / total
        const a1 = cursor * 360 - GAP_DEG / 2
        return a1 > a0
          ? `<path d="${annulusSectorPath(CENTER, CENTER, R_OUTER, R_INNER, a0, a1)}" fill="${s.color}"/>`
          : ''
      })
      .join('')
  }
  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">${cuerpo}</svg>`
}

export function DonutChart({ stats, size = SIZE }: { stats: HabitoStat[]; size?: number }) {
  const total = stats.reduce((acc, s) => acc + s.completados, 0)
  const ordenados = [...stats].sort((a, b) => b.completados - a.completados)
  return (
    <>
      <ChartCentro
        markup={buildDonutMarkup(stats)}
        width={size}
        height={size}
        valor={formatNumero(Math.round(total * 10) / 10, 1)}
        label={total === 1 ? 'cumplido' : 'cumplidos'}
      />
      <Legend
        items={ordenados.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          color: s.color,
          valueLabel: total > 0 ? `${Math.round((s.completados / total) * 100)} %` : '0 %',
        }))}
      />
    </>
  )
}
