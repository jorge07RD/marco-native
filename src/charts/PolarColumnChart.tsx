import type { HabitoStat } from './habitoStats'
import { formatPct } from './habitoStats'
import { Legend } from './Legend'
import { sectorPath } from './svgMath'

const SIZE = 260
const CENTER = SIZE / 2
const MAX_RADIUS = 110
const GAP_DEG = 4

function buildPolarColumnMarkup(stats: HabitoStat[]): string {
  const n = Math.max(stats.length, 1)
  const anglePerSector = 360 / n

  const refCircle = `<circle cx="${CENTER}" cy="${CENTER}" r="${MAX_RADIUS}" fill="none" stroke="#533483" stroke-width="1"/>`
  const refCircleMid = `<circle cx="${CENTER}" cy="${CENTER}" r="${(MAX_RADIUS / 2).toFixed(1)}" fill="none" stroke="#533483" stroke-width="1"/>`

  const sectors = stats
    .map((s, i) => {
      const start = i * anglePerSector + GAP_DEG / 2
      const end = (i + 1) * anglePerSector - GAP_DEG / 2
      const radius = Math.max(6, s.pct * MAX_RADIUS)
      return `<path d="${sectorPath(CENTER, CENTER, radius, start, end)}" fill="${s.color}" opacity="0.85"/>`
    })
    .join('')

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    refCircle +
    refCircleMid +
    sectors +
    `</svg>`
  )
}

export function PolarColumnChart({
  stats,
  size = SIZE,
}: {
  stats: HabitoStat[]
  size?: number
}) {
  return (
    <>
      <svg content={buildPolarColumnMarkup(stats)} style={{ width: `${size}px`, height: `${size}px` }} />
      <Legend
        items={stats.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          color: s.color,
          valueLabel: formatPct(s.pct),
        }))}
      />
    </>
  )
}
