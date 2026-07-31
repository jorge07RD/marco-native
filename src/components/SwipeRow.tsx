import { runOnBackground, useMainThreadRef } from '@lynx-js/react'
import type { MainThread } from '@lynx-js/types'
import type { ReactNode } from 'react'

import './SwipeRow.css'

/** Cuánto hay que arrastrar para que la acción cuente al soltar. */
const UMBRAL = 80
/** Tope de desplazamiento: más allá el gesto no aporta nada. */
const TOPE = 130

interface SwipeRowProps {
  children: ReactNode
  /** Se aplican al contenedor, no a la tarjeta. La animación de entrada tiene
   *  que envolver también a los paneles: si se anima solo la tarjeta, mientras
   *  dura el fade es translúcida y los paneles se transparentan a través. */
  className?: string
  style?: Record<string, string>
  /** Se dispara al arrastrar hacia la derecha; su panel se descubre por la izquierda. */
  onSwipeRight: () => void
  swipeRightLabel: string
  /** Se dispara al arrastrar hacia la izquierda; su panel se descubre por la derecha. */
  onSwipeLeft: () => void
  swipeLeftLabel: string
}

/**
 * Fila que se puede arrastrar en horizontal para descubrir una acción a cada
 * lado. Los dos paneles están quietos debajo; lo que se mueve es la tarjeta,
 * que es opaca y los tapa en reposo.
 *
 * El arrastre corre entero en el hilo principal (`'main thread'` +
 * `setStyleProperty`): pasar cada `touchmove` al hilo de background para
 * re-renderizar con estado de React se arrastraría de forma perceptible. Por
 * eso el desplazamiento vive en `useMainThreadRef` y no en `useState` — es la
 * única manera de conservar el punto de inicio entre una llamada y la
 * siguiente sin cruzar de hilo. Solo el disparo final vuelve al background,
 * vía `runOnBackground`.
 */
export function SwipeRow({
  children,
  className,
  style,
  onSwipeRight,
  swipeRightLabel,
  onSwipeLeft,
  swipeLeftLabel,
}: SwipeRowProps) {
  const card = useMainThreadRef<MainThread.Element>(null)
  const inicioX = useMainThreadRef<number>(0)
  const desplazamiento = useMainThreadRef<number>(0)
  const activo = useMainThreadRef<boolean>(false)

  // El origen del gesto se fija en el primer `touchmove`, no en `touchstart`:
  // en el dispositivo de prueba (SM-S918U) `touchstart` no llega nunca a este
  // elemento — llegan `touchmove` y `touchend`, pero no el inicio. Si el
  // origen dependiera de él, cada arrastre se mediría contra la posición
  // sobrante del gesto anterior y el desplazamiento saldría arbitrario.
  const empezar = (x: number) => {
    'main thread'
    activo.current = true
    inicioX.current = x
    desplazamiento.current = 0
    // Sin transición mientras el dedo manda, o la tarjeta iría por detrás.
    card.current?.setStyleProperty('transition', 'none')
  }

  const alEmpezar = (e: MainThread.TouchEvent) => {
    'main thread'
    empezar(e.touches[0].clientX)
  }

  const alMover = (e: MainThread.TouchEvent) => {
    'main thread'
    const x = e.touches[0].clientX
    if (!activo.current) {
      empezar(x)
      return
    }
    let dx = x - inicioX.current
    if (dx > TOPE) dx = TOPE
    if (dx < -TOPE) dx = -TOPE
    desplazamiento.current = dx
    card.current?.setStyleProperty('transform', `translateX(${dx}px)`)
  }

  const alSoltar = () => {
    'main thread'
    const dx = desplazamiento.current
    desplazamiento.current = 0
    activo.current = false
    // La tarjeta siempre vuelve a su sitio: el gesto abre la acción, no deja
    // la fila abierta a medias.
    card.current?.setStyleProperty('transition', 'transform 0.22s ease-out')
    card.current?.setStyleProperty('transform', 'translateX(0px)')
    if (dx <= -UMBRAL) {
      runOnBackground(onSwipeLeft)()
    } else if (dx >= UMBRAL) {
      runOnBackground(onSwipeRight)()
    }
  }

  return (
    <view className={`SwipeRow ${className ?? ''}`} style={style}>
      <view className="SwipeAction SwipeAction--left">
        <text className="SwipeActionText">{swipeRightLabel}</text>
      </view>
      <view className="SwipeAction SwipeAction--right">
        <text className="SwipeActionText SwipeActionText--danger">{swipeLeftLabel}</text>
      </view>
      <view
        className="SwipeRowCard"
        main-thread:ref={card}
        main-thread:bindtouchstart={alEmpezar}
        main-thread:bindtouchmove={alMover}
        main-thread:bindtouchend={alSoltar}
        main-thread:bindtouchcancel={alSoltar}
      >
        {children}
      </view>
    </view>
  )
}
