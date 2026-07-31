import type { HabitoStat } from './habitoStats'
import { formatPct } from './habitoStats'
import { Legend } from './Legend'
import { polarToCartesian } from './svgMath'

const SIZE = 260
const CENTER = SIZE / 2
const MAX_RADIUS = 100

function buildRadarMarkup(stats: HabitoStat[]): string {
  const n = Math.max(stats.length, 1)
  const anglePer = 360 / n

  const rings = [0.5, 1].map((f) => {
    const pts = Array.from({ length: n }, (_, i) => polarToCartesian(CENTER, CENTER, MAX_RADIUS * f, i * anglePer))
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
    return `<path d="${d}" fill="none" stroke="#2a2732" stroke-width="1"/>`
  })

  const spokes = stats
    .map((_, i) => {
      const p = polarToCartesian(CENTER, CENTER, MAX_RADIUS, i * anglePer)
      return `<line x1="${CENTER}" y1="${CENTER}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#2a2732" stroke-width="1"/>`
    })
    .join('')

  const dataPoints = stats.map((s, i) => polarToCartesian(CENTER, CENTER, s.pct * MAX_RADIUS, i * anglePer))
  const dataPath =
    dataPoints.length > 0
      ? dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
      : ''

  const dots = dataPoints
    .map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${stats[i].color}"/>`)
    .join('')

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    rings.join('') +
    spokes +
    `<path d="${dataPath}" fill="#e94560" opacity="0.7" stroke="#e94560" stroke-width="2"/>` +
    dots +
    `</svg>`
  )
}

export function RadarChart({
  stats,
  size = SIZE,
}: {
  stats: HabitoStat[]
  size?: number
}) {
  return (
    <>
      <svg content={buildRadarMarkup(stats)} style={{ width: `${size}px`, height: `${size}px` }} />
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
