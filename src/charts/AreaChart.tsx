import type { DayStat } from './dayStats'

const WIDTH = 320
const HEIGHT = 170
const MARGIN_LEFT = 8
const MARGIN_RIGHT = 8
const MARGIN_TOP = 12
const MARGIN_BOTTOM = 22

function buildAreaChartMarkup(data: DayStat[]): string {
  const plotWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const axisY = HEIGHT - MARGIN_BOTTOM
  const n = Math.max(data.length - 1, 1)

  const points = data.map((d, i) => {
    const x = MARGIN_LEFT + (i / n) * plotWidth
    const y = axisY - Math.max(0, Math.min(1, d.pct)) * plotHeight
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)},${axisY} L ${points[0].x.toFixed(1)},${axisY} Z`
      : ''

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
    `<defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#e94560" stop-opacity="0.55"/>` +
    `<stop offset="100%" stop-color="#e94560" stop-opacity="0.05"/>` +
    `</linearGradient></defs>` +
    axis +
    `<path d="${areaPath}" fill="url(#areaFill)" stroke="none"/>` +
    `<path d="${linePath}" fill="none" stroke="#e94560" stroke-width="2"/>` +
    labels +
    `</svg>`
  )
}

export function AreaChart({
  data,
  width = WIDTH,
  height = HEIGHT,
}: {
  data: DayStat[]
  width?: number
  height?: number
}) {
  return <svg content={buildAreaChartMarkup(data)} style={{ width: `${width}px`, height: `${height}px` }} />
}
