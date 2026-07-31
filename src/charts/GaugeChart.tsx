import { arcPath, polarToCartesian } from './svgMath'
import './GaugeChart.css'

const WIDTH = 260
const CENTER_X = 130
const CENTER_Y = 125
const RADIUS = 100
const BAND_WIDTH = 16

function pctToAngle(pct: number): number {
  return -90 + Math.max(0, Math.min(1, pct)) * 180
}

// Semáforo clásico con los colores de marca: rojo (acento) 0-60%, ámbar
// (warning) 60-80%, verde (success) 80-100%.
function buildGaugeMarkup(pct: number): string {
  const bands = [
    { from: 0, to: 0.6, color: '#e94560' },
    { from: 0.6, to: 0.8, color: '#ffd60a' },
    { from: 0.8, to: 1, color: '#00ff88' },
  ]

  const bandArcs = bands
    .map(
      (b) =>
        `<path d="${arcPath(CENTER_X, CENTER_Y, RADIUS, pctToAngle(b.from), pctToAngle(b.to))}" ` +
        `fill="none" stroke="${b.color}" stroke-width="${BAND_WIDTH}"/>`,
    )
    .join('')

  const needleAngle = pctToAngle(pct)
  const needleTip = polarToCartesian(CENTER_X, CENTER_Y, RADIUS - BAND_WIDTH - 6, needleAngle)
  const needle =
    `<line x1="${CENTER_X}" y1="${CENTER_Y}" x2="${needleTip.x.toFixed(1)}" y2="${needleTip.y.toFixed(1)}" ` +
    `stroke="#edf2f4" stroke-width="3"/>` +
    `<circle cx="${CENTER_X}" cy="${CENTER_Y}" r="5" fill="#edf2f4"/>`

  return (
    `<svg viewBox="0 0 ${WIDTH} 150" xmlns="http://www.w3.org/2000/svg">` + bandArcs + needle + `</svg>`
  )
}

export function GaugeChart({
  pct,
  width = WIDTH,
  height = 150,
}: {
  pct: number
  width?: number
  height?: number
}) {
  return (
    <view className="GaugeChart">
      <svg content={buildGaugeMarkup(pct)} style={{ width: `${width}px`, height: `${height}px` }} />
      <text className="GaugeValue">{Math.round(pct * 100)}%</text>
      <text className="GaugeLabel">Promedio general de cumplimiento</text>
    </view>
  )
}
