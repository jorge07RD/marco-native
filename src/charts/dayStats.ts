import type { RendimientoDia } from '../api/types'
import { buildDateRange } from '../lib/date'

export interface DayStat {
  fecha: string
  label: string
  pct: number // 0..1
}

export function deriveDayStats(data: RendimientoDia[], fechaInicio: string, fechaFin: string): DayStat[] {
  const porFecha = new Map(data.map((r) => [r.fecha, r]))
  return buildDateRange(fechaInicio, fechaFin).map((fecha) => {
    const info = porFecha.get(fecha)
    const total = info?.habitos ?? 0
    const completados = info?.habitos_completados ?? 0
    return {
      fecha,
      label: fecha.split('-')[2] ?? '',
      pct: total > 0 ? completados / total : 0,
    }
  })
}
