import { runOnBackground, useCallback, useEffect, useMemo, useState } from '@lynx-js/react'
import type { MainThread } from '@lynx-js/types'
import { useParams } from 'react-router'

import { getHabitos, getRegistroPorFecha, toggleProgreso } from '../../api/marco'
import type { Habito, RegistroConProgresos } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { addDays, formatDisplay, todayISO } from '../../lib/date'
import './DashboardScreen.css'

export function DashboardScreen() {
  const { user } = useAuth()
  const params = useParams<{ fecha?: string }>()
  const [fecha, setFecha] = useState(() => params.fecha ?? todayISO())

  // Si llegamos aquí navegando desde el Calendario con una fecha distinta a
  // la que ya estaba en pantalla, adoptarla (pero sin pelear con los botones
  // de día anterior/siguiente de este mismo componente).
  useEffect(() => {
    if (params.fecha) setFecha(params.fecha)
  }, [params.fecha])

  const [habitos, setHabitos] = useState<Habito[]>([])
  const [registro, setRegistro] = useState<RegistroConProgresos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Progresos con un toggle en vuelo — evita que un doble-tap rápido dispare
  // dos toggles que se cancelen entre sí en el backend (causaba el parpadeo:
  // el borde optimista del segundo tap se calculaba sobre el mismo estado
  // "completado" que el primero, así que ambos apuntaban al mismo resultado
  // y terminaban deshaciéndose uno al otro).
  const [pendingIds, setPendingIds] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    getHabitos()
      .then((data) => {
        if (!cancelled) setHabitos(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const loadRegistro = useCallback((targetFecha: string) => {
    setLoading(true)
    setError(null)
    getRegistroPorFecha(targetFecha)
      .then((data) => setRegistro(data))
      .catch(() => setError('No se pudo cargar el progreso de este día.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadRegistro(fecha)
  }, [fecha, loadRegistro])

  const habitosById = useMemo(() => {
    const map = new Map<number, Habito>()
    habitos.forEach((h) => map.set(h.id, h))
    return map
  }, [habitos])

  const handleToggle = useCallback(
    (progresoId: number) => {
      setPendingIds((prev) => (prev.includes(progresoId) ? prev : [...prev, progresoId]))
      toggleProgreso(progresoId)
        .then(() => loadRegistro(fecha))
        .catch(() => setError('No se pudo actualizar el hábito.'))
        .finally(() => setPendingIds((prev) => prev.filter((id) => id !== progresoId)))
    },
    [fecha, loadRegistro],
  )

  const totalHabitos = registro?.progresos.length ?? 0
  const completados = registro?.progresos.filter((p) => p.completado).length ?? 0
  const progresoPct = totalHabitos > 0 ? (completados / totalHabitos) * 100 : 0

  // Semáforo rojo/ámbar/verde (mismos umbrales 60/80 que el gauge y el
  // calendario) en vez de un solo color plano — sugerencia: acento (#e94560)
  // para <60%, ámbar (#ffd60a) para 60-79%, verde (#00ff88) al llegar a 80%+.
  let progresoColor = '#e94560'
  if (progresoPct >= 80) progresoColor = '#00ff88'
  else if (progresoPct >= 60) progresoColor = '#ffd60a'

  return (
    <view className="DashboardScreen ScreenEnter">
      <view className="DashboardHeader">
        <text className="DashboardGreeting">Hola, {user?.nombre}</text>
      </view>

      <view className="DateNav">
        <view className="DateNavButton" bindtap={() => setFecha((f) => addDays(f, -1))}>
          <text className="DateNavArrow">‹</text>
        </view>
        <text className="DateNavLabel">{formatDisplay(fecha)}</text>
        <view className="DateNavButton" bindtap={() => setFecha((f) => addDays(f, 1))}>
          <text className="DateNavArrow">›</text>
        </view>
      </view>

      {loading ? <text className="DashboardStatus">Cargando…</text> : null}
      {error ? <text className="DashboardStatus DashboardStatus--error">{error}</text> : null}
      {!loading && registro && registro.progresos.length === 0 ? (
        <text className="DashboardStatus">No hay hábitos programados para este día.</text>
      ) : null}

      {totalHabitos > 0 ? (
        <view className="ProgressTrack">
          <view
            className="ProgressFill"
            style={{ width: `${progresoPct}%`, backgroundColor: progresoColor }}
          />
        </view>
      ) : null}

      <view className="HabitList">
        {registro?.progresos.map((progreso, index) => {
          const habito = habitosById.get(progreso.habito_id)
          const isPending = pendingIds.includes(progreso.id)
          return (
            <view
              key={progreso.id}
              className={`HabitRow StaggerIn ${progreso.completado ? 'HabitRow--done' : ''}`}
              style={{ animationDelay: `${Math.min(index, 10) * 0.045}s` }}
              main-thread:bindtap={(event: MainThread.TouchEvent) => {
                'main thread'
                // Si ya hay un toggle en vuelo para este hábito, ignorar el
                // tap — evita el doble-toggle que se cancela a sí mismo.
                if (isPending) return
                // Feedback instantáneo en el hilo principal — no esperamos el
                // viaje de red/hilo de background para que el borde reaccione.
                const nowDone = !progreso.completado
                event.currentTarget.setStyleProperty('border-color', nowDone ? '#00ff88' : 'transparent')
                runOnBackground(() => handleToggle(progreso.id))()
              }}
            >
              <view
                className="HabitColorBar"
                style={{ backgroundColor: habito?.color ?? 'var(--color-accent)' }}
              />
              <view className="HabitInfo">
                <text className="HabitName">{habito?.nombre ?? `Hábito #${progreso.habito_id}`}</text>
                <text className="HabitMeta">
                  {progreso.valor} / {habito?.meta_diaria ?? '—'} {habito?.unidad_medida ?? ''}
                </text>
              </view>
              <view
                className={`HabitCheckCircle ${progreso.completado ? 'HabitCheckCircle--done PopCheck' : ''}`}
              >
                {progreso.completado ? <text className="HabitCheckMark">✓</text> : null}
              </view>
            </view>
          )
        })}
      </view>
    </view>
  )
}
