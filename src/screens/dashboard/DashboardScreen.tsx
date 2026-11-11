import {
  runOnBackground,
  runOnMainThread,
  useCallback,
  useEffect,
  useMainThreadRef,
  useMemo,
  useState,
} from '@lynx-js/react'
import type { MainThread } from '@lynx-js/types'
import { useParams } from 'react-router'

import { getHabitos, getRegistroPorFecha, setProgresoValor, toggleProgreso } from '../../api/marco'
import type { Habito, ProgresoHabito, RegistroConProgresos } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { BrandHeader, PrevNextButtons } from '../../components/BrandHeader'
import { arcoParcial, checkIcon } from '../../components/icons'
import { LogroOverlay } from '../../components/LogroOverlay'
import { ProgresoParcialModal } from '../../components/ProgresoParcialModal'
import { useModalHost } from '../../components/useModalHost'
import { addDays, formatDisplay, todayISO } from '../../lib/date'
import { textoSobre } from '../../lib/colors'
import { formatNumero, formatPct, unidadPara } from '../../lib/formato'
import { fraccionProgreso, nivelProgreso } from '../../lib/progreso'
import './DashboardScreen.css'

/** Lo que dura la vuelta al borde. Va por debajo de los ~500 ms que tarda
 *  Android en dar la pulsación por larga porque el `touchstart` no llega en
 *  cuanto tocas: la fila vive dentro del scroll-view de AppLayout y el evento
 *  se entrega cuando el gesto ya no puede ser un scroll, mientras el reloj del
 *  long-press corre desde el primer contacto. Con los 500 ms exactos la vuelta
 *  se quedaba a medias al abrir el modal en un SM-S918U. */
const CARGA_MS = 380
/** Cada lado se lleva un cuarto de la vuelta. */
const TRAMO_MS = CARGA_MS / 4
/** Cierre de la vuelta al dispararse el long-press: por corto que quede, el
 *  borde termina de dibujarse antes de que aparezca el modal. */
const CIERRE_MS = 60
/** Cuánto puede moverse el dedo sin que cuente como scroll. Un dedo quieto no
 *  existe: apoyado sobre la fila manda `touchmove` constantemente, y sin esta
 *  holgura la línea se descargaba nada más empezar. */
const HOLGURA_PX = 12
/** Lo que se deja ver el borde cerrado antes de recogerlo, ya con el modal
 *  encima. */
const REMANSO_MS = 320
/** Recogida al soltar o al cancelar: la línea desaparece de golpe pero sin corte. */
const RECOGIDA_MS = 120

