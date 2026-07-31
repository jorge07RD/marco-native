import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'
import { useNavigate } from 'react-router'

import { getHabitos, getProgresoMes, getProgresoMesHabito } from '../../api/marco'
import type { Habito, ProgresoDiaCalendario, ProgresoHabitoDiaCalendario } from '../../api/types'
import { daysInMonth, fechaISO, firstWeekdayMondayIndex, nombreMes, todayISO } from '../../lib/date'
import './CalendarioScreen.css'

const WEEK_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Semáforo clásico (mismos umbrales 60/80 que el gauge): rojo/ámbar/verde en
// tonos oscuros para que se vea bien sobre el fondo del calendario.
function colorForPorcentaje(porcentaje: number): string {
  if (porcentaje === 0) return 'var(--color-bg-secondary)'
  if (porcentaje < 60) return '#3d1f2a' // rojo (acento) oscuro
  if (porcentaje < 80) return '#3d3620' // ámbar (warning) oscuro
  if (porcentaje < 100) return '#1f3d2a' // verde (success) oscuro
  return '#00ff88' // 100%: verde pleno
}

export function CalendarioScreen() {
  const navigate = useNavigate()
  const hoy = useMemo(() => new Date(), [])
  const [year, setYear] = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth() + 1)
  const [habitos, setHabitos] = useState<Habito[]>([])
  // Simplificación respecto al original: filtro de UN hábito a la vez (el
  // endpoint /calendario/.../habito/{id} solo acepta uno), no multi-selección.
  const [selectedHabitoId, setSelectedHabitoId] = useState<number | null>(null)
  const [progresoMes, setProgresoMes] = useState<ProgresoDiaCalendario[]>([])
  const [progresoHabito, setProgresoHabito] = useState<ProgresoHabitoDiaCalendario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHabitos()
      .then(setHabitos)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const request = selectedHabitoId
      ? getProgresoMesHabito(year, month, selectedHabitoId).then((data) => {
          if (!cancelled) setProgresoHabito(data)
        })
      : getProgresoMes(year, month).then((data) => {
          if (!cancelled) setProgresoMes(data)
        })

    request
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el calendario.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [year, month, selectedHabitoId])

  const porFecha = useMemo(() => {
    if (selectedHabitoId) {
      return new Map<string, ProgresoHabitoDiaCalendario>(progresoHabito.map((p) => [p.fecha, p]))
    }
    return new Map<string, ProgresoDiaCalendario>(progresoMes.map((p) => [p.fecha, p]))
  }, [selectedHabitoId, progresoHabito, progresoMes])

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
          <text className="FiltroLabel">Filtrar por hábito</text>
          <view className="FiltroRow">
            {habitos.map((h) => (
              <view
                key={h.id}
                className={`FiltroChip ${selectedHabitoId === h.id ? 'FiltroChip--active' : ''}`}
                bindtap={() => setSelectedHabitoId((prev) => (prev === h.id ? null : h.id))}
              >
                <text className="FiltroChipText">{h.nombre}</text>
              </view>
            ))}
          </view>
        </view>
      ) : null}

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
          let backgroundColor = 'var(--color-bg-secondary)'
          let textoOscuro = false
          if (selectedHabitoId) {
            const p = info as ProgresoHabitoDiaCalendario | undefined
            if (p?.programado) {
              backgroundColor = p.completado ? '#1f3d2a' : '#3d1f2a'
            }
          } else {
            const p = info as ProgresoDiaCalendario | undefined
            if (p?.tiene_registro) {
              backgroundColor = colorForPorcentaje(p.porcentaje)
              textoOscuro = p.porcentaje === 100
            }
          }
          return (
            <view
              key={fecha}
              className="DayCell StaggerIn"
              style={{ animationDelay: `${Math.min(idx, 24) * 0.012}s` }}
              bindtap={() => navigate(`/dashboard/${fecha}`)}
            >
              <view
                className={`DayCellInner ${esHoy ? 'DayCellInner--hoy' : ''}`}
                style={{ backgroundColor }}
              >
                <text
                  className={`DayCellText ${esHoy ? 'DayCellText--hoy' : ''}`}
                  style={textoOscuro ? { color: '#0e0d0d' } : undefined}
                >
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
