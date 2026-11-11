import { nivelProgreso } from '../lib/progreso'
import { formatPct } from './habitoStats'
import type { MonthStat } from './monthStats'
import './MesesChart.css'

/**
 * Los doce meses del año en columnas. Sirve para ver dentro de un año qué mes
 * fue mejor, que es una comparación que las gráficas por día no dan cuando el
 * periodo es tan largo.
 *
 * Es una gráfica de vistas y no de SVG (como ColumnChart y a diferencia de
 * TrendChart) porque el color de cada columna sale de la escala de progreso, y
 * esos tokens son `var()` de :root: solo se resuelven aplicados por clase.
 */
export function MesesChart({ stats }: { stats: MonthStat[] }) {
  return (
    <view className="MesesChart">
      {stats.map((mes) => (
        <view key={mes.month} className="MesesChartColumna">
          <text className="MesesChartValor">{mes.conDatos ? formatPct(mes.pct) : ''}</text>
          <view className="MesesChartPista">
            {/* Un mes sin datos deja la pista vacía: pintarle una barra al 0 %
                lo haría indistinguible de un mes registrado que salió a cero. */}
            {mes.conDatos ? (
              <view
                className={`MesesChartBarra MesesChartBarra--n${nivelProgreso(mes.pct * 100)}`}
                style={{ height: `${Math.max(2, mes.pct * 100)}%` }}
              />
            ) : null}
          </view>
          <text className="MesesChartLabel">{mes.label}</text>
        </view>
      ))}
    </view>
  )
}
