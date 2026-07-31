import type { HabitoStat } from './habitoStats'
import './ColumnChart.css'

function truncar(nombre: string, max = 7): string {
  return nombre.length > max ? `${nombre.slice(0, max)}…` : nombre
}

export function ColumnChart({ stats }: { stats: HabitoStat[] }) {
  const maxTotal = Math.max(...stats.map((s) => s.total), 1)

  return (
    <>
      <view className="ColumnChart">
        {stats.map((s) => (
          <view key={s.id} className="ColumnChartCategory">
            <view className="ColumnChartBars">
              <view
                className="ColumnChartBar ColumnChartBar--total"
                style={{ height: `${Math.max(2, (s.total / maxTotal) * 100)}%` }}
              />
              <view
                className="ColumnChartBar"
                style={{
                  height: `${Math.max(2, (s.completados / maxTotal) * 100)}%`,
                  backgroundColor: s.color,
                }}
              />
            </view>
            <text className="ColumnChartLabel">{truncar(s.nombre)}</text>
          </view>
        ))}
      </view>
      <view className="ColumnChartLegendRow">
        <view className="ColumnChartLegendSwatch ColumnChartBar--total" />
        <text className="ColumnChartLegendText">Total (el color propio del hábito = completados)</text>
      </view>
    </>
  )
}
