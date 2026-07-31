import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'

import { deleteHabito, getCategorias, getHabitos } from '../../api/marco'
import type { Categoria, Habito } from '../../api/types'
import { BrandHeader } from '../../components/BrandHeader'
import { SwipeRow } from '../../components/SwipeRow'
import { HabitoForm } from './HabitoForm'
import './HabitosScreen.css'

export function HabitosScreen() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Habito | null | 'new'>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([getCategorias(), getHabitos()])
      .then(([cats, habs]) => {
        setCategorias(cats)
        setHabitos(habs)
      })
      .catch(() => setError('No se pudieron cargar los hábitos.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categoriaNombre = useMemo(() => {
    const map = new Map(categorias.map((c) => [c.id, c.nombre]))
    return (id: number) => map.get(id) ?? '—'
  }, [categorias])

  const handleDelete = useCallback(
    (id: number) => {
      deleteHabito(id)
        .then(() => {
          setConfirmDeleteId(null)
          load()
        })
        .catch(() => setError('No se pudo eliminar el hábito.'))
    },
    [load],
  )

  if (editing !== null) {
    return (
      <HabitoForm
        categorias={categorias}
        initial={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    )
  }

  return (
    <view className="HabitosScreen ScreenEnter">
      <BrandHeader title="Hábitos">
        <view className="AddButton" bindtap={() => setEditing('new')}>
          <text className="AddButtonText">+ Nuevo</text>
        </view>
      </BrandHeader>

      {loading ? <text className="HabitosStatus">Cargando…</text> : null}
      {error ? <text className="HabitosStatus">{error}</text> : null}
      {!loading && !error && habitos.length === 0 ? (
        <text className="HabitosStatus">Aún no tienes hábitos. Crea el primero con "+ Nuevo".</text>
      ) : null}

      {habitos.length > 0 ? (
        <text className="HabitosHint">Arrastra una tarjeta: → para editar, ← para eliminar.</text>
      ) : null}

      {habitos.map((habito, index) => (
        <SwipeRow
          key={habito.id}
          className="StaggerIn"
          style={{ animationDelay: `${Math.min(index, 10) * 0.045}s` }}
          swipeRightLabel="Editar"
          onSwipeRight={() => setEditing(habito)}
          swipeLeftLabel="Eliminar"
          // Arrastrar no borra: abre la confirmación que ya existía. Un gesto
          // es fácil de hacer sin querer, y esto no se puede deshacer.
          onSwipeLeft={() => setConfirmDeleteId(habito.id)}
        >
          <view className="HabitoCard">
            <view className="HabitoCardBar" style={{ backgroundColor: habito.color }} />
            <view className="HabitoCardInfo">
              <text className={`HabitoCardName ${habito.activo === 0 ? 'HabitoCardName--inactive' : ''}`}>
                {habito.nombre}
                {habito.activo === 0 ? ' (inactivo)' : ''}
              </text>
              <text className="HabitoCardMeta">
                {categoriaNombre(habito.categoria_id)} · {habito.meta_diaria} {habito.unidad_medida}
              </text>
            </view>

            {confirmDeleteId === habito.id ? (
              <view className="ConfirmRow">
                <text className="ConfirmText">¿Eliminar?</text>
                <view className="HabitoCardAction" bindtap={() => handleDelete(habito.id)}>
                  <text className="HabitoCardActionText HabitoCardActionText--danger">Sí</text>
                </view>
                <view className="HabitoCardAction" bindtap={() => setConfirmDeleteId(null)}>
                  <text className="HabitoCardActionText">No</text>
                </view>
              </view>
            ) : null}
          </view>
        </SwipeRow>
      ))}
    </view>
  )
}
