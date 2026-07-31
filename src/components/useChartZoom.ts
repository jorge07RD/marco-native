import { useContext } from '@lynx-js/react'

import { ChartZoomContext } from './chartZoomContext'

export function useChartZoom() {
  const ctx = useContext(ChartZoomContext)
  if (!ctx) throw new Error('useChartZoom debe usarse dentro de AppLayout')
  return ctx
}
