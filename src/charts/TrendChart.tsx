import type { DayStat } from './dayStats'
import { FONDO, GUIA, LINEA, PREVIA, ROTULO } from './paleta'

const WIDTH = 340
const HEIGHT = 150
const MARGIN_LEFT = 24
const MARGIN_RIGHT = 8
const MARGIN_TOP = 10
const MARGIN_BOTTOM = 18

function n(v: number): string {
  return v.toFixed(1)
}

/**
 * Cumplimiento de cada día del periodo como una línea, con el periodo anterior
 * punteado detrás. Las guías de 60 y 80 son los umbrales del semáforo
 * (lib/progreso.ts), así que la línea se lee contra la misma escala que el
 * calendario sin teñir la gráfica entera.
 *
 * Los dos periodos comparten eje X por posición (día 1 con día 1): el anterior
 * llega recortado a la misma longitud por `rangoAnteriorDe`.
 *
 * Las guías van como <path> y no como <line>: el renderer SVG de Lynx ignora
 * <line> (ver icons.ts).
 */
function buildTrendMarkup(data: DayStat[], previo: DayStat[] | null): string {
  const plotW = WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotH = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const baseY = HEIGHT - MARGIN_BOTTOM
  const slots = Math.max(data.length, previo?.length ?? 0, 2) - 1
  const x = (i: number) => MARGIN_LEFT + (i / slots) * plotW
  const y = (pct: number) => baseY - Math.max(0, Math.min(1, pct)) * plotH

  const guia = (pct: number) =>
    `<path d="M ${MARGIN_LEFT} ${n(y(pct))} L ${WIDTH - MARGIN_RIGHT} ${n(y(pct))}" ` +
    `stroke="${GUIA}" stroke-width="1" stroke-dasharray="2 4" fill="none"/>` +
    `<text x="2" y="${n(y(pct) + 4)}" font-size="10" fill="${ROTULO}">${Math.round(pct * 100)}</text>`
  const base = `<path d="M ${MARGIN_LEFT} ${baseY} L ${WIDTH - MARGIN_RIGHT} ${baseY}" stroke="${GUIA}" stroke-width="1" fill="none"/>`

  const trazo = (serie: DayStat[]) => serie.map((d, i) => `${i === 0 ? 'M' : 'L'} ${n(x(i))} ${n(y(d.pct))}`).join(' ')

  let markup = guia(0.8) + guia(0.6) + base

  if (previo && previo.length > 1) {
    markup += `<path d="${trazo(previo)}" fill="none" stroke="${PREVIA}" stroke-width="1.5" stroke-dasharray="4 4"/>`
  }

  if (data.length > 0) {
    const linea = trazo(data)
    const ultimo = data.length - 1
    const area = `${linea} L ${n(x(ultimo))} ${baseY} L ${n(x(0))} ${baseY} Z`
    markup +=
      `<defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${LINEA}" stop-opacity="0.22"/>` +
      `<stop offset="100%" stop-color="${LINEA}" stop-opacity="0"/>` +
      `</linearGradient></defs>` +
      `<path d="${area}" fill="url(#trendFill)" stroke="none"/>` +
      `<path d="${linea}" fill="none" stroke="${LINEA}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<circle cx="${n(x(ultimo))}" cy="${n(y(data[ultimo].pct))}" r="4" fill="${LINEA}" stroke="${FONDO}" stroke-width="2"/>`

    // Rótulos del eje X: primer y último día del periodo actual. En periodos
    // de más de un mes el día suelto no dice nada, así que va con el mes.
    const rotulo = (d: DayStat) => {
      if (data.length <= 31) return d.label
      const [, mm, dd] = d.fecha.split('-')
      return `${dd}/${mm}`
    }
    const rotuloFin = rotulo(data[ultimo])
    markup +=
      `<text x="${n(x(0))}" y="${HEIGHT - 4}" font-size="10" fill="${ROTULO}">${rotulo(data[0])}</text>` +
      `<text x="${n(x(ultimo) - rotuloFin.length * 6)}" y="${HEIGHT - 4}" font-size="10" fill="${ROTULO}">${rotuloFin}</text>`
  }

  return `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`
}

// Tamaño en px fijos, como la antigua AreaChart. Ojo: el <svg> tiene que ser
// el único contenido de su panel; con la cabecera dentro, Lynx lo pintaba dos
// veces (visto en un SM-S918U, ver AnalyticsChartScreen).
export function TrendChart({
  data,
  previo,
  width = 320,
  height = Math.round((320 * HEIGHT) / WIDTH),
}: {
  data: DayStat[]
  previo: DayStat[] | null
  width?: number
  height?: number
}) {
  return <svg content={buildTrendMarkup(data, previo)} style={{ width: `${width}px`, height: `${height}px` }} />
}
