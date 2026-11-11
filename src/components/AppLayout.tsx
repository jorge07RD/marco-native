import { useCallback, useMemo, useState } from '@lynx-js/react'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

import { ChartZoomModal } from './ChartZoomModal'
import { ChartZoomContext } from './chartZoomContext'
import { FabContext, type FabSpec } from './fabContext'
import { plusIcon } from './icons'
import { ModalHostContext } from './modalHostContext'
import { TabBar } from './TabBar'
import './AppLayout.css'

export function AppLayout() {
  const [zoom, setZoom] = useState<{ title: string; node: ReactNode } | null>(null)
  const open = useCallback((title: string, node: ReactNode) => setZoom({ title, node }), [])
  const close = useCallback(() => setZoom(null), [])

  const [modal, setModal] = useState<ReactNode | null>(null)
  const openModal = useCallback((node: ReactNode) => setModal(node), [])
  const closeModal = useCallback(() => setModal(null), [])
  const modalHost = useMemo(() => ({ open: openModal, close: closeModal }), [openModal, closeModal])

  const [fab, setFab] = useState<FabSpec | null>(null)
  const fabApi = useMemo(() => ({ setFab }), [])

  return (
    <ChartZoomContext.Provider value={{ open }}>
      <ModalHostContext.Provider value={modalHost}>
        <FabContext.Provider value={fabApi}>
          <view className="AppLayout">
            <scroll-view id="app-scroll-view" className="AppLayoutContent" scroll-orientation="vertical">
              <Outlet />
            </scroll-view>
            <TabBar />
            {fab ? (
              <view className="Fab PressScale" bindtap={fab.onPress}>
                {/* --color-on-accent: el SVG de `content` no resuelve var(). */}
                <svg className="FabIcon" content={plusIcon('#ffffff')} />
                <text className="FabLabel">{fab.label}</text>
              </view>
            ) : null}
            {zoom ? (
              <ChartZoomModal title={zoom.title} onClose={close}>
                {zoom.node}
              </ChartZoomModal>
            ) : null}
            {modal}
          </view>
        </FabContext.Provider>
      </ModalHostContext.Provider>
    </ChartZoomContext.Provider>
  )
}
