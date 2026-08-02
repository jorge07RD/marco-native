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
  // Ancho de la barra. Vive en estado de React (y no en un MainThreadRef)
  // porque un MainThreadRef solo se puede escribir desde el hilo principal, y
  // esto se mide desde el de background; las funciones 'main thread' capturan
  // valores del render sin problema.
  //
  // Se reintenta porque la primera medición corre antes de que el layout esté
  // resuelto y devuelve un rect degenerado: sin reintento el deslizador salía
  // muerto unas veces sí y otras no, según cómo cayera la carrera.
  const [ancho, setAncho] = useState(0)
  const pulgar = useMainThreadRef<MainThread.Element>(null)
  const ultimoCommit = useMainThreadRef<number>(0)

  useEffect(() => {
    let cancelado = false
    let intentos = 0
    const medir = () => {
      medirRect(`#${id}`).then((r) => {
        if (cancelado) return
        if (r && r.right - r.left > 1) {
          setAncho(r.right - r.left)
          return
        }
        intentos += 1
        if (intentos < 12) setTimeout(medir, 60)
      })
    }
    medir()
    return () => {
      cancelado = true
    }
  }, [id])

  const mover = (x: number) => {
    'main thread'
    if (ancho <= 0) return
    // `touches[0].x` ya viene relativo al elemento tocado (ver el tipo Touch de
    // Lynx), así que no hace falta saber dónde empieza la barra en pantalla.
    let p = x / ancho
    if (p < 0) p = 0
    if (p > 1) p = 1
    // La posición se pinta desde aquí; el color del pulgar llega con el commit,
    // porque el hex depende de las otras dos barras y esa cuenta vive en el
    // hilo de background.
    pulgar.current?.setStyleProperty('left', `${p * 100}%`)

    // El valor se confirma mientras se arrastra, no al soltar: en el SM-S918U
    // `touchend` NO llega a este elemento (igual que `touchstart` no llega a la
    // tarjeta de SwipeRow), así que un commit en el soltar no se ejecutaba
    // nunca y el color no se guardaba jamás.
    //
    // Se limita a un cruce de hilo cada ~90 ms para no re-renderizar el
    // formulario en cada `touchmove`, que es justo el arrastre perceptible que
    // SwipeRow evita.
    const ahora = Date.now()
    if (ahora - ultimoCommit.current < 90) return
    ultimoCommit.current = ahora
    runOnBackground(onPct)(p)
  }

  const alTocar = (e: MainThread.TouchEvent) => {
    'main thread'
    mover(e.touches[0].x)
  }

  return (
    <view
      id={id}
      className="ColorBarra"
      main-thread:bindtouchstart={alTocar}
      main-thread:bindtouchmove={alTocar}
    >
      <view className="ColorBarraEspectro">
        {franjas.map((c, i) => (
          <view key={i} className="ColorBarraFranja" style={{ backgroundColor: c }} />
        ))}
      </view>
      <view
        className="ColorBarraPulgar"
        main-thread:ref={pulgar}
        style={{ left: `${pct * 100}%`, backgroundColor: colorPulgar }}
      />
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
        pct={hsl.h / 360}
        colorPulgar={value}
        onPct={aplicarTono}
      />
      <Barra
        id="color-barra-saturacion"
        franjas={saturaciones}
        pct={hsl.s}
        colorPulgar={value}
        onPct={aplicarSaturacion}
      />
      <Barra
        id="color-barra-luminosidad"
        franjas={luminosidades}
        pct={hsl.l}
        colorPulgar={value}
        onPct={aplicarLuminosidad}
      />
    </view>
  )
}
