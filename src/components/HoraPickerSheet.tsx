import { useCallback, useRef, useState } from '@lynx-js/react'

import { minusIcon, plusIcon } from './icons'
import './HoraPickerSheet.css'

const HORAS = Array.from({ length: 24 }, (_, i) => i)
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5)

// Literales: el SVG de `content` no resuelve var().
const ICONO = '#a29dac' // --color-text-secondary

function dos(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * Selector de hora propio, en hoja inferior, con la paleta de la app. Sustituye
 * al reloj del sistema, que no se deja vestir: siempre salía gris y azul.
 *
 * Funciona como el selector de Material 3: arriba la hora en dos casillas
 * (horas y minutos) y debajo una cuadrícula para la casilla activa. Elegir la
 * hora pasa sola a los minutos. Los minutos van de 5 en 5 en la cuadrícula y
 * los botones − / + afinan de uno en uno, así que se llega a cualquier minuto.
 */
export function HoraPickerSheet({
  inicial,
  existentes,
  onCancel,
  onAdd,
}: {
  /** "HH:MM" con la que arranca. */
  inicial: string
  /** Horas ya elegidas: si la del selector es una de ellas, no se puede añadir. */
  existentes: string[]
  onCancel: () => void
  onAdd: (hora: string) => void
}) {
  const [h0, m0] = inicial.split(':').map(Number)
  const [hora, setHora] = useState(Number.isFinite(h0) ? h0 : 20)
  const [minuto, setMinuto] = useState(Number.isFinite(m0) ? m0 : 0)
  const [editando, setEditando] = useState<'hora' | 'minuto'>('hora')

  const valor = `${dos(hora)}:${dos(minuto)}`
  const repetida = existentes.includes(valor)

  const afinar = (delta: number) => setMinuto((m) => (m + delta + 60) % 60)

  // El toque que abrió la hoja termina de entregarse cuando el overlay ya está
  // montado debajo del dedo, y lo cerraba al instante (visto en un SM-S918U;
  // es el mismo caso que ProgresoParcialModal). Se ignoran los toques sobre el
  // fondo de los primeros instantes.
  const abiertaEn = useRef(Date.now())
  const handleFondo = useCallback(() => {
    if (Date.now() - abiertaEn.current < 400) return
    onCancel()
  }, [onCancel])

  return (
    // El overlay cierra al tocar fuera; la hoja usa catchtap para que un toque
    // dentro no burbujee hasta él.
    <view className="HoraSheetOverlay" bindtap={handleFondo}>
      <view className="HoraSheet" catchtap={() => undefined}>
        <view className="HoraSheetAsa" />
        <text className="HoraSheetTitulo">Añadir hora</text>

        <view className="HoraDisplay">
          <view
            className={`HoraCasilla ${editando === 'hora' ? 'HoraCasilla--on' : ''}`}
            bindtap={() => setEditando('hora')}
          >
            <text className={`HoraCasillaText ${editando === 'hora' ? 'HoraCasillaText--on' : ''}`}>{dos(hora)}</text>
          </view>
          <text className="HoraDosPuntos">:</text>
          <view
            className={`HoraCasilla ${editando === 'minuto' ? 'HoraCasilla--on' : ''}`}
            bindtap={() => setEditando('minuto')}
          >
            <text className={`HoraCasillaText ${editando === 'minuto' ? 'HoraCasillaText--on' : ''}`}>
              {dos(minuto)}
            </text>
          </view>
        </view>

        <view className="HoraGridHead">
          <text className="HoraGridLabel">{editando === 'hora' ? 'Hora' : 'Minutos'}</text>
          {editando === 'minuto' ? (
            <view className="HoraAfinar">
              <view className="HoraAfinarBoton" bindtap={() => afinar(-1)}>
                <svg className="HoraAfinarIcon" content={minusIcon(ICONO)} />
              </view>
              <view className="HoraAfinarBoton" bindtap={() => afinar(1)}>
                <svg className="HoraAfinarIcon" content={plusIcon(ICONO)} />
              </view>
            </view>
          ) : null}
        </view>

        <view className="HoraGrid">
          {editando === 'hora'
            ? HORAS.map((h) => (
                <view
                  key={h}
                  className="HoraCeldaHueco"
                  bindtap={() => {
                    setHora(h)
                    setEditando('minuto')
                  }}
                >
                  <view className={`HoraCelda ${h === hora ? 'HoraCelda--on' : ''}`}>
                    <text className={`HoraCeldaText ${h === hora ? 'HoraCeldaText--on' : ''}`}>{dos(h)}</text>
                  </view>
                </view>
              ))
            : MINUTOS.map((m) => (
                <view key={m} className="HoraCeldaHueco" bindtap={() => setMinuto(m)}>
                  <view className={`HoraCelda ${m === minuto ? 'HoraCelda--on' : ''}`}>
                    <text className={`HoraCeldaText ${m === minuto ? 'HoraCeldaText--on' : ''}`}>{dos(m)}</text>
                  </view>
                </view>
              ))}
        </view>

        <view className="HoraSheetAcciones">
          <view className="HoraBoton" bindtap={onCancel}>
            <text className="HoraBotonText">Cancelar</text>
          </view>
          <view
            className={`HoraBoton HoraBoton--primario ${repetida ? 'HoraBoton--off' : ''}`}
            bindtap={() => {
              if (!repetida) onAdd(valor)
            }}
          >
            <text className={`HoraBotonText HoraBotonText--primario ${repetida ? 'HoraBotonText--off' : ''}`}>
              {repetida ? 'Ya está en la lista' : `Añadir ${valor}`}
            </text>
          </view>
        </view>
      </view>
    </view>
  )
}
