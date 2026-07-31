// Helpers de geometría polar compartidos por las gráficas circulares
// (donut, gauge, column-polar, radar). Convención de ángulo: 0° = arriba
// (12 en punto), creciente = sentido horario (coherente con el eje Y de SVG,
// que apunta hacia abajo).

export interface Point {
  x: number
  y: number
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function n(value: number): string {
  return value.toFixed(1)
}

// Porción rellena tipo "pie slice", desde el centro hasta el radio `r`,
// entre startAngle y endAngle (grados).
export function sectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const p0 = polarToCartesian(cx, cy, r, startAngle)
  const p1 = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${n(cx)},${n(cy)} L ${n(p0.x)},${n(p0.y)} A ${n(r)},${n(r)} 0 ${largeArc} 1 ${n(p1.x)},${n(p1.y)} Z`
}

// Porción de anillo (donut) entre rInner y rOuter, entre startAngle y endAngle.
export function annulusSectorPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const o0 = polarToCartesian(cx, cy, rOuter, startAngle)
  const o1 = polarToCartesian(cx, cy, rOuter, endAngle)
  const i1 = polarToCartesian(cx, cy, rInner, endAngle)
  const i0 = polarToCartesian(cx, cy, rInner, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${n(o0.x)},${n(o0.y)}`,
    `A ${n(rOuter)},${n(rOuter)} 0 ${largeArc} 1 ${n(o1.x)},${n(o1.y)}`,
    `L ${n(i1.x)},${n(i1.y)}`,
    `A ${n(rInner)},${n(rInner)} 0 ${largeArc} 0 ${n(i0.x)},${n(i0.y)}`,
    'Z',
  ].join(' ')
}

// Arco simple (sin relleno hacia el centro), útil para bandas de un gauge.
export function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const p0 = polarToCartesian(cx, cy, r, startAngle)
  const p1 = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${n(p0.x)},${n(p0.y)} A ${n(r)},${n(r)} 0 ${largeArc} 1 ${n(p1.x)},${n(p1.y)}`
}

export const PALETTE = ['#4f8ef7', '#ef5350', '#f2a900', '#43a047', '#8e44ad', '#00acc1', '#ff7043', '#5c6bc0']

export function colorAt(index: number): string {
  return PALETTE[index % PALETTE.length]
}
