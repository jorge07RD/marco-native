// Utilidades de fecha en formato YYYY-MM-DD (el que espera el backend, ver
// analysis/01-data-model.md — `registros.fecha` es string, no tipo `date`).
// Formateo manual (sin Intl/toLocaleDateString) para no depender del soporte
// de Intl del motor JS de Lynx (PrimJS), que no está garantizado.

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseISODate(fecha: string): Date {
  const [year, month, day] = fecha.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Letra de día al estilo del backend original (L,M,X,J,V,S,D — X=miércoles
// para no chocar con M=martes). Date.getDay() de JS es 0=domingo..6=sábado,
// la inversa de weekday() de Python (0=lunes) que usaba el backend — este es
// el mapeo correcto para JS, no una traducción directa de aquel.
const DIAS_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export function diaLetra(fecha: string): string {
  return DIAS_LETRA[parseISODate(fecha).getDay()]
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDays(fecha: string, delta: number): string {
  const date = parseISODate(fecha)
  date.setDate(date.getDate() + delta)
  return toISODate(date)
}

export function formatDisplay(fecha: string): string {
  const date = parseISODate(fecha)
  const dia = DIAS[date.getDay()]
  const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1)
  return `${diaCapitalizado}, ${date.getDate()} de ${MESES[date.getMonth()]}`
}

export function daysAgoISO(days: number): string {
  return addDays(todayISO(), -days)
}

export function buildDateRange(fechaInicio: string, fechaFin: string): string[] {
  const dates: string[] = []
  let cursor = fechaInicio
  while (cursor <= fechaFin) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function daysInMonth(year: number, month: number): number {
  // month es 1-12; día 0 del mes siguiente = último día de este mes.
  return new Date(year, month, 0).getDate()
}

// Índice 0=lunes..6=domingo del primer día del mes (para alinear la grilla
// del calendario con encabezado L,M,X,J,V,S,D).
export function firstWeekdayMondayIndex(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay() // 0=domingo..6=sábado
  return (jsDay + 6) % 7
}

export function fechaISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function nombreMes(month: number): string {
  return MESES[month - 1]
}
