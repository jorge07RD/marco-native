import type { HabitoStat } from './habitoStats'
import { formatPct } from './habitoStats'
import './HorizontalBarChart.css'

function truncar(nombre: string, max = 12): string {
  return nombre.length > max ? `${nombre.slice(0, max)}…` : nombre
}

export function HorizontalBarChart({ stats }: { stats: HabitoStat[] }) {
  const ordenados = [...stats].sort((a, b) => b.pct - a.pct)

  return (
    <view className="HBarChart">
      {ordenados.map((s) => (
        <view key={s.id} className="HBarRow">
          <text className="HBarLabel">{truncar(s.nombre)}</text>
          <view className="HBarTrack">
            <view
              className="HBarFill"
              style={{ width: `${Math.max(2, s.pct * 100)}%`, backgroundColor: s.color }}
            />
          </view>
          <text className="HBarValue">{formatPct(s.pct)}</text>
        </view>
      ))}
    </view>
  )
}
