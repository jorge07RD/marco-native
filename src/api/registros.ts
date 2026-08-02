import { execute, query, queryOne } from '../db/native'
import { nowISO, toBool } from '../db/util'
import { diaEnLista } from './diasUtil'
import { diaLetra, todayISO } from '../lib/date'
import { getUsuarioActual } from './perfil'
import type { Habito, ProgresoHabito, RegistroConProgresos } from './types'

interface RegistroRow {
  id: number
  usuario_id: number
  fecha: string
  notas: string | null
  created_at: string
  updated_at: string | null
}

function progresoRowToProgreso(row: {
  id: number
  registro_id: number
  habito_id: number
  valor: number
  completado: number
  created_at: string
  updated_at: string | null
}): ProgresoHabito {
  return { ...row, completado: toBool(row.completado), updated_at: row.updated_at ?? row.created_at }
}

export async function getRegistroPorFecha(fecha: string): Promise<RegistroConProgresos> {
  const perfil = await getUsuarioActual()
  if (fecha > todayISO() && !perfil.ver_futuro) {
    throw new Error('No puedes ver fechas futuras')
  }

  let registro = await queryOne<RegistroRow>('SELECT * FROM registros WHERE fecha = ?', [fecha])

  if (!registro) {
    const now = nowISO()
    const { insertId } = await execute('INSERT INTO registros (usuario_id, fecha, created_at) VALUES (1, ?, ?)', [
      fecha,
      now,
    ])
    const diaDeFecha = diaLetra(fecha)
    const habitosActivos = await query<Habito>('SELECT * FROM habitos WHERE activo = 1')
    for (const habito of habitosActivos) {
      if (diaEnLista(habito.dias, diaDeFecha)) {
        await execute(
          'INSERT INTO progreso_habitos (registro_id, habito_id, valor, completado, created_at) VALUES (?, ?, 0, 0, ?)',
          [insertId, habito.id, now],
        )
      }
    }
    registro = { id: insertId, usuario_id: 1, fecha, notas: null, created_at: now, updated_at: null }
  }

  const progresos = await query<{
    id: number
    registro_id: number
    habito_id: number
    valor: number
    completado: number
    created_at: string
    updated_at: string | null
  }>('SELECT * FROM progreso_habitos WHERE registro_id = ?', [registro.id])

  return {
    id: registro.id,
    usuario_id: registro.usuario_id,
    fecha: registro.fecha,
    notas: registro.notas,
    created_at: registro.created_at,
    updated_at: registro.updated_at ?? registro.created_at,
    progresos: progresos.map(progresoRowToProgreso),
  }
}

export async function toggleProgreso(progresoId: number): Promise<unknown> {
  const progreso = await queryOne<{ id: number; habito_id: number; completado: number }>(
    'SELECT id, habito_id, completado FROM progreso_habitos WHERE id = ?',
    [progresoId],
  )
  if (!progreso) throw new Error('Progreso no encontrado')

  const now = nowISO()
  if (progreso.completado === 1) {
    await execute('UPDATE progreso_habitos SET completado = 0, valor = 0, updated_at = ? WHERE id = ?', [
      now,
      progresoId,
    ])
  } else {
    const habito = await queryOne<{ meta_diaria: number }>('SELECT meta_diaria FROM habitos WHERE id = ?', [
      progreso.habito_id,
    ])
    const valor = habito ? habito.meta_diaria : 1
    await execute('UPDATE progreso_habitos SET completado = 1, valor = ?, updated_at = ? WHERE id = ?', [
      valor,
      now,
      progresoId,
    ])
  }
  return { ok: true }
}

/**
 * Registro parcial: guarda cuánto se cumplió de la meta (28 de 30 minutos).
 *
 * `completado` deja de ser algo que el usuario alterna y pasa a derivarse del
 * valor — así el toggle de un tap y el valor parcial no pueden contradecirse.
 * No hace falta migrar nada: `valor` ya es una columna REAL del schema.
 *
 * El valor no se recorta hacia arriba a propósito: si alguien leyó 35 de 30
 * minutos, se guarda 35 y el hábito queda completado. Quien acota el aporte al
 * día a un máximo de 1 es `fraccionProgreso`, no la base de datos.
 */
export async function setProgresoValor(progresoId: number, valor: number): Promise<unknown> {
  const progreso = await queryOne<{ id: number; habito_id: number }>(
    'SELECT id, habito_id FROM progreso_habitos WHERE id = ?',
    [progresoId],
  )
  if (!progreso) throw new Error('Progreso no encontrado')

  const habito = await queryOne<{ meta_diaria: number }>('SELECT meta_diaria FROM habitos WHERE id = ?', [
    progreso.habito_id,
  ])
  const meta = habito ? habito.meta_diaria : 0
  const valorLimpio = Number.isFinite(valor) && valor > 0 ? valor : 0
  const completado = meta > 0 && valorLimpio >= meta ? 1 : 0

  await execute('UPDATE progreso_habitos SET valor = ?, completado = ?, updated_at = ? WHERE id = ?', [
    valorLimpio,
    completado,
    nowISO(),
    progresoId,
  ])
  return { ok: true }
}
