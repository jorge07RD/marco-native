import { createContext, useContext } from '@lynx-js/react'

/** Botón flotante (FAB de Material 3) de la pantalla activa.
 *
 *  Vive en AppLayout, como hermano del scroll-view, por la misma razón que
 *  ModalHostContext: dentro del scroll un `position: absolute` se resuelve
 *  contra el contenido que scrollea y el botón se iría con la lista.
 *
 *  La pantalla pasa la etiqueta y la acción, no un nodo JSX: el FAB lo pinta
 *  AppLayout. Montar JSX creado en un efecto falla en Lynx ("Snapshot not
 *  found", ver el comentario de `pctDe` en DashboardScreen). */
export interface FabSpec {
  label: string
  onPress: () => void
}

export interface FabApi {
  setFab: (spec: FabSpec | null) => void
}

export const FabContext = createContext<FabApi | null>(null)

export function useFab() {
  const ctx = useContext(FabContext)
  if (!ctx) throw new Error('useFab fuera de AppLayout')
  return ctx
}
