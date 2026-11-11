/* Horas del recordatorio diario.

   Se guardan en la columna `perfil.hora_recordatorio` como una lista separada
   por comas ("08:00,21:00"). Antes ahí cabía una sola hora ("08:00"), y esa
   forma sigue siendo una lista válida de un elemento: los perfiles y backups
   antiguos se leen sin migración. */

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

/** "21:00,08:00,08:00,basura" → ["08:00", "21:00"]: válidas, sin repetir y en
 *  orden del día. */
export function parseHoras(valor: string | null | undefined): string[] {
  if (!valor) return []
  const horas = valor
    .split(',')
    .map((h) => h.trim())
    .filter((h) => HORA.test(h))
  return Array.from(new Set(horas)).sort()
}

export function serializarHoras(horas: string[]): string {
  return parseHoras(horas.join(',')).join(',')
}

/** Añade `hora` en su sitio del día; si ya estaba, la lista queda igual. */
export function agregarHora(horas: string[], hora: string): string[] {
  return parseHoras([...horas, hora].join(','))
}

/** Quita `hora`. Nunca deja la lista vacía: quitar la única hora no hace nada
 *  (para no tener recordatorios activos sin hora). */
export function quitarHora(horas: string[], hora: string): string[] {
  return horas.length > 1 ? horas.filter((h) => h !== hora) : horas
}

/** ["08:00"] → "08:00"; ["08:00", "12:00", "21:00"] → "08:00, 12:00 y 21:00". */
export function describirHoras(horas: string[]): string {
  if (horas.length <= 1) return horas[0] ?? ''
  return `${horas.slice(0, -1).join(', ')} y ${horas[horas.length - 1]}`
}
