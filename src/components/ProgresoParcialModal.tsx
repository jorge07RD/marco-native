import { useCallback, useRef, useState } from '@lynx-js/react'

import { INPUT_TEXT_COLOR, textoSobre } from '../lib/colors'
import './ProgresoParcialModal.css'

/** Dos decimales como mucho: un cuarto de 30 es 7.5, pero un tercio de 10 no
 *  tiene por qué salir con toda la cola de coma flotante. */
function formatNumero(n: number): string {
  return String(Math.round(n * 100) / 100)
}

const ATAJOS: { etiqueta: string; fraccion: number }[] = [
  { etiqueta: '¼', fraccion: 0.25 },
  { etiqueta: '½', fraccion: 0.5 },
  { etiqueta: '¾', fraccion: 0.75 },
  { etiqueta: 'Todo', fraccion: 1 },
]

/** Registro parcial de un hábito del día — se abre dejando presionada su fila. */
export function ProgresoParcialModal({
  nombre,
  meta,
  unidad,
  color,
  valorInicial,
  onCancel,
  onSave,
}: {
  nombre: string
  meta: number
  unidad: string
  /** El del hábito: el modal se viste con él para que se lea como una
   *  continuación de la fila que acaba de dibujar su borde con ese color. */
  color: string
  valorInicial: number
  onCancel: () => void
  onSave: (valor: number) => void
}) {
  const [valor, setValor] = useState(() => (valorInicial > 0 ? formatNumero(valorInicial) : ''))
  const [error, setError] = useState<string | null>(null)
  const abiertoEn = useRef(Date.now())
  const releaseConsumido = useRef(false)

  // El dedo que abrió este modal con una pulsación larga sigue sobre la
  // pantalla: al levantarlo llega un tap que cae sobre el overlay recién
  // montado y lo cerraría de inmediato (verificado en un SM-S918U).
  //
  // Se descarta ese tap por ser EL PRIMERO, no por llegar antes de un plazo:
  // una ventana de tiempo desde el montaje se agota si el usuario mantiene el
  // dedo un rato largo, y entonces el modal se cierra solo al soltar. El plazo
  // se mantiene solo como tope, para no tragarse un toque-fuera legítimo si en
  // algún caso el "soltar" no llega a generar tap.
  const handleOverlayTap = useCallback(() => {
    if (!releaseConsumido.current) {
      releaseConsumido.current = true
      if (Date.now() - abiertoEn.current < 1500) return
    }
    onCancel()
  }, [onCancel])

  const handleGuardar = useCallback(() => {
    // Vacío cuenta como 0: es la forma de deshacer un parcial sin tener que
    // escribir el cero a mano.
    const parsed = valor.trim() === '' ? 0 : Number(valor.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Escribe un número válido.')
      return
    }
    setError(null)
    onSave(parsed)
  }, [valor, onSave])

  return (
    // El overlay cierra al tocar fuera; la tarjeta usa catchtap para que el tap
    // no burbujee hasta él y la cierre al tocar dentro.
    <view className="ParcialOverlay" bindtap={handleOverlayTap}>
      <view className="ParcialCard" catchtap={() => undefined} style={{ borderColor: color }}>
        <text className="ParcialNombre">{nombre}</text>
        <text className="ParcialMeta">
          Meta: {formatNumero(meta)} {unidad}
        </text>

        <input
          id="progreso-parcial-valor"
          className="ParcialInput"
          text-color={INPUT_TEXT_COLOR}
          type="number"
          value={valor}
          placeholder="0"
          bindinput={(e) => setValor(e.detail.value)}
        />

        <view className="ParcialAtajos">
          {ATAJOS.map((atajo, index) => (
            <view
              key={atajo.etiqueta}
              className={`ParcialAtajo ${index === ATAJOS.length - 1 ? 'ParcialAtajo--ultimo' : ''}`}
              bindtap={() => {
                setError(null)
                setValor(formatNumero(meta * atajo.fraccion))
              }}
            >
              <text className="ParcialAtajoText" style={{ color }}>
                {atajo.etiqueta}
              </text>
            </view>
          ))}
        </view>

        {error ? <text className="ParcialError">{error}</text> : null}

        <view className="ParcialAcciones">
          <view className="ParcialBoton" bindtap={onCancel}>
            <text className="ParcialBotonText">Cancelar</text>
          </view>
          <view
            className="ParcialBoton ParcialBoton--primario"
            style={{ backgroundColor: color }}
            bindtap={handleGuardar}
          >
            <text className="ParcialBotonText" style={{ color: textoSobre(color) }}>
              Guardar
            </text>
          </view>
        </view>
      </view>
    </view>
  )
}
