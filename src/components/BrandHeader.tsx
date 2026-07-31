import type { ReactNode } from 'react'

import { brandMark } from './icons'
import './BrandHeader.css'

/** Cabecera de pantalla del rediseño: la diana de marca a 28px seguida del
 *  título. `children` va pegado a la derecha (el "+ Nuevo" de Hábitos). */
export function BrandHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <view className="BrandHeader">
      <svg className="BrandHeaderMark" content={brandMark(26)} />
      <text className="BrandHeaderTitle">{title}</text>
      {children}
    </view>
  )
}
