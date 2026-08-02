import {
  runOnBackground,
  useCallback,
  useEffect,
  useMainThreadRef,
  useMemo,
  useRef,
  useState,
} from '@lynx-js/react'
import type { MainThread } from '@lynx-js/types'

import { medirRect } from '../lib/rect'
import './ColorPicker.css'

/** Cuántas franjas forman cada barra. El proyecto no usa `linear-gradient` en
 *  ningún sitio y no hay nada que confirme que el renderer de Lynx lo pinte,
 *  así que las barras se componen de tiras de color contiguas. */
const FRANJAS = 36

export interface Hsl {
  /** 0–360 */
  h: number
  /** 0–1 */
  s: number
  /** 0–1 */
  l: number
}

function dos(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)))
  return (v < 16 ? '0' : '') + v.toString(16)
}

export function hslAHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return `#${dos((r + m) * 255)}${dos((g + m) * 255)}${dos((b + m) * 255)}`
}

/** Devuelve un HSL neutro para cualquier cosa que no sea #rrggbb. */
export function hexAHsl(hex: string): Hsl {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return { h: 0, s: 1, l: 0.5 }
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  return { h: h < 0 ? h + 360 : h, s, l }
}

/**
 * Una barra arrastrable. El arrastre corre entero en el hilo principal, igual
 * que SwipeRow y por la misma razón: pasar cada `touchmove` al hilo de
 * background para re-renderizar con estado de React se arrastraría de forma
 * perceptible. Lo único que cruza de hilo es la fracción elegida.
 */
