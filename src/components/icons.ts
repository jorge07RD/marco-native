/* Íconos como strings de markup SVG.

   Lynx no acepta hijos JSX dentro de <svg>: se le pasa el documento completo
   por la prop `content` (mismo patrón que las gráficas, ver charts/DonutChart).
   Por eso cada ícono es una función que devuelve el markup ya coloreado, en
   vez de un componente con props de estilo.

   La geometría sale literal de "Marco Rediseño Demo.dc.html". */

/** La diana de marca: anillo exterior rosado, anillo medio y punto morados.
 *  Misma figura que el ícono del launcher (drawable/ic_marco_foreground.xml).
 *  `strokeWidth` compensa el tamaño de render: 26 a 28px, 18 a 140px. */
export function brandMark(strokeWidth: number): string {
  return (
    `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="256" cy="256" r="132" fill="none" stroke="#e94560" stroke-width="${strokeWidth}"/>` +
    `<circle cx="256" cy="256" r="80" fill="none" stroke="#7b2cbf" stroke-width="${strokeWidth}"/>` +
    `<circle cx="256" cy="256" r="30" fill="#7b2cbf"/>` +
    `</svg>`
  )
}

export type TabIconName = 'progreso' | 'habitos' | 'calendario' | 'analisis' | 'ajustes'

// Trazos lineales de 24×24 — reemplazan los emoji del nav, que se veían
// distintos en cada plataforma y no tenían estado activo.
const TAB_PATHS: Record<TabIconName, string> = {
  progreso:
    '<path d="M3 3v18h18"/>' +
    '<rect x="7" y="12" width="3" height="6"/>' +
    '<rect x="12" y="8" width="3" height="10"/>' +
    '<rect x="17" y="5" width="3" height="13"/>',
  habitos: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  // Los travesaños van como <path> y no como <line>: el renderer SVG de Lynx
  // dibuja rect/circle/path/polyline pero ignora <line>, y el ícono salía
  // como un cuadrado vacío (verificado en un SM-S918U).
  calendario:
    '<rect x="3" y="4" width="18" height="18" rx="2"/>' +
    '<path d="M3 9 L21 9"/>' +
    '<path d="M8 2 L8 6"/>' +
    '<path d="M16 2 L16 6"/>',
  analisis: '<polyline points="3 17 9 11 13 15 21 6"/>',
  ajustes:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
}

export function tabIcon(name: TabIconName, color: string): string {
  return (
    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" ` +
    `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    TAB_PATHS[name] +
    `</svg>`
  )
}

/** Palomita del anillo de un hábito cumplido. El trazo va en `color` porque
 *  sobre un color de hábito claro hace falta tinta oscura (ver textoSobre). */
export function checkIcon(color: string): string {
  return (
    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" ` +
    `stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M5 12.5 L9.5 17 L19 7.5"/>` +
    `</svg>`
  )
}

/** Arco del registro parcial: la fracción de la meta dibujada sobre la pista
 *  del anillo, desde las 12 en sentido horario. 7,71 de 10 llena el 77 %.
 *
 *  Se dibuja con el comando A de <path> (el mismo que usa el gauge) y no con
 *  stroke-dasharray, que el renderer SVG de Lynx no garantiza. */
export function arcoParcial(color: string, fraccion: number): string {
  const f = Math.min(Math.max(fraccion, 0.02), 0.999)
  const r = 18
  const c = 20
  const ang = f * 2 * Math.PI
  const x = c + r * Math.sin(ang)
  const y = c - r * Math.cos(ang)
  const largeArc = f > 0.5 ? 1 : 0
  return (
    `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M ${c} ${c - r} A ${r} ${r} 0 ${largeArc} 1 ${x.toFixed(2)} ${y.toFixed(2)}" ` +
    `fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>` +
    `</svg>`
  )
}

/** Chevrón de navegación (fecha y mes anterior/siguiente). */
export function chevronIcon(dir: 'izq' | 'der', color: string): string {
  const d = dir === 'izq' ? 'M15 18 L9 12 L15 6' : 'M9 18 L15 12 L9 6'
  return (
    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" ` +
    `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${d}"/></svg>`
  )
}

/** Más del botón flotante. */
export function plusIcon(color: string): string {
  return (
    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" ` +
    `stroke="${color}" stroke-width="2.4" stroke-linecap="round">` +
    `<path d="M12 5 L12 19"/><path d="M5 12 L19 12"/></svg>`
  )
}

/** Equis para quitar una pastilla. */
export function closeIcon(color: string): string {
  return (
    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" ` +
    `stroke="${color}" stroke-width="2.4" stroke-linecap="round">` +
    `<path d="M6 6 L18 18"/><path d="M18 6 L6 18"/></svg>`
  )
}

/** Menos (afinar un minuto hacia atrás). */
export function minusIcon(color: string): string {
  return (
    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" ` +
    `stroke="${color}" stroke-width="2.4" stroke-linecap="round">` +
    `<path d="M5 12 L19 12"/></svg>`
  )
}
