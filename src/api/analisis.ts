// A propósito NO filtran por habito.activo — ver nota en el plan de
// migración (inconsistencia real del backend original, se mantiene para no
// alterar cómo se ven las gráficas ya validadas).
import { query } from '../db/native'
import { diaEnLista } from './diasUtil'
import { diaLetra } from '../lib/date'
import type { CumplimientoHabito, Habito, RendimientoDia } from './types'

export async function getRendimientoPorDia(fechaInicio: string, fechaFin: string): Promise<RendimientoDia[]> {
  const fechas = await query<{ fecha: string }>(
    'SELECT DISTINCT fecha FROM registros WHERE fecha BETWEEN ? AND ? ORDER BY fecha',
    [fechaInicio, fechaFin],
  )
  const habitosList = await query<Habito>('SELECT * FROM habitos')
  const registros = await query<{ id: number; fecha: string }>(
    'SELECT id, fecha FROM registros WHERE fecha BETWEEN ? AND ?',
    [fechaInicio, fechaFin],
  )
  const registroIdPorFecha = new Map(registros.map((r) => [r.fecha, r.id]))

  const completadosPorRegistro = new Map<number, number>()
  if (registros.length > 0) {
    const placeholders = registros.map(() => '?').join(', ')
    const filas = await query<{ registro_id: number; n: number }>(
      `SELECT registro_id, COUNT(*) as n FROM progreso_habitos
       WHERE completado = 1 AND registro_id IN (${placeholders}) GROUP BY registro_id`,
      registros.map((r) => r.id),
    )
    for (const f of filas) completadosPorRegistro.set(f.registro_id, f.n)
  }

  const resultado: RendimientoDia[] = []
  for (const { fecha } of fechas) {
    const letra = diaLetra(fecha)
    const habitosDelDia = habitosList.filter(
      (h) => diaEnLista(h.dias, letra) && h.created_at.slice(0, 10) <= fecha,
    )
    const registroId = registroIdPorFecha.get(fecha)
    const completados = registroId !== undefined ? (completadosPorRegistro.get(registroId) ?? 0) : 0
    resultado.push({ fecha, habitos: habitosDelDia.length, habitos_completados: completados })
  }
  return resultado
}

export async function getCumplimientoHabitos(
  fechaInicio: string,
  fechaFin: string,
): Promise<CumplimientoHabito[]> {
  const fechasRows = await query<{ fecha: string }>(
    'SELECT DISTINCT fecha FROM registros WHERE fecha BETWEEN ? AND ? ORDER BY fecha',
    [fechaInicio, fechaFin],
  )
  const fechas = fechasRows.map((r) => r.fecha)
  if (fechas.length === 0) return []

  const habitosList = await query<Habito>('SELECT * FROM habitos')
  const registros = await query<{ id: number; fecha: string }>(
    'SELECT id, fecha FROM registros WHERE fecha BETWEEN ? AND ?',
    [fechaInicio, fechaFin],
  )
  const registroIdPorFecha = new Map(registros.map((r) => [r.fecha, r.id]))

  // completadoPorClave: "registroId:habitoId" -> completado, una sola consulta
  // en vez de una por cada par (hábito, fecha).
  const completadoPorClave = new Map<string, boolean>()
  if (registros.length > 0) {
    const placeholders = registros.map(() => '?').join(', ')
    const filas = await query<{ registro_id: number; habito_id: number; completado: number }>(
      `SELECT registro_id, habito_id, completado FROM progreso_habitos WHERE registro_id IN (${placeholders})`,
      registros.map((r) => r.id),
    )
    for (const f of filas) completadoPorClave.set(`${f.registro_id}:${f.habito_id}`, f.completado === 1)
  }

  const resultado: CumplimientoHabito[] = []
  for (const habito of habitosList) {
    let total = 0
    let completados = 0
    let fechaPrimera: string | null = null
    for (const fecha of fechas) {
      if (habito.created_at.slice(0, 10) > fecha) continue
      if (!diaEnLista(habito.dias, diaLetra(fecha))) continue
      total += 1
      if (fechaPrimera === null) fechaPrimera = fecha
      const registroId = registroIdPorFecha.get(fecha)
      if (registroId !== undefined && completadoPorClave.get(`${registroId}:${habito.id}`)) {
        completados += 1
      }
    }
    if (total > 0 && fechaPrimera) {
      resultado.push({
        fecha: fechaPrimera,
        nombre_habito: habito.nombre,
        habitos_completados: completados,
        total_habitos: total,
        color: habito.color,
      })
    }
  }
  return resultado
}
