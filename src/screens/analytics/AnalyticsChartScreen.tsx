import { useEffect, useMemo, useState } from '@lynx-js/react'

import { getCumplimientoHabitos, getRendimientoPorDia } from '../../api/marco'
import type { CumplimientoHabito, RendimientoDia } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { ColumnChart } from '../../charts/ColumnChart'
import { deriveDayStats } from '../../charts/dayStats'
import { DonutChart } from '../../charts/DonutChart'
import { GaugeChart } from '../../charts/GaugeChart'
import { deriveHabitoStats, formatCantidad, type HabitoStat } from '../../charts/habitoStats'
import { MesesChart } from '../../charts/MesesChart'
import { deriveMonthStats } from '../../charts/monthStats'
import { PolarColumnChart } from '../../charts/PolarColumnChart'
import { RadarChart } from '../../charts/RadarChart'
import { SplineChart } from '../../charts/SplineChart'
import { TrendChart } from '../../charts/TrendChart'
import { BrandHeader } from '../../components/BrandHeader'
import { arcoParcial } from '../../components/icons'
import { useChartZoom } from '../../components/useChartZoom'
import { mesActual, type Periodo, rangoAnteriorDe, rangoDe } from '../../lib/periodo'
import { HabitRanking } from './HabitRanking'
import { PeriodoFiltro } from './PeriodoFiltro'
import './AnalyticsChartScreen.css'

function promedio(stats: HabitoStat[]): number | null {
  if (stats.length === 0) return null
  return stats.reduce((acc, s) => acc + s.pct, 0) / stats.length
}

/** "julio 2026" → "julio"; "2025" se queda igual. Para el chip "vs junio". */
function etiquetaCorta(etiqueta: string): string {
  return etiqueta.replace(/ \d{4}$/, '')
}

/** Tarjeta de un hábito en la fila deslizable: el anillo del Dashboard con el
 *  cumplimiento del periodo, el porcentaje y cumplidos sobre programados. */
function HabitoSummaryCard({ stat }: { stat: HabitoStat }) {
  const lleno = stat.pct >= 0.995
  return (
    <view className="HabitoSummaryCard">
      <text className="HabitoSummaryName">{stat.nombre}</text>
      <view className="HabitoSummaryBody">
        <view className="HabitoSummaryRing" style={{ borderColor: lleno ? stat.color : '#2b2733' }}>
          {!lleno && stat.pct > 0 ? (
            <svg className="HabitoSummaryArc" content={arcoParcial(stat.color, stat.pct)} />
          ) : null}
        </view>
        <view className="HabitoSummaryCifras">
          <text className="HabitoSummaryPct">{Math.round(stat.pct * 100)} %</text>
          <text className="HabitoSummaryCount">
            {formatCantidad(stat.completados).replace('.', ',')} de {stat.total}
          </text>
        </view>
      </view>
    </view>
  )
}

/** Cabecera de un panel. Va fuera del panel y no dentro: con la cabecera
 *  dentro, Lynx pintaba el <svg> de la gráfica dos veces y desordenaba el
 *  título (visto en un SM-S918U). */
function PanelTitulo({ titulo }: { titulo: string }) {
  return (
    <view className="PanelHead PanelHead--fuera">
      <text className="PanelTitle">{titulo}</text>
    </view>
  )
}

/**
 * Análisis en tres piezas: la cifra del periodo con su diferencia contra el
 * anterior, la línea diaria (con el anterior punteado) y el ranking por
 * hábito. En la vista «Año» se suma el cumplimiento por mes.
 *
 * Debajo siguen las gráficas de siempre (polar, dona, spline, columnas, gauge
 * y radar), con la paleta nocturna.
 */