function Barra({
  id,
  franjas,
  pct,
  colorPulgar,
  onPct,
}: {
  /** Debe ser único: `medirRect` solo admite selectores de id. */
  id: string
  franjas: string[]
  pct: number
  colorPulgar: string
  onPct: (pct: number) => void
}) {
  // Borde izquierdo y ancho de la barra. Viven en estado de React (y no en un
  // MainThreadRef) porque un MainThreadRef solo se puede escribir desde el hilo
  // principal, y esto se mide desde el de background; las funciones
  // 'main thread' capturan valores del render sin problema.
  //
  // Se reintenta porque la primera medición corre antes de que el layout esté
  // resuelto y devuelve un rect degenerado: sin reintento el deslizador salía
  // muerto unas veces sí y otras no, según cómo cayera la carrera.
  const [geo, setGeo] = useState({ izq: 0, ancho: 0 })
  const pulgar = useMainThreadRef<MainThread.Element>(null)
  const ultimoCommit = useMainThreadRef<number>(0)
  // Fracción pintada pero todavía sin confirmar, o -1 si no hay nada a deber.
  const pendiente = useMainThreadRef<number>(-1)

  const medir = useCallback(() => {
    return medirRect(`#${id}`).then((r) => {
      if (!r || r.right - r.left <= 1) return false
      setGeo({ izq: r.left, ancho: r.right - r.left })
      return true
    })
  }, [id])

  useEffect(() => {
    let cancelado = false
    let intentos = 0
    const reintentar = () => {
      medir().then((ok) => {
        if (cancelado || ok) return
        intentos += 1
        if (intentos < 12) setTimeout(reintentar, 60)
      })
    }
    reintentar()
    return () => {
      cancelado = true
    }
  }, [medir])

  // Se sacan del objeto aquí, no dentro de la función: lo que va al hilo
  // principal se serializa, y estos dos números es todo lo que hace falta allí.
  const { izq, ancho } = geo

  const confirmar = (p: number) => {
    'main thread'
    ultimoCommit.current = Date.now()
    pendiente.current = -1
    runOnBackground(onPct)(p)
  }

  const mover = (clientX: number) => {
    'main thread'
    if (ancho <= 0) return
    // Se mide contra `clientX` (coordenada de pantalla) y el borde izquierdo de
    // la barra, NO contra `touches[0].x`: ese viene relativo al elemento
    // *tocado*, que a mitad de arrastre es una franja de ~10 px o el propio
    // pulgar, no la barra. Usándolo, la fracción salía casi cero y el
    // deslizador saltaba solo. Es el mismo motivo por el que SwipeRow usa
    // `clientX`.
    let p = (clientX - izq) / ancho
    if (p < 0) p = 0
    if (p > 1) p = 1
    // La posición se pinta desde aquí; el color del pulgar llega con el commit,
    // porque el hex depende de las otras dos barras y esa cuenta vive en el
    // hilo de background.
    pulgar.current?.setStyleProperty('left', `${p * 100}%`)

    // El valor se confirma mientras se arrastra, no solo al soltar: en el
    // SM-S918U `touchend` no siempre llega a este elemento (igual que
    // `touchstart` no llega a la tarjeta de SwipeRow), así que confiar el
    // commit al soltar dejaba gestos enteros sin guardar.
    //
    // Se limita a un cruce de hilo cada ~90 ms para no re-renderizar el
    // formulario en cada `touchmove`, que es justo el arrastre perceptible que
    // SwipeRow evita.
    pendiente.current = p
    const ahora = Date.now()
    if (ahora - ultimoCommit.current < 90) return
    confirmar(p)
  }

  const alMover = (e: MainThread.TouchEvent) => {
    'main thread'
    mover(e.touches[0].clientX)
  }

  // Al soltar se confirma el tramo que se quedó dentro de la ventana de
  // throttle. Sin esto el color guardado se quedaba hasta ~90 ms de arrastre
  // por detrás del pulgar: se veía en las capturas —la bola en el violeta del
  // extremo y el color guardado todavía en el azul de antes—. Si `touchend` no
  // llega, no se pierde nada: el commit del último `touchmove` sigue ahí.
  const alSoltar = () => {
    'main thread'
    if (pendiente.current < 0) return
    confirmar(pendiente.current)
  }

  // Al empezar el gesto se vuelve a medir: la barra puede haberse movido desde
  // el montaje (el formulario crece al abrir secciones) y con un borde
  // izquierdo viejo todo el arrastre saldría desplazado. La medición es
  // asíncrona, así que corrige de este toque en adelante.
  const alEmpezar = (e: MainThread.TouchEvent) => {
    'main thread'
    runOnBackground(medir)()
    mover(e.touches[0].clientX)
  }

  return (
    <view
      id={id}
      className="ColorBarra"
      main-thread:bindtouchstart={alEmpezar}
      main-thread:bindtouchmove={alMover}
      main-thread:bindtouchend={alSoltar}
      main-thread:bindtouchcancel={alSoltar}
    >
      <view className="ColorBarraEspectro">
        {franjas.map((c, i) => (
          <view key={i} className="ColorBarraFranja" style={{ backgroundColor: c }} />
        ))}
      </view>
      {/* El color va en un hijo y la posición en el padre a propósito: así el
          `style` del padre solo cambia cuando `pct` cambia —es decir, nunca
          durante el arrastre—, y el render no pisa el `left` que acaba de
          escribir el hilo principal. */}
      <view className="ColorBarraPulgar" main-thread:ref={pulgar} style={{ left: `${pct * 100}%` }}>
        <view className="ColorBarraPulgarColor" style={{ backgroundColor: colorPulgar }} />
      </view>
    </view>
  )
}

