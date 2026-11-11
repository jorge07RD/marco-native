import { nivelProgreso } from '../lib/progreso'
import type { DayStat } from './dayStats'
import { FONDO, GUIA, LINEA, n1, NIVEL, ROTULO } from './paleta'

const WIDTH = 340
const HEIGHT = 170
const MARGIN_LEFT = 24
const MARGIN_RIGHT = 10
const MARGIN_TOP = 12
const MARGIN_BOTTOM = 20

/**
 * La misma serie que «Cada día», suavizada y con cada día marcado en el color
 * del semáforo, como en el calendario: se ve de un vistazo qué días se
 * quedaron cortos. En periodos de más de un mes los puntos se omiten, porque
 * se pisarían.
 *
 * "Spline" simplificado: bezier cuadrática entre cada punto y el punto medio
 * del siguiente, sin depender de una librería de charting.
 */
function buildSplineChartMarkup(data: DayStat[]): string {
  const plotW = WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotH = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const baseY = HEIGHT - MARGIN_BOTTOM
  const slots = Math.max(data.length - 1, 1)
  const x = (i: number) => MARGIN_LEFT + (i / slots) * plotW
  const y = (pct: number) => baseY - Math.max(0, Math.min(1, pct)) * plotH

  // <path> y no <line>: el renderer SVG de Lynx ignora <line>.
  const guia = (pct: number) =>
    `<path d="M ${MARGIN_LEFT} ${n1(y(pct))} L ${WIDTH - MARGIN_RIGHT} ${n1(y(pct))}" ` +
    `stroke="${GUIA}" stroke-width="1" stroke-dasharray="2 4" fill="none"/>` +
    `<text x="2" y="${n1(y(pct) + 4)}" font-size="10" fill="${ROTULO}">${Math.round(pct * 100)}</text>`
  const base = `<path d="M ${MARGIN_LEFT} ${baseY} L ${WIDTH - MARGIN_RIGHT} ${baseY}" stroke="${GUIA}" stroke-width="1" fill="none"/>`

  let markup = guia(0.8) + guia(0.6) + base
  if (data.length === 0) {
    return `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`
  }

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.pct) }))
  let curva = `M ${n1(pts[0].x)} ${n1(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2
    const midY = (pts[i].y + pts[i + 1].y) / 2
    curva += ` Q ${n1(pts[i].x)} ${n1(pts[i].y)} ${n1(midX)} ${n1(midY)}`
  }
  const ultimo = pts[pts.length - 1]
  curva += ` L ${n1(ultimo.x)} ${n1(ultimo.y)}`
  const area = `${curva} L ${n1(ultimo.x)} ${baseY} L ${n1(pts[0].x)} ${baseY} Z`

  markup +=
    `<defs><linearGradient id="splineFill" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${LINEA}" stop-opacity="0.16"/>` +
    `<stop offset="100%" stop-color="${LINEA}" stop-opacity="0"/>` +
    `</linearGradient></defs>` +
    `<path d="${area}" fill="url(#splineFill)" stroke="none"/>` +
    `<path d="${curva}" fill="none" stroke="${LINEA}" stroke-width="2" stroke-opacity="0.7" stroke-linejoin="round" stroke-linecap="round"/>`

  if (data.length <= 31) {
    markup += data
      .map(
        (d, i) =>
          `<circle cx="${n1(pts[i].x)}" cy="${n1(pts[i].y)}" r="3.5" fill="${NIVEL[nivelProgreso(d.pct * 100)]}" ` +
          `stroke="${FONDO}" stroke-width="1.5"/>`,
      )
      .join('')
  }

  const rotulo = (d: DayStat) => {
    if (data.length <= 31) return d.label
    const [, mm, dd] = d.fecha.split('-')
    return `${dd}/${mm}`
  }
  const medio = Math.floor((data.length - 1) / 2)
  const indices = data.length > 2 ? [0, medio, data.length - 1] : [0, data.length - 1]
  markup += indices
    .map((i, k) => {
      const t = rotulo(data[i])
      const ancho = t.length * 6
      const tx = k === 0 ? x(i) : k === indices.length - 1 ? x(i) - ancho : x(i) - ancho / 2
      return `<text x="${n1(tx)}" y="${HEIGHT - 4}" font-size="10" fill="${ROTULO}">${t}</text>`
    })
    .join('')

  return `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`
}

export function SplineChart({
  data,
  width = 320,
  height = Math.round((320 * HEIGHT) / WIDTH),
}: {
  data: DayStat[]
  width?: number
  height?: number
}) {
  return <svg content={buildSplineChartMarkup(data)} style={{ width: `${width}px`, height: `${height}px` }} />
}
