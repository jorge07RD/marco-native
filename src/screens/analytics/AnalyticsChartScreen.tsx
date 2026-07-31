import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'

import { getCumplimientoHabitos, getRendimientoPorDia } from '../../api/marco'
import type { CumplimientoHabito, RendimientoDia } from '../../api/types'
import { AreaChart } from '../../charts/AreaChart'
import { BrandHeader } from '../../components/BrandHeader'
import { ColumnChart } from '../../charts/ColumnChart'
import { daysAgoISO, todayISO } from '../../lib/date'
import { deriveDayStats } from '../../charts/dayStats'
import { DonutChart } from '../../charts/DonutChart'
import { GaugeChart } from '../../charts/GaugeChart'
import { deriveHabitoStats, formatPct, type HabitoStat } from '../../charts/habitoStats'
import { HorizontalBarChart } from '../../charts/HorizontalBarChart'
import { PolarColumnChart } from '../../charts/PolarColumnChart'
import { RadarChart } from '../../charts/RadarChart'
import { SplineChart } from '../../charts/SplineChart'
import { useChartZoom } from '../../components/useChartZoom'
import './AnalyticsChartScreen.css'

function HabitoSummaryCard({ stat }: { stat: HabitoStat }) {
  return (
    <view className="HabitoSummaryCard">
      <view className="HabitoSummaryBar" style={{ backgroundColor: stat.color }} />
      <text className="HabitoSummaryName">{stat.nombre}</text>
      <text className="HabitoSummaryCount">
        {stat.completados}/{stat.total}
      </text>
      <text className="HabitoSummaryPct">{formatPct(stat.pct)}</text>
    </view>
  )
}

const RANGOS = [7, 14, 30]

export function AnalyticsChartScreen() {
  const [rangoDias, setRangoDias] = useState(14)
  const [rendimiento, setRendimiento] = useState<RendimientoDia[]>([])
  const [cumplimiento, setCumplimiento] = useState<CumplimientoHabito[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fechaFin = useMemo(() => todayISO(), [])
  const fechaInicio = useMemo(() => daysAgoISO(rangoDias - 1), [rangoDias])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getRendimientoPorDia(fechaInicio, fechaFin), getCumplimientoHabitos(fechaInicio, fechaFin)])
      .then(([dias, habitos]) => {
        if (!cancelled) {
          setRendimiento(dias)
          setCumplimiento(habitos)
        }
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el análisis.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fechaInicio, fechaFin])

  const dayStats = useMemo(
    () => deriveDayStats(rendimiento, fechaInicio, fechaFin),
    [rendimiento, fechaInicio, fechaFin],
  )
  const habitoStats = useMemo(() => deriveHabitoStats(cumplimiento), [cumplimiento])

  const promedioGeneral = useMemo(() => {
    if (habitoStats.length === 0) return 0
    return habitoStats.reduce((acc, s) => acc + s.pct, 0) / habitoStats.length
  }, [habitoStats])

  const cambiarRango = useCallback((r: number) => setRangoDias(r), [])

  const { open } = useChartZoom()

  const sinHabitos = !loading && !error && habitoStats.length === 0

  return (
    <view className="AnalyticsScreen ScreenEnter">
      <BrandHeader title="Análisis" />

      <view className="RangoRow">
        {RANGOS.map((r) => (
          <view
            key={r}
            className={`RangoChip ${rangoDias === r ? 'RangoChip--active' : ''}`}
            bindtap={() => cambiarRango(r)}
          >
            <text className={`RangoChipText ${rangoDias === r ? 'RangoChipText--active' : ''}`}>
              {r} días
            </text>
          </view>
        ))}
      </view>

      {loading ? <text className="AnalyticsStatus">Cargando…</text> : null}
      {error ? <text className="AnalyticsStatus">{error}</text> : null}
      {sinHabitos ? (
        <text className="AnalyticsStatus">Aún no hay datos de hábitos en este rango.</text>
      ) : null}

      {!sinHabitos && habitoStats.length > 0 ? (
        <scroll-view className="HabitoSummaryRow" scroll-orientation="horizontal">
          {habitoStats.map((stat) => (
            <HabitoSummaryCard key={stat.id} stat={stat} />
          ))}
        </scroll-view>
      ) : null}

      {!loading && !error ? (
        <>
          <text className="ChartSectionTitle">Rendimiento de Hábitos por Día</text>
          <view
            className="AnalyticsCard StaggerIn"
            style={{ animationDelay: '0s' }}
            bindtap={() => open('Rendimiento de Hábitos por Día', <AreaChart data={dayStats} width={320} height={260} />)}
          >
            <AreaChart data={dayStats} />
          </view>

          {!sinHabitos ? (
            <>
              <text className="ChartSectionTitle">Análisis Polar de Hábitos</text>
              <view
                className="AnalyticsCard StaggerIn"
                style={{ animationDelay: '0.05s' }}
                bindtap={() => open('Análisis Polar de Hábitos', <PolarColumnChart stats={habitoStats} size={300} />)}
              >
                <PolarColumnChart stats={habitoStats} />
              </view>

              <text className="ChartSectionTitle">Análisis de Hábitos</text>
              <view
                className="AnalyticsCard StaggerIn"
                style={{ animationDelay: '0.1s' }}
                bindtap={() => open('Análisis de Hábitos', <DonutChart stats={habitoStats} size={300} />)}
              >
                <DonutChart stats={habitoStats} />
              </view>
            </>
          ) : null}

          <text className="ChartSectionTitle">Progreso de Hábitos por Día</text>
          <view
            className="AnalyticsCard StaggerIn"
            style={{ animationDelay: '0.15s' }}
            bindtap={() => open('Progreso de Hábitos por Día', <SplineChart data={dayStats} width={320} height={260} />)}
          >
            <SplineChart data={dayStats} />
          </view>

          {!sinHabitos ? (
            <>
              <text className="ChartSectionTitle">Comparación por Hábito</text>
              <view
                className="AnalyticsCard StaggerIn"
                style={{ animationDelay: '0.2s' }}
                bindtap={() => open('Comparación por Hábito', <ColumnChart stats={habitoStats} />)}
              >
                <ColumnChart stats={habitoStats} />
              </view>

              <text className="ChartSectionTitle">Promedio General de Cumplimiento</text>
              <view
                className="AnalyticsCard StaggerIn"
                style={{ animationDelay: '0.25s' }}
                bindtap={() => open('Promedio General de Cumplimiento', <GaugeChart pct={promedioGeneral} width={300} height={173} />)}
              >
                <GaugeChart pct={promedioGeneral} />
              </view>

              <text className="ChartSectionTitle">Gráfico Radar de Cumplimiento</text>
              <view
                className="AnalyticsCard StaggerIn"
                style={{ animationDelay: '0.3s' }}
                bindtap={() => open('Gráfico Radar de Cumplimiento', <RadarChart stats={habitoStats} size={300} />)}
              >
                <RadarChart stats={habitoStats} />
              </view>

              <text className="ChartSectionTitle">Top Hábitos por Cumplimiento</text>
              <view
                className="AnalyticsCard StaggerIn"
                style={{ animationDelay: '0.35s' }}
                bindtap={() => open('Top Hábitos por Cumplimiento', <HorizontalBarChart stats={habitoStats} />)}
              >
                <HorizontalBarChart stats={habitoStats} />
              </view>
            </>
          ) : null}
        </>
      ) : null}
    </view>
  )
}