/**
 * Selector de color completo: tono, saturación y luminosidad. Complementa a los
 * presets — entre las tres barras se llega a cualquier color, incluidos los
 * pasteles, los apagados, el blanco y el negro, que con una barra de tono sola
 * quedaban fuera de alcance.
 */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  // El HSL vive aquí y no se deriva del hex en cada render: el redondeo del
  // viaje hex → HSL → hex arrastraría el tono al mover saturación o
  // luminosidad, y al bajar cualquiera de las dos a cero se perdería del todo
  // (un gris no tiene tono al que volver).
  const [hsl, setHsl] = useState(() => hexAHsl(value))
  // Posición declarada de los tres pulgares. Se separa de `hsl` porque solo se
  // actualiza con los cambios que vienen de fuera: durante el arrastre manda el
  // hilo principal, y si esto siguiera a `hsl` cada commit devolvería el pulgar
  // a donde estaba hace 90 ms mientras el dedo ya va más allá — el temblor que
  // se veía al mover.
  const [vista, setVista] = useState(hsl)
  // Espejo del estado. El arrastre confirma cada ~90 ms desde el hilo
  // principal, y las funciones que van a ese hilo se serializan con los
  // valores del render en que se crearon: leyendo `hsl` del render, un commit
  // podía calcular el color nuevo sobre un HSL viejo y el selector se volvía
  // loco. Del ref se lee siempre el valor de verdad.
  const hslRef = useRef(hsl)
  // Último hex emitido por nosotros, para no re-adoptar nuestro propio eco.
  const ultimoEmitido = useRef<string | null>(null)

  // Si el color llega de fuera —un preset, o el hábito que se está editando—
  // se adopta. Comparar contra el eco y no contra `hslAHex(hsl)` es lo que
  // corta el bucle: el valor vuelve por el padre en un render distinto al que
  // fijó el estado, así que la comparación con el estado del momento fallaba y
  // el efecto sobrescribía el HSL a mitad de arrastre.
  useEffect(() => {
    if (value.toLowerCase() === ultimoEmitido.current) return
    const adoptado = hexAHsl(value)
    hslRef.current = adoptado
    setHsl(adoptado)
    setVista(adoptado)
  }, [value])

  const aplicar = useCallback(
    (campo: keyof Hsl, pct: number) => {
      // 359.9 y no 360: el tono es un círculo y 360 cae ya fuera de los tramos
      // de `hslAHex`, que devolvería el rojo del otro extremo.
      const siguiente = { ...hslRef.current, [campo]: campo === 'h' ? pct * 359.9 : pct }
      const hex = hslAHex(siguiente)
      hslRef.current = siguiente
      ultimoEmitido.current = hex
      setHsl(siguiente)
      onChange(hex)
    },
    [onChange],
  )

  // Estables entre renders: son lo que se serializa al hilo principal en cada
  // barra, y una función nueva por render volvería a arrastrar el problema de
  // los valores capturados.
  const aplicarTono = useCallback((p: number) => aplicar('h', p), [aplicar])
  const aplicarSaturacion = useCallback((p: number) => aplicar('s', p), [aplicar])
  const aplicarLuminosidad = useCallback((p: number) => aplicar('l', p), [aplicar])

  const tonos = useMemo(
    () =>
      Array.from({ length: FRANJAS }, (_, i) =>
        hslAHex({ h: (i / FRANJAS) * 360, s: 1, l: 0.5 }),
      ),
    [],
  )
  // Las dos barras de abajo se pintan con el color actual, así que enseñan a
  // dónde lleva cada punto antes de tocarlo. Las dependencias van redondeadas a
  // propósito: sin eso cada commit del arrastre rehacía las 72 franjas por un
  // cambio de color inapreciable.
  const tonoBase = Math.round(hsl.h / 4) * 4
  const satBase = Math.round(hsl.s * 20) / 20
  const lumBase = Math.round(hsl.l * 20) / 20
  const saturaciones = useMemo(
    () =>
      Array.from({ length: FRANJAS }, (_, i) =>
        hslAHex({ h: tonoBase, s: i / (FRANJAS - 1), l: lumBase }),
      ),
    [tonoBase, lumBase],
  )
  const luminosidades = useMemo(
    () =>
      Array.from({ length: FRANJAS }, (_, i) =>
        hslAHex({ h: tonoBase, s: satBase, l: i / (FRANJAS - 1) }),
      ),
    [tonoBase, satBase],
  )

  return (
    <view className="ColorPicker">
      <Barra
        id="color-barra-tono"
        franjas={tonos}
        pct={vista.h / 360}
        colorPulgar={value}
        onPct={aplicarTono}
      />
      <Barra
        id="color-barra-saturacion"
        franjas={saturaciones}
        pct={vista.s}
        colorPulgar={value}
        onPct={aplicarSaturacion}
      />
      <Barra
        id="color-barra-luminosidad"
        franjas={luminosidades}
        pct={vista.l}
        colorPulgar={value}
        onPct={aplicarLuminosidad}
      />
    </view>
  )
}
