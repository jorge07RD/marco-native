import { query } from '../db/native'
import { diaEnLista } from './diasUtil'
import { daysInMonth, diaLetra, fechaISO } from '../lib/date'
import { fraccionProgreso } from '../lib/progreso'
import type { Habito, ProgresoDiaCalendario } from './types'

/**
 * Progreso diario de un mes para el calendario.
 *
 * `habitoIds` restringe el cálculo a un subconjunto de hábitos (el filtro de la
 * pantalla). Sin él, cuenta todos. Antes había una segunda función
 * `getProgresoMesHabito` para el caso filtrado, que devolvía un booleano
 * completado/no en vez de un porcentaje; se eliminó porque con el filtro
 * expresado como porcentaje los dos casos son el mismo y el calendario puede
 * usar una sola escala de color para ambos.
 */
export async function getProgresoMes(
  year: number,
  month: number,
  habitoIds?: number[],
): Promise<ProgresoDiaCalendario[]> {
  const totalDias = daysInMonth(year, month)
  const primerDia = fechaISO(year, month, 1)
  const ultimoDia = fechaISO(year, month, totalDias)
  const filtro = habitoIds && habitoIds.length > 0 ? habitoIds : null

  // Se traen todos los hábitos, no solo los activos: la meta hace falta para
  // repartir el valor parcial de cualquier fila de progreso guardada, incluso
  // si el hábito se desactivó después. El filtro por `activo` sigue aplicando
  // donde importaba, en la programación teórica de los días sin registro.
  const habitosTodos = await query<Habito>('SELECT * FROM habitos')
  const metaPorHabito = new Map(habitosTodos.map((h) => [h.id, h.meta_diaria]))
  const habitosUsuario = habitosTodos.filter((h) => h.activo === 1)
  const habitosFiltrados = filtro ? habitosUsuario.filter((h) => filtro.includes(h.id)) : habitosUsuario

  const registrosMes = await query<{ id: number; fecha: string }>(
    'SELECT id, fecha FROM registros WHERE fecha BETWEEN ? AND ?',
    [primerDia, ultimoDia],
  )
  const registroPorFecha = new Map(registrosMes.map((r) => [r.fecha, r]))

  // Se cuentan las dos cosas por registro: cuántos hábitos se guardaron ese
  // día y cuánto se cumplió. El total importa tanto como los hechos — ver el
  // comentario del denominador más abajo.
  //
  // La suma se hace en JS y no con un SUM en SQL porque `hechos` ya no es un
  // conteo de completados sino la suma de fracciones, y esa fórmula tiene que
  // ser la misma que usan el Dashboard y Análisis. Vive una sola vez, en
  // `fraccionProgreso`; duplicarla en SQL es justo cómo los tres consumidores
  // se desincronizan.
  const conteoPorRegistro = new Map<number, { total: number; hechos: number }>()
  if (registrosMes.length > 0) {
    const regPlaceholders = registrosMes.map(() => '?').join(', ')
    const habPlaceholders = filtro ? filtro.map(() => '?').join(', ') : ''
    const filas = await query<{
      registro_id: number
      habito_id: number
      valor: number
      completado: number
    }>(
      `SELECT registro_id, habito_id, valor, completado
       FROM progreso_habitos
       WHERE registro_id IN (${regPlaceholders})
       ${filtro ? `AND habito_id IN (${habPlaceholders})` : ''}`,
      filtro ? [...registrosMes.map((r) => r.id), ...filtro] : registrosMes.map((r) => r.id),
    )
    for (const fila of filas) {
      const acumulado = conteoPorRegistro.get(fila.registro_id) ?? { total: 0, hechos: 0 }
      acumulado.total += 1
      acumulado.hechos += fraccionProgreso(
        fila.valor,
        metaPorHabito.get(fila.habito_id) ?? 0,
        fila.completado === 1,
      )
      conteoPorRegistro.set(fila.registro_id, acumulado)
    }
  }

  const resultado: ProgresoDiaCalendario[] = []
  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = fechaISO(year, month, dia)
    const letra = diaLetra(fecha)
    const registro = registroPorFecha.get(fecha)
    const conteo = registro ? conteoPorRegistro.get(registro.id) : undefined

    // Denominador: si el día TIENE registro, lo que vale es cuántos hábitos se
    // guardaron ese día, no cuántos estarían programados hoy. La regla de
    // "hábitos programados" mira `created_at <= fecha`, así que en cuanto un
    // hábito se crea (o se restaura un backup, que reescribe created_at) todos
    // los días anteriores con progreso real se quedaban con total 0 → 0% → el
    // calendario los pintaba como si no existieran. La programación teórica
    // solo se usa ya para los días sin registro.
    const habitosDelDia = habitosFiltrados.filter((h) => diaEnLista(h.dias, letra))
    const totalHabitos = conteo ? conteo.total : habitosDelDia.length
    const habitosCompletados = conteo ? conteo.hechos : 0
    const porcentaje = totalHabitos > 0 ? Math.round((habitosCompletados / totalHabitos) * 1000) / 10 : 0

    resultado.push({
      fecha,
      total_habitos: totalHabitos,
      // Sin redondear: es el numerador de los porcentajes que derivan las
      // gráficas. Quien redondea es el render — ver formatCantidad.
      habitos_completados: habitosCompletados,
      porcentaje,
      // "Hay algo que reportar este día", no "existe el registro del día": con
      // un filtro activo, un día en que no tocaba ninguno de los hábitos
      // elegidos debe salir neutro, no registrado al 0%.
      tiene_registro: conteo !== undefined && conteo.total > 0,
    })
  }
  return resultado
}
