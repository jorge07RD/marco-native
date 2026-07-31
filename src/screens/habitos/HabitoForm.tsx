import { useCallback, useEffect, useState } from '@lynx-js/react'

import { createHabito, updateHabito } from '../../api/marco'
import type { Categoria, Habito, HabitoCreate } from '../../api/types'
import { Switch } from '../../components/Switch'
import './HabitoForm.css'

const DIAS_SEMANA: { letra: string; label: string }[] = [
  { letra: 'L', label: 'L' },
  { letra: 'M', label: 'M' },
  { letra: 'X', label: 'X' },
  { letra: 'J', label: 'J' },
  { letra: 'V', label: 'V' },
  { letra: 'S', label: 'S' },
  { letra: 'D', label: 'D' },
]

// Paleta exacta del original (marco/frontend HabitoForm.svelte).
const COLORES = ['#e94560', '#00ff88', '#7b2cbf', '#0b61b8', '#ffd60a', '#ff6b35', '#4ecdc4', '#533483']

function parseDias(dias: string): string[] {
  try {
    const parsed: unknown = JSON.parse(dias)
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === 'string') : []
  } catch {
    return []
  }
}

interface HabitoFormProps {
  categorias: Categoria[]
  initial: Habito | null
  onCancel: () => void
  onSaved: () => void
}

export function HabitoForm({ categorias, initial, onCancel, onSaved }: HabitoFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [categoriaId, setCategoriaId] = useState<number | null>(initial?.categoria_id ?? categorias[0]?.id ?? null)
  const [unidadMedida, setUnidadMedida] = useState(initial?.unidad_medida ?? '')
  const [metaDiaria, setMetaDiaria] = useState(initial ? String(initial.meta_diaria) : '')
  const [dias, setDias] = useState<string[]>(initial ? parseDias(initial.dias) : ['L', 'M', 'X', 'J', 'V', 'S', 'D'])
  const [color, setColor] = useState(initial?.color ?? COLORES[0])
  const [activo, setActivo] = useState(initial ? initial.activo !== 0 : true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleDia = useCallback((letra: string) => {
    setDias((prev) => (prev.includes(letra) ? prev.filter((d) => d !== letra) : [...prev, letra]))
  }, [])

  // El <input> de Lynx es no controlado (sin prop `value`, ver
  // guide/interaction/event-handling) — para precargar texto en modo edición
  // hay que setearlo imperativamente vía SelectorQuery una vez montado.
  useEffect(() => {
    if (!initial) return
    const values: [string, string][] = [
      ['#habito-form-nombre', initial.nombre],
      ['#habito-form-descripcion', initial.descripcion ?? ''],
      ['#habito-form-unidad', initial.unidad_medida],
      ['#habito-form-meta', String(initial.meta_diaria)],
    ]
    values.forEach(([selector, value]) => {
      lynx
        .createSelectorQuery()
        .select(selector)
        .invoke({ method: 'setValue', params: { value } })
        .exec()
    })
    // Solo al montar el formulario de edición — no queremos re-sobrescribir
    // mientras el usuario escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = useCallback(() => {
    const metaNum = Number(metaDiaria)
    if (!nombre.trim() || !unidadMedida.trim() || !categoriaId || dias.length === 0 || !metaNum || metaNum <= 0) {
      setError('Completa nombre, unidad, meta diaria (> 0), categoría y al menos un día.')
      return
    }
    setError(null)
    setSaving(true)

    const payload: HabitoCreate = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      categoria_id: categoriaId,
      unidad_medida: unidadMedida.trim(),
      meta_diaria: metaNum,
      dias: JSON.stringify(dias),
      color,
      activo: activo ? 1 : 0,
    }

    const request = initial ? updateHabito(initial.id, payload) : createHabito(payload)
    request
      .then(() => onSaved())
      .catch(() => setError('No se pudo guardar el hábito.'))
      .finally(() => setSaving(false))
  }, [nombre, descripcion, categoriaId, unidadMedida, metaDiaria, dias, color, activo, initial, onSaved])

  return (
    <view className="HabitoForm">
      <text className="HabitoFormTitle">{initial ? 'Editar hábito' : 'Nuevo hábito'}</text>

      <text className="HabitoFormLabel">Nombre</text>
      <input
        id="habito-form-nombre"
        className="HabitoFormInput"
        bindinput={(e) => setNombre(e.detail.value)}
      />

      <text className="HabitoFormLabel">Descripción (opcional)</text>
      <input
        id="habito-form-descripcion"
        className="HabitoFormInput"
        bindinput={(e) => setDescripcion(e.detail.value)}
      />

      <text className="HabitoFormLabel">Categoría</text>
      <view className="ChipRow">
        {categorias.map((cat) => (
          <view
            key={cat.id}
            className={`Chip ${categoriaId === cat.id ? 'Chip--active' : ''}`}
            bindtap={() => setCategoriaId(cat.id)}
          >
            <text className="ChipText">{cat.nombre}</text>
          </view>
        ))}
      </view>

      <text className="HabitoFormLabel">Unidad de medida</text>
      <input
        id="habito-form-unidad"
        className="HabitoFormInput"
        placeholder="veces, minutos, vasos…"
        bindinput={(e) => setUnidadMedida(e.detail.value)}
      />

      <text className="HabitoFormLabel">Meta diaria</text>
      <input
        id="habito-form-meta"
        className="HabitoFormInput"
        type="number"
        bindinput={(e) => setMetaDiaria(e.detail.value)}
      />

      <text className="HabitoFormLabel">Días</text>
      <view className="ChipRow">
        {DIAS_SEMANA.map((d) => (
          <view
            key={d.letra}
            className={`DayChip ${dias.includes(d.letra) ? 'DayChip--active' : ''}`}
            bindtap={() => toggleDia(d.letra)}
          >
            <text className="ChipText">{d.label}</text>
          </view>
        ))}
      </view>

      <text className="HabitoFormLabel">Color</text>
      <view className="ChipRow">
        {COLORES.map((c) => (
          <view
            key={c}
            className={`ColorSwatch ${color === c ? 'ColorSwatch--active' : ''}`}
            style={{ backgroundColor: c }}
            bindtap={() => setColor(c)}
          />
        ))}
      </view>

      <view className="ActivoRow" bindtap={() => setActivo((a) => !a)}>
        <text className="HabitoFormLabel">Activo</text>
        <Switch on={activo} />
      </view>

      {error ? <text className="HabitoFormError">{error}</text> : null}

      <view className="FormButtonRow">
        <view className="FormButton FormButton--secondary" bindtap={onCancel}>
          <text className="FormButtonText">Cancelar</text>
        </view>
        <view className="FormButton" bindtap={handleSubmit}>
          <text className="FormButtonText">{saving ? 'Guardando…' : 'Guardar'}</text>
        </view>
      </view>
    </view>
  )
}
