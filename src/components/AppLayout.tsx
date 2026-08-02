import { useCallback, useMemo, useState } from '@lynx-js/react'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

import { ChartZoomModal } from './ChartZoomModal'
import { ChartZoomContext } from './chartZoomContext'
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

  return (
    <ChartZoomContext.Provider value={{ open }}>
      <ModalHostContext.Provider value={modalHost}>
        <view className="AppLayout">
          <scroll-view id="app-scroll-view" className="AppLayoutContent" scroll-orientation="vertical">
            <Outlet />
          </scroll-view>
          <TabBar />
          {zoom ? (
            <ChartZoomModal title={zoom.title} onClose={close}>
              {zoom.node}
            </ChartZoomModal>
          ) : null}
          {modal}
        </view>
      </ModalHostContext.Provider>
    </ChartZoomContext.Provider>
  )
}
