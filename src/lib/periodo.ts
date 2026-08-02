// Qué tramo de tiempo mira Análisis. Vive aparte de date.ts porque no es
// aritmética de fechas sino la política de la pantalla: dónde corta un periodo
// en curso y contra qué se compara.
import { addDays, daysAgoISO, daysInMonth, fechaISO, nombreMes, todayISO } from './date'

export type Periodo =
  | { tipo: 'dias'; dias: number }
  /** `month` va de 1 a 12, igual que en `fechaISO` y `nombreMes`. */
  | { tipo: 'mes'; year: number; month: number }
  | { tipo: 'anio'; year: number }

export interface Rango {
  inicio: string
  fin: string
  /** Para titular la pantalla y el bloque de comparación. */
  etiqueta: string
}

/** El mes en curso: el periodo con el que arranca Análisis y al que se entra al
 *  pulsar «Mes». */
export function mesActual(): Periodo {
  const [year, month] = todayISO().split('-').map(Number)
  return { tipo: 'mes', year, month }
}

/** El año en curso, al que se entra al pulsar «Año». */
export function anioActual(): Periodo {
  return { tipo: 'anio', year: Number(todayISO().slice(0, 4)) }
}

/** Días que cubre un rango, ambos extremos incluidos. */
function longitud(inicio: string, fin: string): number {
  let n = 0
  let cursor = inicio
  while (cursor <= fin) {
    n += 1
    cursor = addDays(cursor, 1)
  }
  return n
}

/** El fin de un periodo nunca pasa de hoy.
 *
 *  `deriveDayStats` rellena con 0 todos los días del rango que no tienen
 *  registro, así que un mes en curso que llegara hasta el 31 pintaría media
 *  gráfica en cero — ceros que no son datos, son futuro. */
function sinFuturo(fin: string): string {
  const hoy = todayISO()
  return fin > hoy ? hoy : fin
}

export function rangoDe(periodo: Periodo): Rango {
  if (periodo.tipo === 'dias') {
    return {
      inicio: daysAgoISO(periodo.dias - 1),
      fin: todayISO(),
      etiqueta: `${periodo.dias} días`,
    }
  }
  if (periodo.tipo === 'mes') {
    const { year, month } = periodo
    return {
      inicio: fechaISO(year, month, 1),
      fin: sinFuturo(fechaISO(year, month, daysInMonth(year, month))),
      etiqueta: `${nombreMes(month)} ${year}`,
    }
  }
  return {
    inicio: fechaISO(periodo.year, 1, 1),
    fin: sinFuturo(fechaISO(periodo.year, 12, 31)),
    etiqueta: String(periodo.year),
  }
}

/** El periodo inmediatamente anterior del mismo tamaño: contra esto compara la
 *  pantalla. Cubre el salto de año hacia atrás (enero → diciembre del anterior). */
export function periodoAnterior(periodo: Periodo): Periodo {
  if (periodo.tipo === 'dias') return periodo
  if (periodo.tipo === 'mes') {
    const anterior = periodo.month === 1
      ? { year: periodo.year - 1, month: 12 }
      : { year: periodo.year, month: periodo.month - 1 }
    return { tipo: 'mes', ...anterior }
  }
  return { tipo: 'anio', year: periodo.year - 1 }
}

/** Rango del periodo anterior, recortado a los mismos días que el actual.
 *
 *  Si agosto va por el día 2, la comparación es contra el 1 y 2 de julio, no
 *  contra julio entero: dos días de datos frente a treinta y uno no comparan
 *  nada, solo hacen que el mes en curso parezca siempre peor. Lo mismo con el
 *  año en curso frente al anterior completo. */
export function rangoAnteriorDe(periodo: Periodo): Rango {
  const actual = rangoDe(periodo)
  const dias = longitud(actual.inicio, actual.fin)

  if (periodo.tipo === 'dias') {
    const fin = addDays(actual.inicio, -1)
    return {
      inicio: addDays(fin, -(dias - 1)),
      fin,
      etiqueta: `${dias} días previos`,
    }
  }

  const previo = rangoDe(periodoAnterior(periodo))
  // Se recorta por el final y no por el principio: los dos periodos tienen que
  // empezar en su día 1 para que "lo que llevo de mes" se compare con "lo que
  // llevaba el mes pasado a estas alturas".
  const finRecortado = addDays(previo.inicio, dias - 1)
  return {
    ...previo,
    fin: finRecortado < previo.fin ? finRecortado : previo.fin,
  }
}
