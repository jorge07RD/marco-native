import type { CumplimientoHabito } from '../api/types'

export interface HabitoStat {
  id: number
  nombre: string
  color: string
  completados: number
  total: number
  pct: number // 0..1
}

export function deriveHabitoStats(data: CumplimientoHabito[]): HabitoStat[] {
  return data.map((d, i) => ({
    id: i,
    nombre: d.nombre_habito,
    color: d.color,
    completados: d.habitos_completados,
    total: d.total_habitos,
    pct: d.total_habitos > 0 ? d.habitos_completados / d.total_habitos : 0,
  }))
}

export function formatPct(pct: number): string {
  return `${Math.round(pct * 100)}%`
}

/** Conteo de cumplidos para mostrar. Desde que existe el registro parcial ya no
 *  es un entero (0.75 de un día leído a medias), así que se corta a un decimal
 *  al pintarlo — nunca antes, o el porcentaje derivado sale desviado. */
export function formatCantidad(n: number): string {
  return String(Math.round(n * 10) / 10)
}