export function AnalyticsChartScreen() {
  const { user } = useAuth()
  // Arranca en el mes en curso: es el tramo con el que se piensa en hábitos
  // ("qué tal llevo agosto"), y además es el único que tiene un anterior
  // natural contra el que compararse.
  const [periodo, setPeriodo] = useState<Periodo>(mesActual)
  // La comparación viene encendida: es la pregunta natural ("¿voy mejor que
  // el mes pasado?"). Se apaga tocando el chip "vs …".
  const [comparar, setComparar] = useState(true)
  const [rendimiento, setRendimiento] = useState<RendimientoDia[]>([])
  const [rendimientoPrevio, setRendimientoPrevio] = useState<RendimientoDia[]>([])
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
    const vacioDias = Promise.resolve([] as RendimientoDia[])
    const vacioHabitos = Promise.resolve([] as CumplimientoHabito[])
    Promise.all([
      getRendimientoPorDia(rango.inicio, rango.fin, user?.mostrar_ocultos),
      getCumplimientoHabitos(rango.inicio, rango.fin, user?.mostrar_ocultos),
      // El periodo de referencia solo se pide cuando se va a enseñar: es otra
      // pasada por toda la tabla de progresos.
      comparar ? getRendimientoPorDia(rangoPrevio.inicio, rangoPrevio.fin, user?.mostrar_ocultos) : vacioDias,
      comparar ? getCumplimientoHabitos(rangoPrevio.inicio, rangoPrevio.fin, user?.mostrar_ocultos) : vacioHabitos,
    ])
      .then(([dias, habitos, diasPrevios, habitosPrevios]) => {
        if (!cancelled) {
          setRendimiento(dias)
          setCumplimiento(habitos)
          setRendimientoPrevio(diasPrevios)
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
  const dayStatsPrevios = useMemo(
    () => (comparar ? deriveDayStats(rendimientoPrevio, rangoPrevio.inicio, rangoPrevio.fin) : null),
    [comparar, rendimientoPrevio, rangoPrevio.inicio, rangoPrevio.fin],
  )
  const habitoStats = useMemo(() => deriveHabitoStats(cumplimiento), [cumplimiento])
  const habitoStatsPrevios = useMemo(
    () => (comparar ? deriveHabitoStats(cumplimientoPrevio) : null),
    [comparar, cumplimientoPrevio],
  )
  const monthStats = useMemo(
    () => (periodo.tipo === 'anio' ? deriveMonthStats(rendimiento, periodo.year) : []),
    [rendimiento, periodo],
  )

  const prom = promedio(habitoStats)
  const promPrevio = habitoStatsPrevios ? promedio(habitoStatsPrevios) : null
  // Un periodo anterior vacío no es un 0 %: no hubo nada registrado, y no hay
  // diferencia que enseñar.
  const deltaPts = prom !== null && promPrevio !== null ? Math.round((prom - promPrevio) * 100) : null
  const vs = periodo.tipo === 'dias' ? 'los previos' : etiquetaCorta(rangoPrevio.etiqueta)

  const { open } = useChartZoom()

  const sinHabitos = !loading && !error && habitoStats.length === 0

  return (
    <view className="AnalyticsScreen ScreenEnter">
      <BrandHeader title="Análisis" />

      <PeriodoFiltro periodo={periodo} onPeriodo={setPeriodo} />

      {loading ? <text className="AnalyticsStatus">Cargando…</text> : null}
      {error ? <text className="AnalyticsStatus">{error}</text> : null}
      {sinHabitos ? <text className="AnalyticsStatus">Aún no hay datos de hábitos en este rango.</text> : null}

      {!loading && !error && !sinHabitos ? (
        <>
          <view className="Cifra">
            <view className="CifraTexto">
              <text className="CifraValor">{prom === null ? '—' : `${Math.round(prom * 100)} %`}</text>
              <text className="CifraLabel">cumplimiento promedio</text>
            </view>
            {/* El chip enciende y apaga la comparación. */}
            <view
              className={`Delta ${
                !comparar
                  ? 'Delta--off'
                  : deltaPts === null || deltaPts === 0
                    ? 'Delta--igual'
                    : deltaPts > 0
                      ? 'Delta--sube'
                      : 'Delta--baja'
              }`}
              bindtap={() => setComparar((c) => !c)}
            >
              {!comparar ? (
                <text className="DeltaText DeltaText--off">Comparar</text>
              ) : (
                <text
                  className={`DeltaText ${
                    deltaPts === null || deltaPts === 0
                      ? 'DeltaText--igual'
                      : deltaPts > 0
                        ? 'DeltaText--sube'
                        : 'DeltaText--baja'
                  }`}
                >
                  {deltaPts === null
                    ? 'sin datos'
                    : `${deltaPts > 0 ? '▲' : deltaPts < 0 ? '▼' : '='} ${Math.abs(deltaPts)} pts`}
                  <text className="DeltaVs">{` vs ${vs}`}</text>
                </text>
              )}
            </view>
          </view>

          <scroll-view className="HabitoSummaryRow" scroll-orientation="horizontal">
            {habitoStats.map((stat) => (
              <HabitoSummaryCard key={stat.nombre} stat={stat} />
            ))}
          </scroll-view>

          {periodo.tipo === 'anio' ? (
            <>
              <PanelTitulo titulo="Por mes" />
              <view
                className="AnalyticsPanel"
                bindtap={() => open('Cumplimiento por mes', <MesesChart stats={monthStats} />)}
              >
                <MesesChart stats={monthStats} />
              </view>
            </>
          ) : null}

          <view className="PanelHead PanelHead--fuera">
            <text className="PanelTitle">Cada día</text>
            {comparar ? (
              <view className="PanelKey">
                <view className="KeyLine" />
                <text className="KeyText">actual</text>
                <view className="KeyLine KeyLine--previo" />
                <text className="KeyText">anterior</text>
              </view>
            ) : null}
          </view>
          <view
            className="AnalyticsPanel AnalyticsPanel--grafica"
            bindtap={() =>
              open('Cumplimiento cada día', <TrendChart data={dayStats} previo={dayStatsPrevios} height={260} />)
            }
          >
            <TrendChart data={dayStats} previo={dayStatsPrevios} />
          </view>

          <view className="PanelHead PanelHead--fuera">
            <text className="PanelTitle">Por hábito</text>
            {comparar ? (
              <view className="PanelKey">
                <view className="KeyTick" />
                <text className="KeyText">anterior</text>
              </view>
            ) : null}
          </view>
          <view className="AnalyticsPanel">
            <HabitRanking stats={habitoStats} previos={habitoStatsPrevios} />
          </view>

          <PanelTitulo titulo="Rueda de hábitos" />
          <view
            className="AnalyticsPanel AnalyticsPanel--grafica"
            bindtap={() => open('Rueda de hábitos', <PolarColumnChart stats={habitoStats} size={300} />)}
          >
            <PolarColumnChart stats={habitoStats} />
          </view>

          <PanelTitulo titulo="Reparto de lo cumplido" />
          <view
            className="AnalyticsPanel AnalyticsPanel--grafica"
            bindtap={() => open('Reparto de lo cumplido', <DonutChart stats={habitoStats} size={300} />)}
          >
            <DonutChart stats={habitoStats} />
          </view>

          <PanelTitulo titulo="Tendencia" />
          <view
            className="AnalyticsPanel AnalyticsPanel--grafica"
            bindtap={() => open('Tendencia', <SplineChart data={dayStats} height={220} />)}
          >
            <SplineChart data={dayStats} />
          </view>

          <PanelTitulo titulo="Hechos y programados" />
          <view
            className="AnalyticsPanel AnalyticsPanel--grafica"
            bindtap={() => open('Hechos y programados', <ColumnChart stats={habitoStats} />)}
          >
            <ColumnChart stats={habitoStats} />
          </view>

          <PanelTitulo titulo="Promedio del periodo" />
          <view
            className="AnalyticsPanel AnalyticsPanel--grafica"
            bindtap={() => open('Promedio del periodo', <GaugeChart pct={prom ?? 0} width={300} height={173} />)}
          >
            <GaugeChart pct={prom ?? 0} />
          </view>

          <PanelTitulo titulo="Equilibrio entre hábitos" />
          <view
            className="AnalyticsPanel AnalyticsPanel--grafica"
            bindtap={() => open('Equilibrio entre hábitos', <RadarChart stats={habitoStats} size={300} />)}
          >
            <RadarChart stats={habitoStats} />
          </view>
        </>
      ) : null}
    </view>
  )
}
