import { useEffect } from '@lynx-js/react'

import logroCompleto from '../assets/logro-completo.gif'
import './LogroOverlay.css'

/** Duración real del GIF (26 frames: ~1000ms de badge+confeti + 500ms de
 *  remanso en el último frame). `bindfinalloopcomplete` ya cierra en ese
 *  momento; este timeout es solo la red por si el evento no llega en alguna
 *  plataforma.
 *
 *  El asset es GIF y no APNG: en este runtime de Lynx (Fresco de Android) el
 *  APNG cargaba (`bindload` llegaba a disparar) pero nunca llegó a pintar
 *  ni un frame. El GIF con la misma animación sí funciona. */
const DURACION_MS = 1650

/** Se muestra vía modalHost cuando el día pasa de incompleto a 100%.
 *
 *  Importante: quien llama a `modalHost.open(<LogroOverlay .../>)` tiene que
 *  hacerlo de forma síncrona dentro del handler del gesto (tap / guardar),
 *  nunca desde un `useEffect` ni desde un `.then()`. Probado en dispositivo
 *  (SM-S918U): hecho desde ahí, Lynx no encuentra el snapshot de este
 *  componente en el hilo principal ("Snapshot not found: __snapshot_...") y
 *  el overlay nunca se pinta, aunque el estado de React se actualice bien. */
export function LogroOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, DURACION_MS)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <view className="LogroOverlay" bindtap={onDone}>
      <image className="LogroImg" src={logroCompleto} loop-count={1} bindfinalloopcomplete={onDone} />
      <text className="LogroTexto">¡Día completo!</text>
    </view>
  )
}
