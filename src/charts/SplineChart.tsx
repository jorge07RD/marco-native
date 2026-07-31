import type { DayStat } from './dayStats'

const WIDTH = 320
const HEIGHT = 170
const MARGIN_LEFT = 8
const MARGIN_RIGHT = 8
const MARGIN_TOP = 12
const MARGIN_BOTTOM = 22

// "Spline" simplificado: bezier cuadrática entre cada punto y el punto medio
// del siguiente, sin depender de una librería de charting (no disponible en
// Lynx open-source, ver analysis/07-mobile-migration-notes.md).
function buildSplineChartMarkup(data: DayStat[]): string {
  const plotWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const axisY = HEIGHT - MARGIN_BOTTOM
  const n = Math.max(data.length - 1, 1)

  const points = data.map((d, i) => {
    const x = MARGIN_LEFT + (i / n) * plotWidth
    const y = axisY - Math.max(0, Math.min(1, d.pct)) * plotHeight
    return { x, y }
  })

  let path = ''
  if (points.length > 0) {
    path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const midX = (curr.x + next.x) / 2
      const midY = (curr.y + next.y) / 2
      path += ` Q ${curr.x.toFixed(1)},${curr.y.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`
    }
    const last = points[points.length - 1]
    path += ` L ${last.x.toFixed(1)},${last.y.toFixed(1)}`
  }

  const dots = points
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" fill="#00ff88"/>`)
    .join('')

  const axis = `<line x1="${MARGIN_LEFT}" y1="${axisY.toFixed(1)}" x2="${(WIDTH - MARGIN_RIGHT).toFixed(1)}" y2="${axisY.toFixed(1)}" stroke="#533483" stroke-width="1"/>`

  const step = Math.max(1, Math.ceil(data.length / 8))
  const labels = data
    .map((d, i) => {
      if (i % step !== 0) return ''
      const x = points[i].x - d.label.length * 2.5
      return `<text x="${x.toFixed(1)}" y="${HEIGHT - 6}" font-size="8" fill="#8d99ae">${d.label}</text>`
    })
    .join('')

  return (
    `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
    axis +
    `<path d="${path}" fill="none" stroke="#00ff88" stroke-width="2"/>` +
    dots +
    labels +
    `</svg>`
  )
}

export function SplineChart({
  data,
  width = WIDTH,
  height = HEIGHT,
}: {
  data: DayStat[]
  width?: number
  height?: number
}) {
  return <svg content={buildSplineChartMarkup(data)} style={{ width: `${width}px`, height: `${height}px` }} />
}
