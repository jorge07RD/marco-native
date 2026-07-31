import type { HabitoStat } from './habitoStats'
import { Legend } from './Legend'
import { annulusSectorPath } from './svgMath'

const SIZE = 260
const CENTER = SIZE / 2
const R_OUTER = 110
const R_INNER = R_OUTER * 0.75 // innerSize 75%, como el original en Highcharts

function buildDonutMarkup(stats: HabitoStat[]): string {
  const totalCompletados = stats.reduce((acc, s) => acc + s.completados, 0)

  if (totalCompletados <= 0) {
    return (
      `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${CENTER}" cy="${CENTER}" r="${R_OUTER}" fill="none" stroke="#2a2732" stroke-width="2"/>` +
      `</svg>`
    )
  }

  let cursor = 0
  const slices = stats
    .filter((s) => s.completados > 0)
    .map((s) => {
      const share = s.completados / totalCompletados
      const start = cursor * 360
      cursor += share
      const end = cursor * 360
      return `<path d="${annulusSectorPath(CENTER, CENTER, R_OUTER, R_INNER, start, end)}" fill="${s.color}"/>`
    })
    .join('')

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">${slices}</svg>`
}

export function DonutChart({
  stats,
  size = SIZE,
}: {
  stats: HabitoStat[]
  size?: number
}) {
  const totalCompletados = stats.reduce((acc, s) => acc + s.completados, 0)
  return (
    <>
      <svg content={buildDonutMarkup(stats)} style={{ width: `${size}px`, height: `${size}px` }} />
      <Legend
        items={stats.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          color: s.color,
          valueLabel:
            totalCompletados > 0 ? `${Math.round((s.completados / totalCompletados) * 100)}%` : '0%',
        }))}
      />
    </>
  )
}
