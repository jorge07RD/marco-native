// Puente genérico hacia SQLite (ver NativeDatabaseModule.kt). Toda la lógica
// de negocio vive en src/api/marco.ts — este archivo solo (de)serializa.

export type SqlParam = string | number | null

/** Cuánto se espera al puente nativo antes de rendirse, y cada cuánto se
 *  reintenta. Tras una instalación limpia el primer render puede llegar antes
 *  de que `NativeModules` esté poblado, y entonces la llamada se perdía: el
 *  `?.` la convertía en un no-op silencioso y la promesa no resolvía nunca,
 *  dejando la app en «Cargando…» para siempre (reproducido en un SM-S918U tras
 *  borrar los datos). Ahora se espera un poco y, si no aparece, se rechaza:
 *  quien llama ya sabe enseñar un error, pero no sabe salir de un colgado. */
const REINTENTO_MS = 50
const ESPERA_MAXIMA_MS = 3000

function nativeDb() {
  return typeof NativeModules !== 'undefined' ? NativeModules.NativeDatabaseModule : undefined
}

function conModulo<T>(uso: (db: NonNullable<ReturnType<typeof nativeDb>>) => void): Promise<T> {
  return new Promise<T>((_resolve, reject) => {
    const inicio = Date.now()
    const intentar = () => {
      const db = nativeDb()
      if (db) {
        uso(db)
        return
      }
      if (Date.now() - inicio >= ESPERA_MAXIMA_MS) {
        reject(new Error('El puente con la base de datos no está disponible'))
        return
      }
      setTimeout(intentar, REINTENTO_MS)
    }
    intentar()
  })
}

/** El módulo nativo devuelve `{ error }` cuando SQLite falla, en vez de dejar
 *  el callback sin invocar (ver NativeDatabaseModule.kt). */
function conError(parsed: unknown): string | null {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'error' in parsed) {
    return String((parsed as { error: unknown }).error)
  }
  return null
}

export function query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    conModulo((db) => {
      db.query(sql, JSON.stringify(params), (rowsJson: string) => {
        const parsed: unknown = JSON.parse(rowsJson)
        const error = conError(parsed)
        if (error) reject(new Error(error))
        else resolve(parsed as T[])
      })
    }).catch(reject)
  })
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T | null> {
  return query<T>(sql, params).then((rows) => rows[0] ?? null)
}

export function execute(
  sql: string,
  params: SqlParam[] = [],
): Promise<{ insertId: number; rowsAffected: number }> {
  return new Promise((resolve, reject) => {
    conModulo((db) => {
      db.execute(sql, JSON.stringify(params), (resultJson: string) => {
        const parsed: unknown = JSON.parse(resultJson)
        const error = conError(parsed)
        if (error) reject(new Error(error))
        else resolve(parsed as { insertId: number; rowsAffected: number })
      })
    }).catch(reject)
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
