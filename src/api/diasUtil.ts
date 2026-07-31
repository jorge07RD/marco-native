// Compartido entre habitos/registros/calendario/analisis: parseo defensivo
// del JSON de días programados de un hábito (mismo comportamiento que
// parsear_dias_habito/dia_en_lista del backend original — un JSON inválido
// se trata como "no programado", no se propaga como error).
export function parseDiasSeguro(dias: string): string[] {
  try {
    const parsed: unknown = JSON.parse(dias)
    if (Array.isArray(parsed) && parsed.every((d) => typeof d === 'string')) return parsed as string[]
    return []
  } catch {
    return []
  }
}

export function diaEnLista(dias: string, letra: string): boolean {
  return parseDiasSeguro(dias).includes(letra)
}
