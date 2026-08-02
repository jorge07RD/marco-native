import { createContext } from '@lynx-js/react'
import type { ReactNode } from 'react'

/** Punto donde montar un modal por encima de la pantalla.
 *
 *  Existe porque las pantallas se renderizan dentro del `<scroll-view>` de
 *  AppLayout, y un overlay `position: absolute` ahí dentro se resuelve contra
 *  el contenido que scrollea, no contra la pantalla. `ChartZoomModal` ya
 *  esquiva eso montándose como hermano del scroll-view; esto es lo mismo pero
 *  sin imponer el cromo de título/cerrar del zoom de gráficas. */
export interface ModalHostApi {
  open: (node: ReactNode) => void
  close: () => void
}

export const ModalHostContext = createContext<ModalHostApi | null>(null)
