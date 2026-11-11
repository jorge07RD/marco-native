import { nivelProgreso } from '../lib/progreso'
import { formatPct } from './habitoStats'
import { ChartCentro } from './Legend'
import { n1, NIVEL, PISTA, ROTULO } from './paleta'
import { arcPath, polarToCartesian } from './svgMath'

const WIDTH = 260
const HEIGHT = 150
const CX = WIDTH / 2
const CY = 132
const R = 108
const GROSOR = 18

function angulo(pct: number): number {
  return -90 + Math.max(0, Math.min(1, pct)) * 180
}

/**
 * Medio anillo con la pista y el tramo cumplido en el color del semáforo que
 * le toca (el mismo de la barra del día y del calendario). Las marcas de 60 y
 * 80 son los umbrales de ese semáforo; sustituyen a las tres bandas de colores
 * y a la aguja del velocímetro anterior.
 */
function buildGaugeMarkup(pct: number): string {
  const nivel = nivelProgreso(pct * 100)
  const pista =
    `<path d="${arcPath(CX, CY, R, -90, 90)}" fill="none" stroke="${PISTA}" ` +
    `stroke-width="${GROSOR}" stroke-linecap="round"/>`
  const tramo =
    pct > 0.005
      ? `<path d="${arcPath(CX, CY, R, -90, Math.max(-88, angulo(pct)))}" fill="none" stroke="${NIVEL[nivel]}" ` +
        `stroke-width="${GROSOR}" stroke-linecap="round"/>`
      : ''
  const marca = (umbral: number) => {
    const a = angulo(umbral)
    const p0 = polarToCartesian(CX, CY, R + GROSOR / 2 + 3, a)
    const p1 = polarToCartesian(CX, CY, R + GROSOR / 2 + 9, a)
    return `<path d="M ${n1(p0.x)} ${n1(p0.y)} L ${n1(p1.x)} ${n1(p1.y)}" stroke="${ROTULO}" stroke-width="2" stroke-linecap="round" fill="none"/>`
  }
  return (
    `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
    pista +
    tramo +
    marca(0.6) +
    marca(0.8) +
    `</svg>`
  )
}

export function GaugeChart({ pct, width = WIDTH, height = HEIGHT }: { pct: number; width?: number; height?: number }) {
  return (
    <ChartCentro
      markup={buildGaugeMarkup(pct)}
      width={width}
      height={height}
      valor={formatPct(pct)}
      label="cumplimiento"
      alto={Math.round(height * 0.62)}
    />
  )
}
