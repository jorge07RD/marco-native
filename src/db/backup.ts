// Exportar/restaurar un volcado JSON de toda la base local — ver el plan de
// migración ("Backup" en Ajustes). Formato elegido sobre copiar el .db crudo
// porque tolera mejor cambios de esquema entre versiones futuras de la app.
import { execute, exportBackupFile, listBackupFiles, query, readBackupFile } from './native'
import type { BackupFileRef } from './native'

export type { BackupFileRef }

const BACKUP_VERSION = 1

interface BackupData {
  version: number
  exportedAt: string
  perfil: Record<string, unknown>[]
  categorias: Record<string, unknown>[]
  habitos: Record<string, unknown>[]
  registros: Record<string, unknown>[]
  progreso_habitos: Record<string, unknown>[]
}

async function dumpTabla(nombre: string): Promise<Record<string, unknown>[]> {
  return query(`SELECT * FROM ${nombre}`)
}

export async function exportBackup(): Promise<boolean> {
  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    perfil: await dumpTabla('perfil'),
    categorias: await dumpTabla('categorias'),
    habitos: await dumpTabla('habitos'),
    registros: await dumpTabla('registros'),
    progreso_habitos: await dumpTabla('progreso_habitos'),
  }
  const filename = `marco_backup_${data.exportedAt.replace(/[:.]/g, '-')}.json`
  return exportBackupFile(JSON.stringify(data), filename)
}

export function listBackups(): Promise<BackupFileRef[]> {
  return listBackupFiles()
}

async function insertFila(tabla: string, fila: Record<string, unknown>): Promise<void> {
  const columnas = Object.keys(fila)
  const placeholders = columnas.map(() => '?').join(', ')
  const valores = columnas.map((c) => fila[c] as string | number | null)
  await execute(
    `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${placeholders})`,
    valores,
  )
}

export async function restoreBackup(uri: string): Promise<boolean> {
  const text = await readBackupFile(uri)
  if (!text) return false

  let data: BackupData
  try {
    data = JSON.parse(text) as BackupData
  } catch {
    return false
  }

  await execute('DELETE FROM progreso_habitos')
  await execute('DELETE FROM registros')
  await execute('DELETE FROM habitos')
  await execute('DELETE FROM categorias')
  await execute('DELETE FROM perfil')

  for (const fila of data.categorias ?? []) await insertFila('categorias', fila)
  for (const fila of data.perfil ?? []) await insertFila('perfil', fila)
  for (const fila of data.habitos ?? []) await insertFila('habitos', fila)
  for (const fila of data.registros ?? []) await insertFila('registros', fila)
  for (const fila of data.progreso_habitos ?? []) await insertFila('progreso_habitos', fila)

  return true
}
