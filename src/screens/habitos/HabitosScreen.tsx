import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'

import { deleteHabito, getCategorias, getHabitos } from '../../api/marco'
import type { Categoria, Habito } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { BrandHeader } from '../../components/BrandHeader'
import { useFab } from '../../components/fabContext'
import { SwipeRow } from '../../components/SwipeRow'
import { formatNumero, unidadPara } from '../../lib/formato'
import { HabitoForm } from './HabitoForm'
import './HabitosScreen.css'

export function HabitosScreen() {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Habito | null | 'new'>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([getCategorias(), getHabitos(user?.mostrar_ocultos)])
      .then(([cats, habs]) => {
        setCategorias(cats)
        setHabitos(habs)
      })
      .catch(() => setError('No se pudieron cargar los hábitos.'))
      .finally(() => setLoading(false))
  }, [user?.mostrar_ocultos])

  useEffect(() => {
    load()
  }, [load])

  // Hábitos agrupados por categoría, en el orden de las categorías. Los que
  // apuntan a una categoría que ya no existe van al final, sin perderse.
  const grupos = useMemo(() => {
    const porCategoria = new Map<number, Habito[]>()
    habitos.forEach((h) => {
      const lista = porCategoria.get(h.categoria_id) ?? []
      lista.push(h)
      porCategoria.set(h.categoria_id, lista)
    })
    const resultado: { id: number; nombre: string; habitos: Habito[] }[] = []
    categorias.forEach((c) => {
      const lista = porCategoria.get(c.id)
      if (lista) resultado.push({ id: c.id, nombre: c.nombre, habitos: lista })
      porCategoria.delete(c.id)
    })
    const huerfanos: Habito[] = []
    porCategoria.forEach((lista) => huerfanos.push(...lista))
    if (huerfanos.length > 0) resultado.push({ id: -1, nombre: 'Sin categoría', habitos: huerfanos })
    return resultado
  }, [categorias, habitos])

  // El botón flotante "Nuevo hábito" vive en AppLayout; se quita mientras el
  // formulario está abierto y al salir de la pantalla.
  const { setFab } = useFab()
  useEffect(() => {
    setFab(editing === null ? { label: 'Nuevo hábito', onPress: () => setEditing('new') } : null)
    return () => setFab(null)
  }, [editing, setFab])

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

  let indice = 0
  return (
    <view className="HabitosScreen ScreenEnter">
      <BrandHeader title="Hábitos" />

      {loading ? <text className="HabitosStatus">Cargando…</text> : null}
      {error ? <text className="HabitosStatus">{error}</text> : null}
      {!loading && !error && habitos.length === 0 ? (
        <text className="HabitosStatus">Aún no tienes hábitos. Crea el primero con «Nuevo hábito».</text>
      ) : null}

      {grupos.map((grupo) => (
        <view key={grupo.id} className="HabitosGrupo">
          <text className="HabitosGrupoLabel">{grupo.nombre}</text>
          <view className="HabitosGrupoLista">
            {grupo.habitos.map((habito, i) => {
              const delay = Math.min(indice++, 10) * 0.045
              return (
                <SwipeRow
                  key={habito.id}
                  className="StaggerIn"
                  style={{ animationDelay: `${delay}s` }}
                  swipeRightLabel="Editar"
                  onSwipeRight={() => setEditing(habito)}
                  swipeLeftLabel="Eliminar"
                  // Arrastrar no borra: abre la confirmación que ya existía. Un
                  // gesto es fácil de hacer sin querer, y esto no se puede deshacer.
                  onSwipeLeft={() => setConfirmDeleteId(habito.id)}
                >
                  <view className={`HabitoCard ${i > 0 ? 'HabitoCard--divided' : ''}`}>
                    <view className="HabitoCardDot" style={{ backgroundColor: habito.color }} />
                    <view className="HabitoCardInfo">
                      <text className={`HabitoCardName ${habito.activo === 0 ? 'HabitoCardName--inactive' : ''}`}>
                        {habito.nombre}
                        {habito.activo === 0 ? ' (inactivo)' : ''}
                        {habito.oculto === 1 ? ' (oculto)' : ''}
                      </text>
                      <text className="HabitoCardMeta">
                        {formatNumero(habito.meta_diaria)} {unidadPara(habito.meta_diaria, habito.unidad_medida)} al día
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
              )
            })}
          </view>
        </view>
      ))}

      {/* El gesto no se ve por sí solo; sin esta línea nadie lo descubriría. */}
      {habitos.length > 0 ? (
        <text className="HabitosHint">Desliza un hábito: → para editar, ← para eliminar.</text>
      ) : null}
    </view>
  )
}
