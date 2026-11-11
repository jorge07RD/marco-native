import type { ReactNode } from 'react'

import { brandMark, chevronIcon } from './icons'
import './BrandHeader.css'

/** Barra superior de pantalla: la diana de marca seguida del título.
 *  `children` va pegado a la derecha. */
export function BrandHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <view className="BrandHeader">
      <svg className="BrandHeaderMark" content={brandMark(36)} />
      <text className="BrandHeaderTitle">{title}</text>
      {children}
    </view>
  )
}

// --color-text-secondary: el SVG de `content` no resuelve var().
const CHEVRON_COLOR = '#a29dac'

/** Par de flechas anterior/siguiente de 48 dp para la barra superior. */
export function PrevNextButtons({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <view style={{ display: 'flex', flexDirection: 'row' }}>
      <view className="IconButton" bindtap={onPrev}>
        <svg className="IconButtonIcon" content={chevronIcon('izq', CHEVRON_COLOR)} />
      </view>
      <view className="IconButton" bindtap={onNext}>
        <svg className="IconButtonIcon" content={chevronIcon('der', CHEVRON_COLOR)} />
      </view>
    </view>
  )
}
