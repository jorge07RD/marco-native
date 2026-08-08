// Perfil local (reemplaza auth: un solo perfil, sin contraseña/servidor).
import { execute, queryOne, type SqlParam } from '../db/native'
import { nowISO, toBool, toInt } from '../db/util'
import { sembrarDatosDeEjemplo } from './semilla'
import type { UsuarioResponse, UsuarioUpdate } from './types'

interface PerfilRow {
  id: number
  nombre: string
  ver_futuro: number
  notificaciones_activas: number
  hora_recordatorio: string
  mostrar_ocultos: number
  created_at: string
  updated_at: string | null
}

function perfilRowToUsuario(row: PerfilRow): UsuarioResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    ver_futuro: toBool(row.ver_futuro),
    notificaciones_activas: toBool(row.notificaciones_activas),
    hora_recordatorio: row.hora_recordatorio,
    mostrar_ocultos: toBool(row.mostrar_ocultos),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  }
}

export async function existePerfil(): Promise<boolean> {
  const row = await queryOne('SELECT id FROM perfil WHERE id = 1')
  return row !== null
}

export async function crearPerfil(nombre: string): Promise<UsuarioResponse> {
  await execute(
    'INSERT INTO perfil (id, nombre, ver_futuro, notificaciones_activas, hora_recordatorio, created_at) VALUES (1, ?, 0, 0, ?, ?)',
    [nombre, '08:00', nowISO()],
  )
  // Los hábitos de ejemplo no pueden tumbar el alta: si algo falla al
  // sembrarlos, la cuenta ya está creada y entrar a una app vacía es mucho
  // mejor que quedarse fuera con el perfil a medio hacer.
  await sembrarDatosDeEjemplo().catch(() => undefined)
  return getUsuarioActual()
}

export async function getUsuarioActual(): Promise<UsuarioResponse> {
  const row = await queryOne<PerfilRow>('SELECT * FROM perfil WHERE id = 1')
  if (!row) throw new Error('No hay perfil creado todavía')
  return perfilRowToUsuario(row)
}

export async function updateUsuarioActual(body: UsuarioUpdate): Promise<UsuarioResponse> {
  const sets: string[] = []
  const params: SqlParam[] = []
  if (body.nombre !== undefined) {
    sets.push('nombre = ?')
    params.push(body.nombre)
  }
  if (body.ver_futuro !== undefined) {
    sets.push('ver_futuro = ?')
    params.push(toInt(body.ver_futuro))
  }
  if (body.notificaciones_activas !== undefined) {
    sets.push('notificaciones_activas = ?')
    params.push(toInt(body.notificaciones_activas))
  }
  if (body.hora_recordatorio !== undefined) {
    sets.push('hora_recordatorio = ?')
    params.push(body.hora_recordatorio)
  }
  if (body.mostrar_ocultos !== undefined) {
    sets.push('mostrar_ocultos = ?')
    params.push(toInt(body.mostrar_ocultos))
  }
  sets.push('updated_at = ?')
  params.push(nowISO())
  params.push(1)
  await execute(`UPDATE perfil SET ${sets.join(', ')} WHERE id = ?`, params)
  return getUsuarioActual()
}

export async function eliminarTodosLosDatos(): Promise<void> {
  await execute('DELETE FROM progreso_habitos')
  await execute('DELETE FROM registros')
}

export async function eliminarCuenta(): Promise<void> {
  await execute('DELETE FROM progreso_habitos')
  await execute('DELETE FROM registros')
  await execute('DELETE FROM habitos')
  await execute('DELETE FROM categorias')
  await execute('DELETE FROM perfil')
}
