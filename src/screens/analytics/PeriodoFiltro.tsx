import { chevronIcon } from '../../components/icons'
import { anioActual, mesActual, rangoDe, type Periodo } from '../../lib/periodo'
import './PeriodoFiltro.css'

const RANGOS_DIAS = [7, 14, 30]

/** Un periodo que aún no ha empezado no tiene nada que enseñar, así que la
 *  flecha de avanzar se apaga al llegar al mes o al año en curso. */
function esUltimo(periodo: Periodo): boolean {
  const hoy = periodo.tipo === 'anio' ? anioActual() : mesActual()
  if (periodo.tipo === 'mes' && hoy.tipo === 'mes') {
    return periodo.year === hoy.year && periodo.month === hoy.month
  }
  if (periodo.tipo === 'anio' && hoy.tipo === 'anio') return periodo.year === hoy.year
  return true
}

function desplazar(periodo: Periodo, delta: number): Periodo {
  if (periodo.tipo === 'mes') {
    // El mes se mueve en base 0 para que el desbordamiento en los dos sentidos
    // (diciembre → enero y enero → diciembre) salga de la misma cuenta.
    const indice = periodo.year * 12 + (periodo.month - 1) + delta
    return { tipo: 'mes', year: Math.floor(indice / 12), month: (indice % 12) + 1 }
  }
  if (periodo.tipo === 'anio') return { tipo: 'anio', year: periodo.year + delta }
  return periodo
}

// Literales: el SVG de `content` no resuelve var().
const CHEVRON_ON = '#a29dac' // --color-text-secondary
const CHEVRON_OFF = '#3a3546' // --color-border-input

const SEGMENTOS: { clave: string; etiqueta: string; elegir: () => Periodo }[] = [
  ...RANGOS_DIAS.map((d) => ({
    clave: `d${d}`,
    etiqueta: `${d} d`,
    elegir: (): Periodo => ({ tipo: 'dias', dias: d }),
  })),
  // Al cambiar de tipo se entra por el periodo en curso, que es el que el
  // usuario tiene en la cabeza al pulsar «Mes» o «Año».
  { clave: 'mes', etiqueta: 'Mes', elegir: mesActual },
  { clave: 'anio', etiqueta: 'Año', elegir: anioActual },
]

function claveDe(periodo: Periodo): string {
  if (periodo.tipo === 'dias') return `d${periodo.dias}`
  return periodo.tipo
}

/** Filtro de la pantalla de Análisis: qué tramo se mira. Botón segmentado de
 *  Material 3 (los cinco caben enteros en el ancho, sin scroll) y, para mes y
 *  año, el navegador anterior/siguiente. El rango en fechas lo resuelve
 *  `rangoDe`; aquí solo se elige. */
export function PeriodoFiltro({ periodo, onPeriodo }: { periodo: Periodo; onPeriodo: (p: Periodo) => void }) {
  const navegable = periodo.tipo === 'mes' || periodo.tipo === 'anio'
  const activa = claveDe(periodo)
  const ultimo = esUltimo(periodo)
  const etiqueta = rangoDe(periodo).etiqueta

  return (
    <view className="PeriodoFiltro">
      <view className="Segmentado">
        {SEGMENTOS.map((seg, i) => {
          const on = seg.clave === activa
          return (
            <view
              key={seg.clave}
              className={`Segmento ${i > 0 ? 'Segmento--divided' : ''} ${on ? 'Segmento--on' : ''}`}
              bindtap={() => onPeriodo(seg.elegir())}
            >
              <text className={`SegmentoText ${on ? 'SegmentoText--on' : ''}`}>{seg.etiqueta}</text>
            </view>
          )
        })}
      </view>

      {navegable ? (
        <view className="PeriodoNav">
          <text className="PeriodoNavLabel">{etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)}</text>
          <view className="IconButton" bindtap={() => onPeriodo(desplazar(periodo, -1))}>
            <svg className="IconButtonIcon" content={chevronIcon('izq', CHEVRON_ON)} />
          </view>
          {/* Un periodo que aún no ha empezado no tiene nada que enseñar. */}
          <view
            className="IconButton"
            bindtap={() => {
              if (!ultimo) onPeriodo(desplazar(periodo, 1))
            }}
          >
            <svg className="IconButtonIcon" content={chevronIcon('der', ultimo ? CHEVRON_OFF : CHEVRON_ON)} />
          </view>
        </view>
      ) : null}
    </view>
  )
}
