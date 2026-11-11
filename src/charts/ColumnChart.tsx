import { formatNumero } from '../lib/formato'
import type { HabitoStat } from './habitoStats'
import './ColumnChart.css'

function truncar(nombre: string, max = 8): string {
  return nombre.length > max ? `${nombre.slice(0, max - 1)}…` : nombre
}

/**
 * Hechos frente a programados, una columna por hábito. La pista mide lo
 * programado y el relleno, en el color del hábito, lo hecho: es el anillo del
 * Dashboard estirado en vertical. Todas las pistas comparten escala, así que
 * también se ve qué hábito pesa más en el periodo.
 */
export function ColumnChart({ stats }: { stats: HabitoStat[] }) {
  const maxTotal = Math.max(...stats.map((s) => s.total), 1)
  // Hasta seis columnas se reparten el ancho; con más, cada una tiene su ancho
  // y la fila se desliza, en vez de apretar las cifras hasta pisarse.
  const desliza = stats.length > 6

  const columnas = stats.map((s) => (
    <view key={s.id} className={`ColumnChartCategory ${desliza ? 'ColumnChartCategory--fija' : ''}`}>
      <text className="ColumnChartValor">
        {formatNumero(Math.round(s.completados * 10) / 10, 1)}
        <text className="ColumnChartValorTotal">{`/${s.total}`}</text>
      </text>
      <view className="ColumnChartArea">
        <view className="ColumnChartPista" style={{ height: `${Math.max(4, (s.total / maxTotal) * 100)}%` }}>
          {s.completados > 0 ? (
            <view
              className="ColumnChartRelleno"
              style={{
                height: `${Math.max(8, Math.min(100, s.pct * 100))}%`,
                backgroundColor: s.color,
              }}
            />
          ) : null}
        </view>
      </view>
      <text className="ColumnChartLabel">{truncar(s.nombre)}</text>
    </view>
  ))

  return (
    <view className="ColumnChartWrap">
      {desliza ? (
        <scroll-view className="ColumnChart" scroll-orientation="horizontal">
          {columnas}
        </scroll-view>
      ) : (
        <view className="ColumnChart">{columnas}</view>
      )}
      <view className="ColumnChartKey">
        <view className="ColumnChartKeyPista" />
        <text className="ColumnChartKeyText">programados</text>
        <view className="ColumnChartKeyHecho" />
        <text className="ColumnChartKeyText">hechos, en el color del hábito</text>
      </view>
    </view>
  )
}
