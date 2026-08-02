import type { RendimientoDia } from '../api/types'

export interface MonthStat {
  /** 1-12 */
  month: number
  label: string
  /** 0..1; 0 también cuando el mes no tiene ningún día registrado. */
  pct: number
  /** Distingue el mes vacío del mes que sí tuvo datos y salió en cero. */
  conDatos: boolean
}

const ETIQUETAS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Agrega el rendimiento diario en los doce meses del año.
 *
 * El porcentaje del mes es la suma de cumplidos entre la suma de programados,
 * no el promedio de los porcentajes diarios: así un día con diez hábitos pesa
 * diez veces más que uno con uno solo, que es lo que hace comparable un mes
 * con otro.
 *
 * Devuelve siempre doce entradas para que la gráfica tenga el año completo
 * aunque falten meses; los que faltan van marcados con `conDatos: false`.
 */
export function deriveMonthStats(data: RendimientoDia[], year: number): MonthStat[] {
  const acumulado = new Map<number, { total: number; hechos: number }>()
  for (const dia of data) {
    const [y, m] = dia.fecha.split('-').map(Number)
    if (y !== year) continue
    const previo = acumulado.get(m) ?? { total: 0, hechos: 0 }
    previo.total += dia.habitos
    previo.hechos += dia.habitos_completados
    acumulado.set(m, previo)
  }

  return ETIQUETAS.map((label, i) => {
    const mes = acumulado.get(i + 1)
    return {
      month: i + 1,
      label,
      pct: mes && mes.total > 0 ? mes.hechos / mes.total : 0,
      conDatos: mes !== undefined && mes.total > 0,
    }
  })
}
