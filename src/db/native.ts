// Puente genérico hacia SQLite (ver NativeDatabaseModule.kt). Toda la lógica
// de negocio vive en src/api/marco.ts — este archivo solo (de)serializa.

export type SqlParam = string | number | null

function nativeDb() {
  return typeof NativeModules !== 'undefined' ? NativeModules.NativeDatabaseModule : undefined
}

export function query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  return new Promise((resolve) => {
    nativeDb()?.query(sql, JSON.stringify(params), (rowsJson: string) => {
      resolve(JSON.parse(rowsJson) as T[])
    })
  })
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T | null> {
  return query<T>(sql, params).then((rows) => rows[0] ?? null)
}

export function execute(
  sql: string,
  params: SqlParam[] = [],
): Promise<{ insertId: number; rowsAffected: number }> {
  return new Promise((resolve) => {
    nativeDb()?.execute(sql, JSON.stringify(params), (resultJson: string) => {
      resolve(JSON.parse(resultJson) as { insertId: number; rowsAffected: number })
    })
  })
}

export function exportBackupFile(json: string, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    nativeDb()?.exportBackup(json, filename, (ok: boolean) => resolve(ok))
  })
}

export interface BackupFileRef {
  nombre: string
  uri: string
}

export function listBackupFiles(): Promise<BackupFileRef[]> {
  return new Promise((resolve) => {
    nativeDb()?.listBackups((itemsJson: string) => resolve(JSON.parse(itemsJson) as BackupFileRef[]))
  })
}

export function readBackupFile(uri: string): Promise<string | null> {
  return new Promise((resolve) => {
    nativeDb()?.readBackup(uri, (text: string | null) => resolve(text))
  })
}
