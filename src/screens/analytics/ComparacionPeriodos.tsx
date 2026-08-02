import { formatPct, type HabitoStat } from '../../charts/habitoStats'
import './ComparacionPeriodos.css'

interface FilaComparada {
  nombre: string
  color: string
  /** null cuando el hábito no existía —o no tenía registros— en ese periodo. */
  pctA: number | null
  pctB: number | null
}

function promedio(stats: HabitoStat[]): number | null {
  if (stats.length === 0) return null
  return stats.reduce((acc, s) => acc + s.pct, 0) / stats.length
}

/** Diferencia en puntos porcentuales, ya redondeada y con signo. */
function formatDelta(a: number, b: number): string {
  const puntos = Math.round((a - b) * 100)
  return `${puntos > 0 ? '+' : puntos < 0 ? '−' : '='}${Math.abs(puntos)}`
}

function claseDelta(a: number, b: number): string {
  const puntos = Math.round((a - b) * 100)
  if (puntos > 0) return 'Delta--sube'
  if (puntos < 0) return 'Delta--baja'
  return 'Delta--igual'
}

/** El cruce va por nombre y no por `id`: `deriveHabitoStats` numera por índice
 *  del array, y ese índice no significa lo mismo en dos periodos distintos —un
 *  hábito sin registros en uno de los dos ni siquiera aparece en su lista. */
function cruzar(statsA: HabitoStat[], statsB: HabitoStat[]): FilaComparada[] {
  const porNombre = new Map<string, FilaComparada>()
  for (const s of statsA) {
    porNombre.set(s.nombre, { nombre: s.nombre, color: s.color, pctA: s.pct, pctB: null })
  }
  for (const s of statsB) {
    const fila = porNombre.get(s.nombre)
    if (fila) fila.pctB = s.pct
    else porNombre.set(s.nombre, { nombre: s.nombre, color: s.color, pctA: null, pctB: s.pct })
  }
  return Array.from(porNombre.values())
}

/**
 * Los dos periodos enfrentados: promedio general de cada uno con su diferencia,
 * y el desglose por hábito. Las gráficas de la pantalla siguen mostrando solo
 * el periodo actual; aquí es donde vive la comparación.
 */
export function ComparacionPeriodos({
  statsA,
  statsB,
  etiquetaA,
  etiquetaB,
}: {
  statsA: HabitoStat[]
  statsB: HabitoStat[]
  etiquetaA: string
  etiquetaB: string
}) {
  const promA = promedio(statsA)
  const promB = promedio(statsB)
  const filas = cruzar(statsA, statsB)

  return (
    <view className="Comparacion">
      <view className="ComparacionResumen">
        <view className="ComparacionLado">
          <text className="ComparacionEtiqueta">{etiquetaA}</text>
          <text className="ComparacionValor">{promA === null ? '—' : formatPct(promA)}</text>
        </view>
        {/* Sin datos en uno de los dos lados no hay diferencia que enseñar: un
            periodo vacío no es un 0 %, es que no hubo nada registrado. */}
        {promA !== null && promB !== null ? (
          <text className={`ComparacionDelta ${claseDelta(promA, promB)}`}>
            {formatDelta(promA, promB)} pts
          </text>
        ) : (
          <text className="ComparacionDelta Delta--igual">sin datos</text>
        )}
        <view className="ComparacionLado">
          <text className="ComparacionEtiqueta">{etiquetaB}</text>
          <text className="ComparacionValor ComparacionValor--previo">
            {promB === null ? '—' : formatPct(promB)}
          </text>
        </view>
      </view>

      {filas.map((fila) => (
        <view key={fila.nombre} className="ComparacionFila">
          <view className="ComparacionBarraColor" style={{ backgroundColor: fila.color }} />
          <text className="ComparacionNombre">{fila.nombre}</text>
          <text className="ComparacionPct">{fila.pctA === null ? '—' : formatPct(fila.pctA)}</text>
          <text className="ComparacionPct ComparacionPct--previo">
            {fila.pctB === null ? '—' : formatPct(fila.pctB)}
          </text>
          <text
            className={`ComparacionPctDelta ${
              fila.pctA !== null && fila.pctB !== null ? claseDelta(fila.pctA, fila.pctB) : 'Delta--igual'
            }`}
          >
            {fila.pctA !== null && fila.pctB !== null ? formatDelta(fila.pctA, fila.pctB) : '—'}
          </text>
        </view>
      ))}
    </view>
  )
}
