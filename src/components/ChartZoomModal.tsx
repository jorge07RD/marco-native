import type { ReactNode } from 'react'

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
          <text className="ChartZoomClose" bindtap={onClose}>
            ×
          </text>
        </view>
        <view className="ChartZoomBody">{children}</view>
      </view>
    </view>
  )
}
