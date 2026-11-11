import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'
import { useNavigate } from 'react-router'

import { getHabitos, getProgresoMes } from '../../api/marco'
import type { Habito, ProgresoDiaCalendario } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { BrandHeader, PrevNextButtons } from '../../components/BrandHeader'
import { checkIcon } from '../../components/icons'
import { formatPct } from '../../lib/formato'
import { daysInMonth, fechaISO, firstWeekdayMondayIndex, nombreMes, todayISO } from '../../lib/date'
import { type NivelProgreso, nivelProgreso } from '../../lib/progreso'
import './CalendarioScreen.css'

const WEEK_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Cada día se pinta con el escalón de la escala compartida (ver
// lib/progreso.ts), el semáforo clásico, para que el mes se lea como un mapa
// de calor. Los días sin nada que reportar se quedan neutros.
const NIVELES: NivelProgreso[] = [0, 1, 2, 3, 4]

// --color-select-fg: el SVG de `content` no resuelve var().
const CHIP_ON_COLOR = '#d2b4f5'

export function CalendarioScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const hoy = useMemo(() => new Date(), [])
  const [year, setYear] = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth() + 1)
  const [habitos, setHabitos] = useState<Habito[]>([])
  // Filtro de varios hábitos a la vez. Vacío = todos. El color del día pasa a
  // ser el porcentaje de cumplimiento entre los hábitos elegidos, así que la
  // vista filtrada y la completa usan exactamente la misma escala.
  const [selectedHabitoIds, setSelectedHabitoIds] = useState<number[]>([])
  const [progresoMes, setProgresoMes] = useState<ProgresoDiaCalendario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHabitos(user?.mostrar_ocultos)
      .then(setHabitos)
      .catch(() => undefined)
  }, [user?.mostrar_ocultos])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getProgresoMes(year, month, selectedHabitoIds, user?.mostrar_ocultos)
      .then((data) => {
        if (!cancelled) setProgresoMes(data)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el calendario.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, selectedHabitoIds.join(','), user?.mostrar_ocultos])

  const porFecha = useMemo(
    () => new Map<string, ProgresoDiaCalendario>(progresoMes.map((p) => [p.fecha, p])),
    [progresoMes],
  )

  const toggleHabito = useCallback((id: number) => {
    setSelectedHabitoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const totalDias = daysInMonth(year, month)
  const offset = firstWeekdayMondayIndex(year, month)
  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]

  // Resumen del mes bajo la cuadrícula: promedio de los días con registro y
  // cuántos pasaron del 80 % (el verde del semáforo).
  const resumenMes = useMemo(() => {
    const registrados = progresoMes.filter((p) => p.tiene_registro)
    if (registrados.length === 0) return null
    const promedio = registrados.reduce((acc, p) => acc + p.porcentaje, 0) / registrados.length
    const sobre80 = registrados.filter((p) => p.porcentaje >= 80).length
    return { promedio, sobre80 }
  }, [progresoMes])

  const irAHoy = useCallback(() => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }, [])

  const cambiarMes = useCallback(
    (delta: number) => {
      const indiceTotal = month - 1 + delta
      const nuevoYear = year + Math.floor(indiceTotal / 12)
      const nuevoMes = (((indiceTotal % 12) + 12) % 12) + 1
      setYear(nuevoYear)
      setMonth(nuevoMes)
    },
    [year, month],
  )

  const titulo = `${nombreMes(month).charAt(0).toUpperCase()}${nombreMes(month).slice(1)} ${year}`

  return (
    <view className="CalendarioScreen ScreenEnter">
      <BrandHeader title={titulo}>
        <PrevNextButtons onPrev={() => cambiarMes(-1)} onNext={() => cambiarMes(1)} />
      </BrandHeader>

      {/* "Hoy" y el filtro en una sola fila que se desliza. "Todos" es el
          estado sin filtro; los hábitos se pueden elegir varios a la vez. */}
      <scroll-view className="CalChipScroll" scroll-orientation="horizontal">
        <view className="CalChipRow">
          <view className="CalChip CalChip--hoy" bindtap={irAHoy}>
            <text className="CalChipText CalChipText--hoy">Hoy</text>
          </view>
          {habitos.length > 0 ? (
            <view
              className={`CalChip ${selectedHabitoIds.length === 0 ? 'CalChip--on' : ''}`}
              bindtap={() => setSelectedHabitoIds([])}
            >
              {selectedHabitoIds.length === 0 ? <svg className="CalChipCheck" content={checkIcon(CHIP_ON_COLOR)} /> : null}
              <text className={`CalChipText ${selectedHabitoIds.length === 0 ? 'CalChipText--on' : ''}`}>Todos</text>
            </view>
          ) : null}
          {habitos.map((h) => {
            const on = selectedHabitoIds.includes(h.id)
            return (
              <view key={h.id} className={`CalChip ${on ? 'CalChip--on' : ''}`} bindtap={() => toggleHabito(h.id)}>
                {on ? <svg className="CalChipCheck" content={checkIcon(CHIP_ON_COLOR)} /> : null}
                <text className={`CalChipText ${on ? 'CalChipText--on' : ''}`}>{h.nombre}</text>
              </view>
            )
          })}
        </view>
      </scroll-view>

      {loading ? <text className="CalendarioStatus">Cargando…</text> : null}
      {error ? <text className="CalendarioStatus">{error}</text> : null}

      <view className="WeekHeaderRow">
        {WEEK_HEADERS.map((d) => (
          <view key={d} className="WeekHeaderCell">
            <text className="WeekHeaderText">{d}</text>
          </view>
        ))}
      </view>

      <view className="CalendarGrid">
        {celdas.map((day, idx) => {
          if (day === null) {
            return <view key={`empty-${idx}`} className="DayCellEmpty" />
          }
          const fecha = fechaISO(year, month, day)
          const info = porFecha.get(fecha)
          const esHoy = fecha === todayISO()
          // "Sin nada que reportar" y "registrado pero en cero" son cosas
          // distintas y se pintan distinto: la primera es ausencia de dato, la
          // segunda es el escalón 0 de la escala. Con filtro activo vale lo
          // mismo, referido solo a los hábitos elegidos.
          const conRegistro = info?.tiene_registro ?? false
          const nivel: NivelProgreso = conRegistro ? nivelProgreso(info!.porcentaje) : 0
          const escalon = conRegistro ? `n${nivel}` : 'sin'
          return (
            <view
              key={fecha}
              className="DayCell StaggerIn"
              style={{ animationDelay: `${Math.min(idx, 24) * 0.012}s` }}
              bindtap={() => navigate(`/dashboard/${fecha}`)}
            >
              <view className={`DayCellInner DayCellInner--${escalon} ${esHoy ? 'DayCellInner--hoy' : ''}`}>
                <text
                  className={`DayCellText DayCellText--${escalon} ${esHoy && !conRegistro ? 'DayCellText--hoy' : ''}`}
                >
                  {day}
                </text>
              </view>
            </view>
          )
        })}
      </view>

      <view className="LeyendaRow">
        <text className="LeyendaText">menos</text>
        {NIVELES.map((n) => (
          <view key={n} className={`LeyendaSwatch LeyendaSwatch--n${n}`} />
        ))}
        <text className="LeyendaText">más</text>
        <view className="LeyendaSwatch LeyendaSwatch--sin LeyendaSwatch--aparte" />
        <text className="LeyendaText">sin registro</text>
      </view>

      {resumenMes ? (
        <view className="ResumenMes">
          <text className="ResumenMesLabel">Promedio del mes</text>
          <text className="ResumenMesValor">
            <text className="ResumenMesFuerte">{formatPct(resumenMes.promedio)}</text>
            {` · ${resumenMes.sobre80} ${resumenMes.sobre80 === 1 ? 'día' : 'días'} sobre 80 %`}
          </text>
        </view>
      ) : null}
    </view>
  )
}
