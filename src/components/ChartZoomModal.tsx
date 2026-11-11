import type { ReactNode } from 'react'

import { closeIcon } from './icons'
import './ChartZoomModal.css'

export function ChartZoomModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <view className="ChartZoomOverlay" bindtap={onClose}>
      <view className="ChartZoomCard">
        <view className="ChartZoomHeader">
          <text className="ChartZoomTitle">{title}</text>
          <view className="IconButton ChartZoomClose" bindtap={onClose}>
            <svg className="ChartZoomCloseIcon" content={closeIcon('#a29dac')} />
          </view>
        </view>
        <view className="ChartZoomBody">{children}</view>
      </view>
    </view>
  )
}
