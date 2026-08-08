import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'
import { useNavigate } from 'react-router'

import { getHabitos, getProgresoMes } from '../../api/marco'
import type { Habito, ProgresoDiaCalendario } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { daysInMonth, fechaISO, firstWeekdayMondayIndex, nombreMes, todayISO } from '../../lib/date'
import { type NivelProgreso, nivelProgreso } from '../../lib/progreso'
import './CalendarioScreen.css'

const WEEK_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Cada día se pinta con el escalón de la escala compartida (ver
// lib/progreso.ts), el semáforo clásico, para que el mes se lea como un mapa
// de calor. Los días sin nada que reportar se quedan neutros.
const NIVELES: NivelProgreso[] = [0, 1, 2, 3, 4]

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

    getProgresoMes(year, month, selectedHabitoIds)
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
  }, [year, month, selectedHabitoIds.join(',')])

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

  return (
    <view className="CalendarioScreen ScreenEnter">
      <view className="CalendarioHeader">
        <view className="CalendarioNavButton" bindtap={() => cambiarMes(-1)}>
          <text className="CalendarioNavArrow">‹</text>
        </view>
        <text className="CalendarioMonthLabel">
          {nombreMes(month)} {year}
        </text>
        <view className="CalendarioNavButton" bindtap={() => cambiarMes(1)}>
          <text className="CalendarioNavArrow">›</text>
        </view>
      </view>

      <view className="CalendarioHoyButton" bindtap={irAHoy}>
        <text className="CalendarioHoyText">Ir a hoy</text>
      </view>

      {habitos.length > 0 ? (
        <view>
          <view className="FiltroHeader">
            <text className="FiltroLabel">
              {selectedHabitoIds.length > 0
                ? `Filtrando ${selectedHabitoIds.length} de ${habitos.length} hábitos`
                : 'Filtrar por hábito'}
            </text>
            {selectedHabitoIds.length > 0 ? (
              <view bindtap={() => setSelectedHabitoIds([])}>
                <text className="FiltroLimpiar">Limpiar</text>
              </view>
            ) : null}
          </view>
          <view className="FiltroRow">
            {habitos.map((h) => (
              <view
                key={h.id}
                className={`FiltroChip ${selectedHabitoIds.includes(h.id) ? 'FiltroChip--active' : ''}`}
                bindtap={() => toggleHabito(h.id)}
              >
                <text className="FiltroChipText">{h.nombre}</text>
              </view>
            ))}
          </view>
        </view>
      ) : null}

      <view className="LeyendaRow">
        <view className="LeyendaItem">
          <view className="LeyendaSwatch LeyendaSwatch--sin" />
          <text className="LeyendaText">sin registro</text>
        </view>
        <view className="LeyendaEscala">
          <text className="LeyendaText">menos</text>
          {NIVELES.map((n) => (
            <view key={n} className={`LeyendaSwatch LeyendaSwatch--escala LeyendaSwatch--n${n}`} />
          ))}
          <text className="LeyendaText">más</text>
        </view>
      </view>

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
              <view
                className={`DayCellInner DayCellInner--${escalon} ${esHoy ? 'DayCellInner--hoy' : ''}`}
              >
                <text className={`DayCellText DayCellText--${escalon} ${esHoy && !conRegistro ? 'DayCellText--hoy' : ''}`}>
                  {day}
                </text>
              </view>
            </view>
          )
        })}
      </view>
    </view>
  )
}
