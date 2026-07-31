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

  const conteoPorRegistro = new Map<number, { total: number; hechos: number }>()
  if (registros.length > 0) {
    const placeholders = registros.map(() => '?').join(', ')
    const filas = await query<{ registro_id: number; total: number; hechos: number }>(
      `SELECT registro_id, COUNT(*) as total,
              SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) as hechos
       FROM progreso_habitos WHERE registro_id IN (${placeholders}) GROUP BY registro_id`,
      registros.map((r) => r.id),
    )
    for (const f of filas) conteoPorRegistro.set(f.registro_id, { total: f.total, hechos: f.hechos })
  }

  const resultado: RendimientoDia[] = []
  for (const { fecha } of fechas) {
    const registroId = registroIdPorFecha.get(fecha)
    const conteo = registroId !== undefined ? conteoPorRegistro.get(registroId) : undefined

    // Denominador: los hábitos que realmente se guardaron ese día. La regla de
    // `created_at <= fecha` dejaba en cero todos los días anteriores a la
    // creación del hábito, así que la gráfica salía plana en 0 para todo el
    // historial. Solo se recurre a la programación teórica si el día tiene
    // registro pero ninguna fila de progreso (caso degenerado).
    const letra = diaLetra(fecha)
    const habitosDelDia = habitosList.filter((h) => diaEnLista(h.dias, letra))
    resultado.push({
      fecha,
      habitos: conteo ? conteo.total : habitosDelDia.length,
      habitos_completados: conteo ? conteo.hechos : 0,
    })
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
    // `fechas` solo trae días que tienen registro, así que la existencia de la
    // fila de progreso es la señal de que ese día le tocaba a este hábito.
    // Antes se decidía con `created_at` + `dias`, y `created_at` descartaba
    // todo el historial anterior a la creación del hábito: cada tarjeta salía
    // con total 1 (solo hoy) por muchos meses de datos que hubiera.
    for (const fecha of fechas) {
      const registroId = registroIdPorFecha.get(fecha)
      if (registroId === undefined) continue
      const clave = `${registroId}:${habito.id}`
      if (!completadoPorClave.has(clave)) continue
      total += 1
      if (fechaPrimera === null) fechaPrimera = fecha
      if (completadoPorClave.get(clave)) completados += 1
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
