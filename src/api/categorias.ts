import { execute, query, queryOne } from '../db/native'
import { nowISO } from '../db/util'
import type { Categoria, CategoriaCreate } from './types'

export const getCategorias = (): Promise<Categoria[]> => query<Categoria>('SELECT * FROM categorias ORDER BY nombre')

export async function createCategoria(body: CategoriaCreate): Promise<Categoria> {
  const existente = await queryOne('SELECT id FROM categorias WHERE nombre = ?', [body.nombre])
  if (existente) throw new Error('Ya existe una categoría con ese nombre')
  const now = nowISO()
  const { insertId } = await execute('INSERT INTO categorias (nombre, created_at) VALUES (?, ?)', [
    body.nombre,
    now,
  ])
  return { id: insertId, nombre: body.nombre, created_at: now, updated_at: null }
}

export async function updateCategoria(id: number, body: CategoriaCreate): Promise<Categoria> {
  await execute('UPDATE categorias SET nombre = ?, updated_at = ? WHERE id = ?', [body.nombre, nowISO(), id])
  const row = await queryOne<Categoria>('SELECT * FROM categorias WHERE id = ?', [id])
  if (!row) throw new Error('Categoría no encontrada')
  return row
}

export async function deleteCategoria(id: number): Promise<void> {
  await execute('DELETE FROM categorias WHERE id = ?', [id])
}
