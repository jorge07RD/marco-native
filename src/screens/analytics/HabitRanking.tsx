import type { HabitoStat } from '../../charts/habitoStats'
import './HabitRanking.css'

/** Diferencia en puntos porcentuales, redondeada y con signo. */
function formatDelta(a: number, b: number): string {
  const puntos = Math.round((a - b) * 100)
  return `${puntos > 0 ? '+' : puntos < 0 ? '−' : '='}${Math.abs(puntos)}`
}

function claseDelta(a: number, b: number): string {
  const puntos = Math.round((a - b) * 100)
  if (puntos > 0) return 'RankDelta--sube'
  if (puntos < 0) return 'RankDelta--baja'
  return 'RankDelta--igual'
}

/**
 * Cumplimiento de cada hábito, de mejor a peor, con una barra en el color del
 * hábito. Si hay periodo anterior, una marca sobre la barra dice dónde estaba
 * y a la derecha va la diferencia.
 *
 * Reemplaza a las cinco gráficas (polar, dona, columnas, radar y top de barras)
 * que mostraban esta misma serie, y a la tabla de comparación.
 *
 * El cruce con el periodo anterior va por nombre y no por `id`:
 * `deriveHabitoStats` numera por índice del array, y ese índice no significa
 * lo mismo en dos periodos —un hábito sin registros en uno de los dos ni
 * siquiera aparece en su lista.
 */
export function HabitRanking({ stats, previos }: { stats: HabitoStat[]; previos: HabitoStat[] | null }) {
  const previoPorNombre = new Map((previos ?? []).map((s) => [s.nombre, s.pct]))
  const ordenados = [...stats].sort((a, b) => b.pct - a.pct)

  return (
    <view className="Rank">
      {ordenados.map((s) => {
        const previo = previos ? previoPorNombre.get(s.nombre) : undefined
        return (
          <view key={s.nombre} className="RankRow">
            <view className="RankTop">
              <view className="RankDot" style={{ backgroundColor: s.color }} />
              <text className="RankName">{s.nombre}</text>
              <text className="RankValue">{Math.round(s.pct * 100)} %</text>
              {previos ? (
                <text className={`RankDelta ${previo !== undefined ? claseDelta(s.pct, previo) : 'RankDelta--igual'}`}>
                  {previo !== undefined ? formatDelta(s.pct, previo) : '—'}
                </text>
              ) : null}
            </view>
            <view className="RankTrack">
              <view className="RankFill" style={{ width: `${Math.max(2, s.pct * 100)}%`, backgroundColor: s.color }} />
              {previo !== undefined ? (
                <view className="RankTick" style={{ left: `${Math.min(99, previo * 100)}%` }} />
              ) : null}
            </view>
          </view>
        )
      })}
    </view>
  )
}
