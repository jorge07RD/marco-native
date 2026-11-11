/* Formato de números y unidades para mostrar en pantalla.

   La app está en español: el decimal va con coma ("7,71", no "7.71"). Se hace
   a mano y no con toLocaleString porque el motor JS de Lynx no garantiza Intl. */

/** Número con coma decimal y como mucho `decimales` cifras, sin ceros de
 *  relleno: 2 → "2", 7.714 → "7,71", 7.5 → "7,5". */
export function formatNumero(valor: number, decimales = 2): string {
  if (!Number.isFinite(valor)) return '—'
  if (Number.isInteger(valor)) return String(valor)
  const fijo = valor.toFixed(decimales).replace(/0+$/, '').replace(/\.$/, '')
  return fijo.replace('.', ',')
}

/** Porcentaje redondeado con espacio fino de separación, como se escribe en
 *  español: 71 → "71 %". */
export function formatPct(valor: number): string {
  return `${Math.round(valor)} %`
}

/** Unidad concordada con la cantidad. Solo corrige la que siembra la app
 *  ("veces" → "vez" con 1); las demás las escribe el usuario y se respetan. */
export function unidadPara(cantidad: number, unidad: string): string {
  if (cantidad === 1 && unidad.trim().toLowerCase() === 'veces') return 'vez'
  return unidad
}
