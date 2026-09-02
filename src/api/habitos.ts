import { execute, query, queryOne, type SqlParam } from '../db/native'
import { nowISO } from '../db/util'
import { diaEnLista } from './diasUtil'
import { diaLetra, todayISO } from '../lib/date'
import type { Habito, HabitoCreate, HabitoUpdate } from './types'

async function agregarHabitoARegistroHoy(habitoId: number): Promise<void> {
  const registro = await queryOne<{ id: number }>('SELECT id FROM registros WHERE fecha = ?', [todayISO()])
  if (!registro) return
  const existente = await queryOne(
    'SELECT id FROM progreso_habitos WHERE registro_id = ? AND habito_id = ?',
    [registro.id, habitoId],
  )
  if (existente) return
  const habito = await queryOne<{ marcado_por_defecto: number; meta_diaria: number }>(
    'SELECT marcado_por_defecto, meta_diaria FROM habitos WHERE id = ?',
    [habitoId],
  )
  const completado = habito?.marcado_por_defecto === 1 ? 1 : 0
  const valor = completado === 1 ? habito!.meta_diaria : 0
  await execute(
    'INSERT INTO progreso_habitos (registro_id, habito_id, valor, completado, created_at) VALUES (?, ?, ?, ?, ?)',
    [registro.id, habitoId, valor, completado, nowISO()],
  )
}

async function quitarHabitoDeRegistroHoy(habitoId: number): Promise<void> {
  const registro = await queryOne<{ id: number }>('SELECT id FROM registros WHERE fecha = ?', [todayISO()])
  if (!registro) return
  await execute('DELETE FROM progreso_habitos WHERE registro_id = ? AND habito_id = ?', [registro.id, habitoId])
}

export const getHabitos = (incluirOcultos = false): Promise<Habito[]> =>
  query<Habito>(`SELECT * FROM habitos ${incluirOcultos ? '' : 'WHERE oculto = 0'} ORDER BY id`)

export async function createHabito(body: HabitoCreate): Promise<Habito> {
  const activo = body.activo ?? 1
  const oculto = body.oculto ?? 0
  const marcadoPorDefecto = body.marcado_por_defecto ?? 0
  const now = nowISO()
  const { insertId } = await execute(
    `INSERT INTO habitos
       (nombre, descripcion, categoria_id, usuario_id, unidad_medida, meta_diaria, dias, color, activo, oculto, marcado_por_defecto, created_at)
     VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.nombre,
      body.descripcion ?? null,
      body.categoria_id,
      body.unidad_medida,
      body.meta_diaria,
      body.dias,
      body.color,
      activo,
      oculto,
      marcadoPorDefecto,
      now,
    ],
  )

  const diaHoy = diaLetra(todayISO())
  if (activo === 1 && diaEnLista(body.dias, diaHoy)) {
    await agregarHabitoARegistroHoy(insertId)
  }

  const row = await queryOne<Habito>('SELECT * FROM habitos WHERE id = ?', [insertId])
  if (!row) throw new Error('No se pudo crear el hábito')
  return row
}

export async function updateHabito(id: number, body: HabitoUpdate): Promise<Habito> {
  const antes = await queryOne<Habito>('SELECT * FROM habitos WHERE id = ?', [id])
  if (!antes) throw new Error('Hábito no encontrado')

  const sets: string[] = []
  const params: SqlParam[] = []
  const campos: (keyof HabitoUpdate)[] = [
    'nombre',
    'descripcion',
    'categoria_id',
    'unidad_medida',
    'meta_diaria',
    'dias',
    'color',
    'activo',
    'oculto',
    'marcado_por_defecto',
  ]
  for (const campo of campos) {
    const valor = body[campo]
    if (valor !== undefined) {
      sets.push(`${campo} = ?`)
      params.push(valor as SqlParam)
    }
  }
  sets.push('updated_at = ?')
  params.push(nowISO())
  params.push(id)
  await execute(`UPDATE habitos SET ${sets.join(', ')} WHERE id = ?`, params)

  const despues = await queryOne<Habito>('SELECT * FROM habitos WHERE id = ?', [id])
  if (!despues) throw new Error('Hábito no encontrado')

  const diaHoy = diaLetra(todayISO())
  const estabaEnHoy = antes.activo === 1 && diaEnLista(antes.dias, diaHoy)
  const estaEnHoy = despues.activo === 1 && diaEnLista(despues.dias, diaHoy)
  if (!estabaEnHoy && estaEnHoy) await agregarHabitoARegistroHoy(id)
  else if (estabaEnHoy && !estaEnHoy) await quitarHabitoDeRegistroHoy(id)

  return despues
}

export async function deleteHabito(id: number): Promise<void> {
  await execute('DELETE FROM progreso_habitos WHERE habito_id = ?', [id])
  await execute('DELETE FROM habitos WHERE id = ?', [id])
}
