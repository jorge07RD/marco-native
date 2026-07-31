import { query, queryOne } from '../db/native'
import { diaEnLista } from './diasUtil'
import { daysInMonth, diaLetra, fechaISO } from '../lib/date'
import type { Habito, ProgresoDiaCalendario, ProgresoHabitoDiaCalendario } from './types'

export async function getProgresoMes(year: number, month: number): Promise<ProgresoDiaCalendario[]> {
  const totalDias = daysInMonth(year, month)
  const primerDia = fechaISO(year, month, 1)
  const ultimoDia = fechaISO(year, month, totalDias)

  const habitosUsuario = await query<Habito>('SELECT * FROM habitos WHERE activo = 1 AND created_at <= ?', [
    `${ultimoDia}T23:59:59.999Z`,
  ])
  const registrosMes = await query<{ id: number; fecha: string }>(
    'SELECT id, fecha FROM registros WHERE fecha BETWEEN ? AND ?',
    [primerDia, ultimoDia],
  )
  const registroPorFecha = new Map(registrosMes.map((r) => [r.fecha, r]))

  const progresosPorRegistro = new Map<number, number>()
  if (registrosMes.length > 0) {
    const placeholders = registrosMes.map(() => '?').join(', ')
    const completados = await query<{ registro_id: number; n: number }>(
      `SELECT registro_id, COUNT(*) as n FROM progreso_habitos
       WHERE completado = 1 AND registro_id IN (${placeholders}) GROUP BY registro_id`,
      registrosMes.map((r) => r.id),
    )
    for (const c of completados) progresosPorRegistro.set(c.registro_id, c.n)
  }

  const resultado: ProgresoDiaCalendario[] = []
  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = fechaISO(year, month, dia)
    const letra = diaLetra(fecha)
    const habitosDelDia = habitosUsuario.filter(
      (h) => h.created_at.slice(0, 10) <= fecha && diaEnLista(h.dias, letra),
    )
    const totalHabitos = habitosDelDia.length
    const registro = registroPorFecha.get(fecha)
    const habitosCompletados = registro ? (progresosPorRegistro.get(registro.id) ?? 0) : 0
    const porcentaje = totalHabitos > 0 ? Math.round((habitosCompletados / totalHabitos) * 1000) / 10 : 0
    resultado.push({
      fecha,
      total_habitos: totalHabitos,
      habitos_completados: habitosCompletados,
      porcentaje,
      tiene_registro: registro !== undefined,
    })
  }
  return resultado
}

export async function getProgresoMesHabito(
  year: number,
  month: number,
  habitoId: number,
): Promise<ProgresoHabitoDiaCalendario[]> {
  const habito = await queryOne<Habito>('SELECT * FROM habitos WHERE id = ?', [habitoId])
  if (!habito) throw new Error('Hábito no encontrado')
  const totalDias = daysInMonth(year, month)
  const primerDia = fechaISO(year, month, 1)
  const ultimoDia = fechaISO(year, month, totalDias)

  const registrosMes = await query<{ id: number; fecha: string }>(
    'SELECT id, fecha FROM registros WHERE fecha BETWEEN ? AND ?',
    [primerDia, ultimoDia],
  )
  const registroIdPorFecha = new Map(registrosMes.map((r) => [r.fecha, r.id]))

  const completadoPorRegistro = new Map<number, boolean>()
  if (registrosMes.length > 0) {
    const placeholders = registrosMes.map(() => '?').join(', ')
    const progresos = await query<{ registro_id: number; completado: number }>(
      `SELECT registro_id, completado FROM progreso_habitos
       WHERE habito_id = ? AND registro_id IN (${placeholders})`,
      [habitoId, ...registrosMes.map((r) => r.id)],
    )
    for (const p of progresos) completadoPorRegistro.set(p.registro_id, p.completado === 1)
  }

  const resultado: ProgresoHabitoDiaCalendario[] = []
  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = fechaISO(year, month, dia)
    const programado = diaEnLista(habito.dias, diaLetra(fecha)) && habito.created_at.slice(0, 10) <= fecha
    const registroId = registroIdPorFecha.get(fecha)
    const completado = registroId !== undefined ? (completadoPorRegistro.get(registroId) ?? false) : false
    resultado.push({ fecha, completado, programado })
  }
  return resultado
}
