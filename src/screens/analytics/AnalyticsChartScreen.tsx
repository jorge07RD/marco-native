import { useEffect, useMemo, useState } from '@lynx-js/react'

import { getCumplimientoHabitos, getRendimientoPorDia } from '../../api/marco'
import type { CumplimientoHabito, RendimientoDia } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { AreaChart } from '../../charts/AreaChart'
import { BrandHeader } from '../../components/BrandHeader'
import { ColumnChart } from '../../charts/ColumnChart'
import { ComparacionPeriodos } from './ComparacionPeriodos'
import { deriveDayStats } from '../../charts/dayStats'
import { deriveMonthStats } from '../../charts/monthStats'
import { DonutChart } from '../../charts/DonutChart'
import { GaugeChart } from '../../charts/GaugeChart'
import { deriveHabitoStats, formatCantidad, formatPct, type HabitoStat } from '../../charts/habitoStats'
import { HorizontalBarChart } from '../../charts/HorizontalBarChart'
import { MesesChart } from '../../charts/MesesChart'
import { PeriodoFiltro } from './PeriodoFiltro'
import { mesActual, rangoAnteriorDe, rangoDe, type Periodo } from '../../lib/periodo'
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
        {formatCantidad(stat.completados)}/{stat.total}
      </text>
      <text className="HabitoSummaryPct">{formatPct(stat.pct)}</text>
    </view>
  )
}

export function AnalyticsChartScreen() {
  const { user } = useAuth()
  // Arranca en el mes en curso: es el tramo con el que se piensa en hábitos
  // ("qué tal llevo agosto"), y además es el único que tiene un anterior
  // natural contra el que compararse.
  const [periodo, setPeriodo] = useState<Periodo>(mesActual)
  const [comparar, setComparar] = useState(false)
  const [rendimiento, setRendimiento] = useState<RendimientoDia[]>([])
  const [cumplimiento, setCumplimiento] = useState<CumplimientoHabito[]>([])
  const [cumplimientoPrevio, setCumplimientoPrevio] = useState<CumplimientoHabito[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const rango = useMemo(() => rangoDe(periodo), [periodo])
  const rangoPrevio = useMemo(() => rangoAnteriorDe(periodo), [periodo])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getRendimientoPorDia(rango.inicio, rango.fin, user?.mostrar_ocultos),
      getCumplimientoHabitos(rango.inicio, rango.fin, user?.mostrar_ocultos),
      // El periodo de referencia solo se pide cuando se va a enseñar: es otra
      // pasada por toda la tabla de progresos.
      comparar
        ? getCumplimientoHabitos(rangoPrevio.inicio, rangoPrevio.fin, user?.mostrar_ocultos)
        : Promise.resolve([] as CumplimientoHabito[]),
    ])
      .then(([dias, habitos, habitosPrevios]) => {
        if (!cancelled) {
          setRendimiento(dias)
          setCumplimiento(habitos)
          setCumplimientoPrevio(habitosPrevios)
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
  }, [rango.inicio, rango.fin, rangoPrevio.inicio, rangoPrevio.fin, comparar, user?.mostrar_ocultos])

  const dayStats = useMemo(
    () => deriveDayStats(rendimiento, rango.inicio, rango.fin),
    [rendimiento, rango.inicio, rango.fin],
  )
  const habitoStats = useMemo(() => deriveHabitoStats(cumplimiento), [cumplimiento])
  const habitoStatsPrevios = useMemo(
    () => deriveHabitoStats(cumplimientoPrevio),
    [cumplimientoPrevio],
  )
  const monthStats = useMemo(
    () => (periodo.tipo === 'anio' ? deriveMonthStats(rendimiento, periodo.year) : []),
    [rendimiento, periodo],
  )

  const promedioGeneral = useMemo(() => {
    if (habitoStats.length === 0) return 0
    return habitoStats.reduce((acc, s) => acc + s.pct, 0) / habitoStats.length
  }, [habitoStats])

  const { open } = useChartZoom()

  const sinHabitos = !loading && !error && habitoStats.length === 0

  return (
    <view className="AnalyticsScreen ScreenEnter">
      <BrandHeader title="Análisis" />

      <PeriodoFiltro
        periodo={periodo}
        onPeriodo={setPeriodo}
        comparar={comparar}
        onComparar={setComparar}
      />

      {comparar && !loading && !error ? (
        <>
          <text className="ChartSectionTitle ChartSectionTitle--primero">
            {rango.etiqueta} vs {rangoPrevio.etiqueta}
          </text>
          <ComparacionPeriodos
            statsA={habitoStats}
            statsB={habitoStatsPrevios}
            etiquetaA={rango.etiqueta}
            etiquetaB={rangoPrevio.etiqueta}
          />
        </>
      ) : null}

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
          {periodo.tipo === 'anio' ? (
            <>
              <text className="ChartSectionTitle">Cumplimiento por Mes</text>
              <view
                className="AnalyticsCard StaggerIn"
                style={{ animationDelay: '0s' }}
                bindtap={() => open('Cumplimiento por Mes', <MesesChart stats={monthStats} />)}
              >
                <MesesChart stats={monthStats} />
              </view>
            </>
          ) : null}

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