export function DashboardScreen() {
  const { user } = useAuth()
  const modalHost = useModalHost()
  const params = useParams<{ fecha?: string }>()
  // Última pulsación larga, compartida entre los dos handlers del hilo
  // principal. Los tipos de Lynx dicen que `tap` y `longpress` son excluyentes,
  // pero eso NO se cumple cuando no viven en el mismo hilo: con el longpress en
  // background y el tap en main thread, al soltar el dedo llegaban los dos y el
  // hábito quedaba completado además de abrirse el modal (verificado en un
  // SM-S918U). Por eso el longpress también es main-thread: así puede dejar la
  // marca que el tap consulta antes de hacer nada.
  const ultimoLongPress = useMainThreadRef<{ id: number; t: number }>({ id: -1, t: 0 })
  // Fila cuyo borde se está cargando ahora mismo. Hace falta el id y no un
  // booleano porque el ref es uno por pantalla, no uno por fila.
  const filaCargando = useMainThreadRef<number>(-1)
  // La fila que tiene la línea encendida y dónde se apoyó el dedo. Hacen falta
  // porque quien la apaga no siempre es el mismo evento que la encendió: si el
  // long-press llega a abrir el modal, a la fila ya no le llega ningún
  // `touchend` —el overlay se ha comido el resto del gesto— y sin esto la
  // línea se quedaba pintada para siempre (visto en un SM-S918U).
  const filaTocada = useMainThreadRef<MainThread.Element | null>(null)
  const inicioToque = useMainThreadRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [fecha, setFecha] = useState(() => params.fecha ?? todayISO())

  // Arranque y recogida de la línea del borde. Los tramos se buscan por clase
  // dentro de la fila tocada porque las filas se pintan en un map y no hay
  // forma de tener un `main-thread:ref` por tramo sin sacar la fila a su propio
  // componente (patrón de SwipeRow), y esa fila arrastra la lógica de
  // tap/longpress ya afinada en dispositivo.
  //
  // Los cuatro lados van escritos uno a uno y no recorriendo una tabla de
  // módulo: una primera versión llevaba la lista de tramos en un `const` de
  // módulo y desde el hilo principal no se veía, así que el recorrido reventaba
  // en la primera línea y no se pintaba nada (verificado en un SM-S918U, con
  // las llamadas sueltas funcionando en la misma pulsación). Números sí cruzan
  // —CARGA_MS ya lo hacía—, estructuras no.
  //
  // Cada tramo entra detrás del anterior con `transition-delay`, así que la
  // vuelta completa dura CARGA_MS. Las propiedades de la transición se escriben
  // sueltas y no con el atajo `transition` para no depender de que el parser de
  // Lynx acepte el retardo en la forma corta.
  const cargarBorde = (fila: MainThread.Element) => {
    'main thread'
    const entrar = (clase: string, lleno: string, retardo: number) => {
      fila.querySelector(`.${clase}`)?.setStyleProperties({
        'transition-property': 'transform',
        'transition-duration': `${TRAMO_MS}ms`,
        'transition-timing-function': 'linear',
        'transition-delay': `${retardo}ms`,
        transform: lleno,
      })
    }
    entrar('HabitCarga--top', 'scaleX(1)', 0)
    entrar('HabitCarga--right', 'scaleY(1)', TRAMO_MS)
    entrar('HabitCarga--bottom', 'scaleX(1)', TRAMO_MS * 2)
    entrar('HabitCarga--left', 'scaleY(1)', TRAMO_MS * 3)
  }

  // Remate de la vuelta. El margen de CARGA_MS es una apuesta sobre cuánto se
  // retrasa el touchstart, así que el cierre no se deja a la suerte: cuando
  // salta el long-press se lleva lo que falte a su sitio en CIERRE_MS. Si la
  // vuelta ya había terminado esto no se nota, y si iba retrasada el borde
  // aparece cerrado igualmente cuando el modal entra.
  const cerrarBorde = (fila: MainThread.Element) => {
    'main thread'
    const rematar = (clase: string, lleno: string) => {
      fila.querySelector(`.${clase}`)?.setStyleProperties({
        'transition-property': 'transform',
        'transition-duration': `${CIERRE_MS}ms`,
        'transition-timing-function': 'ease-out',
        'transition-delay': '0ms',
        transform: lleno,
      })
    }
    rematar('HabitCarga--top', 'scaleX(1)')
    rematar('HabitCarga--right', 'scaleY(1)')
    rematar('HabitCarga--bottom', 'scaleX(1)')
    rematar('HabitCarga--left', 'scaleY(1)')
  }

  const recogerBorde = (fila: MainThread.Element) => {
    'main thread'
    const salir = (clase: string, vacio: string) => {
      fila.querySelector(`.${clase}`)?.setStyleProperties({
        'transition-property': 'transform',
        'transition-duration': `${RECOGIDA_MS}ms`,
        'transition-timing-function': 'ease-out',
        // Sin esto heredaría el retardo con el que entró y los últimos tramos
        // se quedarían pintados casi medio segundo después de soltar.
        'transition-delay': '0ms',
        transform: vacio,
      })
    }
    salir('HabitCarga--top', 'scaleX(0)')
    salir('HabitCarga--right', 'scaleY(0)')
    salir('HabitCarga--bottom', 'scaleX(0)')
    salir('HabitCarga--left', 'scaleY(0)')
  }

  // Apagado a distancia, para el camino en el que el modal ya está montado y a
  // la fila no le va a llegar el `touchend` que normalmente la recoge.
  const apagarFilaTocada = () => {
    'main thread'
    const fila = filaTocada.current
    if (!fila) return
    filaTocada.current = null
    filaCargando.current = -1
    recogerBorde(fila)
  }

  // Si llegamos aquí navegando desde el Calendario con una fecha distinta a
  // la que ya estaba en pantalla, adoptarla (pero sin pelear con los botones
  // de día anterior/siguiente de este mismo componente).
  useEffect(() => {
    if (params.fecha) setFecha(params.fecha)
  }, [params.fecha])

  const [habitos, setHabitos] = useState<Habito[]>([])
  const [registro, setRegistro] = useState<RegistroConProgresos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Progresos con un toggle en vuelo — evita que un doble-tap rápido dispare
  // dos toggles que se cancelen entre sí en el backend (causaba el parpadeo:
  // el borde optimista del segundo tap se calculaba sobre el mismo estado
  // "completado" que el primero, así que ambos apuntaban al mismo resultado
  // y terminaban deshaciéndose uno al otro).
  const [pendingIds, setPendingIds] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    getHabitos(user?.mostrar_ocultos)
      .then((data) => {
        if (!cancelled) setHabitos(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user?.mostrar_ocultos])

  const loadRegistro = useCallback(
    (targetFecha: string) => {
      setLoading(true)
      setError(null)
      getRegistroPorFecha(targetFecha, user?.mostrar_ocultos)
        .then((data) => setRegistro(data))
        .catch(() => setError('No se pudo cargar el progreso de este día.'))
        .finally(() => setLoading(false))
    },
    [user?.mostrar_ocultos],
  )

  useEffect(() => {
    loadRegistro(fecha)
  }, [fecha, loadRegistro])

  const habitosById = useMemo(() => {
    const map = new Map<number, Habito>()
    habitos.forEach((h) => map.set(h.id, h))
    return map
  }, [habitos])

  // % del día para un juego de progresos dado, misma fórmula que `progresoPct`
  // más abajo. Se usa para comparar "antes" y "después" de un cambio sin
  // esperar la vuelta de red — hace falta el resultado ANTES de que
  // `loadRegistro` termine porque `modalHost.open()` sólo puede llamarse desde
  // dentro de un handler síncrono: hecho desde un `useEffect` o un `.then()`,
  // Lynx no encuentra el snapshot del componente en el hilo principal
  // ("Snapshot not found") y el overlay nunca llega a pintarse.
  const pctDe = useCallback(
    (progresos: ProgresoHabito[]) => {
      if (progresos.length === 0) return 0
      const suma = progresos.reduce(
        (acc, p) => acc + fraccionProgreso(p.valor, habitosById.get(p.habito_id)?.meta_diaria ?? 0, p.completado),
        0,
      )
      return (suma / progresos.length) * 100
    },
    [habitosById],
  )

  // Si este cambio deja el día en 100% sin que ya lo estuviera, muestra el
  // logro. Debe llamarse de forma síncrona desde el handler del gesto (ver
  // comentario de `pctDe`).
  const celebrarSiCompleta = useCallback(
    (progresosDespues: ProgresoHabito[]) => {
      if (!registro) return
      const eraCompleto = pctDe(registro.progresos) >= 100
      const ahoraCompleto = pctDe(progresosDespues) >= 100
      if (!eraCompleto && ahoraCompleto) {
        modalHost.open(<LogroOverlay onDone={modalHost.close} />)
      }
    },
    [registro, pctDe, modalHost],
  )

  const handleToggle = useCallback(
    (progresoId: number) => {
      if (registro) {
        const actual = registro.progresos.find((p) => p.id === progresoId)
        if (actual) {
          const nuevoCompletado = !actual.completado
          const nuevoValor = nuevoCompletado ? (habitosById.get(actual.habito_id)?.meta_diaria ?? 1) : 0
          celebrarSiCompleta(
            registro.progresos.map((p) =>
              p.id === progresoId ? { ...p, completado: nuevoCompletado, valor: nuevoValor } : p,
            ),
          )
        }
      }
      setPendingIds((prev) => (prev.includes(progresoId) ? prev : [...prev, progresoId]))
      toggleProgreso(progresoId)
        .then(() => loadRegistro(fecha))
        .catch(() => setError('No se pudo actualizar el hábito.'))
        .finally(() => setPendingIds((prev) => prev.filter((id) => id !== progresoId)))
    },
    [fecha, loadRegistro, registro, habitosById, celebrarSiCompleta],
  )

  const abrirParcial = useCallback(
    (progreso: ProgresoHabito) => {
      const habito = habitosById.get(progreso.habito_id)
      if (!habito) return
      modalHost.open(
        <ProgresoParcialModal
          nombre={habito.nombre}
          meta={habito.meta_diaria}
          unidad={habito.unidad_medida}
          color={habito.color}
          valorInicial={progreso.valor}
          onCancel={modalHost.close}
          onSave={(valor) => {
            modalHost.close()
            if (registro) {
              const completado = habito.meta_diaria > 0 && valor >= habito.meta_diaria
              celebrarSiCompleta(
                registro.progresos.map((p) => (p.id === progreso.id ? { ...p, completado, valor } : p)),
              )
            }
            setProgresoValor(progreso.id, valor)
              .then(() => loadRegistro(fecha))
              .catch(() => setError('No se pudo guardar el avance.'))
          }}
        />,
      )
      // El overlay ya tapa la fila: se deja ver la vuelta cerrada un momento y
      // se apaga desde aquí, porque el `touchend` que normalmente la recoge no
      // va a llegar nunca.
      setTimeout(() => runOnMainThread(apagarFilaTocada)(), REMANSO_MS)
    },
    [habitosById, modalHost, fecha, loadRegistro, apagarFilaTocada, registro, celebrarSiCompleta],
  )

  const totalHabitos = registro?.progresos.length ?? 0
  // Suma de fracciones, no de completados: un hábito a 28 de 30 aporta 0.93 al
  // día en vez de 0. Misma función que usan el calendario y Análisis.
  const completados =
    registro?.progresos.reduce(
      (acc, p) => acc + fraccionProgreso(p.valor, habitosById.get(p.habito_id)?.meta_diaria ?? 0, p.completado),
      0,
    ) ?? 0
  const progresoPct = totalHabitos > 0 ? (completados / totalHabitos) * 100 : 0
  // Hábitos cumplidos del todo, para el "2 de 4" del resumen. El porcentaje sí
  // suma los parciales, así que con uno a medias puede pasar del 50 % con 2 de 4.
  const cumplidos = registro?.progresos.filter((p) => p.completado).length ?? 0
  const nivel = nivelProgreso(progresoPct)

  return (
    <view className="DashboardScreen ScreenEnter">
      {/* La fecha es el titular: es lo que se navega. El saludo pasa al
          resumen de abajo. */}
      <BrandHeader title={formatDisplay(fecha)}>
        <PrevNextButtons onPrev={() => setFecha((f) => addDays(f, -1))} onNext={() => setFecha((f) => addDays(f, 1))} />
      </BrandHeader>

      {loading ? <text className="DashboardStatus">Cargando…</text> : null}
      {error ? <text className="DashboardStatus DashboardStatus--error">{error}</text> : null}
      {!loading && registro && registro.progresos.length === 0 ? (
        <text className="DashboardStatus">No hay hábitos programados para este día.</text>
      ) : null}

      {totalHabitos > 0 ? (
        <view className="DaySummary">
          <view className="DaySummaryLine">
            <text className="DaySummaryText">
              {user?.nombre ? `${user.nombre}, llevas ` : 'Llevas '}
              <text className="DaySummaryCount">
                {cumplidos} de {totalHabitos}
              </text>
            </text>
            <text className={`DaySummaryPct DaySummaryPct--n${nivel}`}>{formatPct(progresoPct)}</text>
          </view>
          {/* scaleX y no width: el ancho anima en layout y el scale en el
              compositor. */}
          <view className="ProgressTrack">
            <view
              className={`ProgressFill ProgressFill--n${nivel}`}
              style={{ transform: `scaleX(${Math.min(progresoPct, 100) / 100})` }}
            />
          </view>
        </view>
      ) : null}

      <view className={`HabitList ${totalHabitos > 0 ? 'HabitList--filled' : ''}`}>
        {registro?.progresos.map((progreso, index) => {
          const habito = habitosById.get(progreso.habito_id)
          const isPending = pendingIds.includes(progreso.id)
          // Empezado pero sin llegar a la meta. `completado` lo deriva
          // `setProgresoValor` del valor, así que los dos no pueden discrepar.
          const esParcial = !progreso.completado && progreso.valor > 0
          const color = habito?.color ?? '#e94560'
          const tinta = textoSobre(color)
          const meta = habito?.meta_diaria ?? 0
          return (
            <view
              key={progreso.id}
              className={`HabitRow StaggerIn ${index > 0 ? 'HabitRow--divided' : ''}`}
              style={{ animationDelay: `${Math.min(index, 10) * 0.045}s` }}
              // Aviso de que la pulsación larga va en camino: una línea del
              // color del hábito recorre el borde durante los mismos ms que
              // tarda en dispararse, así que cierra la vuelta justo cuando abre
              // el modal. La línea son cuatro vistas encima del borde y no el
              // borde en sí: el comentario de .HabitRow avisa de que tocar su
              // grosor haría saltar el tamaño de la fila.
              main-thread:bindtouchstart={(event: MainThread.TouchEvent) => {
                'main thread'
                filaCargando.current = progreso.id
                filaTocada.current = event.currentTarget
                inicioToque.current = {
                  x: event.touches[0].clientX,
                  y: event.touches[0].clientY,
                }
                cargarBorde(event.currentTarget)
              }}
              // Si el dedo se va de verdad es un scroll, no una pulsación: se
              // descarga. Solo cuenta a partir de HOLGURA_PX — el dedo apoyado
              // manda `touchmove` sin parar y cualquier temblor apagaba la
              // línea recién encendida.
              main-thread:bindtouchmove={(event: MainThread.TouchEvent) => {
                'main thread'
                if (filaCargando.current !== progreso.id) return
                const dx = event.touches[0].clientX - inicioToque.current.x
                const dy = event.touches[0].clientY - inicioToque.current.y
                if (dx * dx + dy * dy < HOLGURA_PX * HOLGURA_PX) return
                filaCargando.current = -1
                filaTocada.current = null
                recogerBorde(event.currentTarget)
              }}
              main-thread:bindtouchend={(event: MainThread.TouchEvent) => {
                'main thread'
                if (filaCargando.current !== progreso.id) return
                filaCargando.current = -1
                filaTocada.current = null
                recogerBorde(event.currentTarget)
              }}
              main-thread:bindtouchcancel={(event: MainThread.TouchEvent) => {
                'main thread'
                filaCargando.current = -1
                filaTocada.current = null
                recogerBorde(event.currentTarget)
              }}
              // Dejar presionado registra un avance parcial.
              main-thread:bindlongpress={(event: MainThread.TouchEvent) => {
                'main thread'
                ultimoLongPress.current = { id: progreso.id, t: Date.now() }
                cerrarBorde(event.currentTarget)
                runOnBackground(() => abrirParcial(progreso))()
              }}
              main-thread:bindtap={(event: MainThread.TouchEvent) => {
                'main thread'
                // Si ya hay un toggle en vuelo para este hábito, ignorar el
                // tap — evita el doble-toggle que se cancela a sí mismo.
                if (isPending) return
                // Al soltar una pulsación larga llega también un tap sobre esta
                // misma fila; sería un toggle que el usuario no pidió. Se
                // descarta por (id, tiempo) y no con una bandera global para no
                // tragarse el tap legítimo de OTRA fila justo después.
                const marca = ultimoLongPress.current
                if (marca.id === progreso.id && Date.now() - marca.t < 900) return
                // Feedback instantáneo en el hilo principal — no esperamos el
                // viaje de red/hilo de background para que el anillo reaccione.
                // Se pinta el relleno, el borde y la palomita a la vez; si solo
                // cambiara el relleno, la palomita aparecería después.
                const nowDone = !progreso.completado
                event.currentTarget.querySelector('.HabitRing')?.setStyleProperties({
                  'background-color': nowDone ? color : 'transparent',
                  'border-color': nowDone ? color : '#2b2733',
                })
                event.currentTarget.querySelector('.HabitRingCheck')?.setStyleProperty('opacity', nowDone ? '1' : '0')
                runOnBackground(() => handleToggle(progreso.id))()
              }}
            >
              {/* Los cuatro tramos de la línea de carga, en el mismo orden en
                  que los recorre `cargarBorde`. */}
              <view className="HabitCarga HabitCarga--top" style={{ backgroundColor: color }} />
              <view className="HabitCarga HabitCarga--right" style={{ backgroundColor: color }} />
              <view className="HabitCarga HabitCarga--bottom" style={{ backgroundColor: color }} />
              <view className="HabitCarga HabitCarga--left" style={{ backgroundColor: color }} />
              <view className="HabitInfo">
                <text className="HabitName">{habito?.nombre ?? `Hábito #${progreso.habito_id}`}</text>
                <text className={`HabitMeta ${progreso.completado ? 'HabitMeta--done' : ''}`}>
                  {formatNumero(progreso.valor)} / {habito ? formatNumero(meta) : '—'}{' '}
                  {unidadPara(meta, habito?.unidad_medida ?? '')}
                </text>
              </view>
              {/* El anillo del ícono hecho control: vacío es pendiente, arco es
                  parcial y lleno con el color del hábito es hecho. El relleno
                  y el borde los reescribe el tap desde el hilo principal, por
                  eso van inline y no por clase. */}
              <view className="HabitRingHit">
                <view
                  className={`HabitRing ${progreso.completado ? 'PopCheck' : ''}`}
                  style={{
                    backgroundColor: progreso.completado ? color : 'transparent',
                    borderColor: progreso.completado ? color : '#2b2733',
                  }}
                >
                  {esParcial ? (
                    <svg className="HabitRingArc" content={arcoParcial(color, progreso.valor / (meta || 1))} />
                  ) : null}
                  <svg
                    className="HabitRingCheck"
                    content={checkIcon(tinta)}
                    style={{ opacity: progreso.completado ? 1 : 0 }}
                  />
                </view>
              </view>
            </view>
          )
        })}
      </view>

      {totalHabitos > 0 ? (
        <text className="DashboardHelper">Mantén pulsado un hábito para registrar una parte.</text>
      ) : null}
    </view>
  )
}
