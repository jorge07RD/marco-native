import { createContext } from '@lynx-js/react'
import type { ReactNode } from 'react'

export interface ChartZoomApi {
  open: (title: string, node: ReactNode) => void
}

export const ChartZoomContext = createContext<ChartZoomApi | null>(null)
