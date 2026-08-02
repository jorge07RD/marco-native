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
    const indice = (periodo.year * 12 + (periodo.month - 1)) + delta
    return { tipo: 'mes', year: Math.floor(indice / 12), month: (indice % 12) + 1 }
  }
  if (periodo.tipo === 'anio') return { tipo: 'anio', year: periodo.year + delta }
  return periodo
}

/** Filtro de la pantalla de Análisis: qué tramo se mira y si se compara con el
 *  anterior. El rango en fechas lo resuelve `rangoDe`; aquí solo se elige. */
export function PeriodoFiltro({
  periodo,
  onPeriodo,
  comparar,
  onComparar,
}: {
  periodo: Periodo
  onPeriodo: (p: Periodo) => void
  comparar: boolean
  onComparar: (v: boolean) => void
}) {
  const navegable = periodo.tipo === 'mes' || periodo.tipo === 'anio'

  return (
    <view className="PeriodoFiltro">
      <scroll-view className="PeriodoChips" scroll-orientation="horizontal">
        {RANGOS_DIAS.map((d) => {
          const activo = periodo.tipo === 'dias' && periodo.dias === d
          return (
            <view
              key={d}
              className={`PeriodoChip ${activo ? 'PeriodoChip--active' : ''}`}
              bindtap={() => onPeriodo({ tipo: 'dias', dias: d })}
            >
              <text className={`PeriodoChipText ${activo ? 'PeriodoChipText--active' : ''}`}>
                {d} días
              </text>
            </view>
          )
        })}
        <view
          className={`PeriodoChip ${periodo.tipo === 'mes' ? 'PeriodoChip--active' : ''}`}
          // Al cambiar de tipo se entra por el periodo en curso, que es el que
          // el usuario tiene en la cabeza al pulsar «Mes» o «Año».
          bindtap={() => onPeriodo(mesActual())}
        >
          <text className={`PeriodoChipText ${periodo.tipo === 'mes' ? 'PeriodoChipText--active' : ''}`}>
            Mes
          </text>
        </view>
        <view
          className={`PeriodoChip ${periodo.tipo === 'anio' ? 'PeriodoChip--active' : ''}`}
          bindtap={() => onPeriodo(anioActual())}
        >
          <text className={`PeriodoChipText ${periodo.tipo === 'anio' ? 'PeriodoChipText--active' : ''}`}>
            Año
          </text>
        </view>
      </scroll-view>

      {navegable ? (
        <view className="PeriodoNav">
          <view className="PeriodoNavButton" bindtap={() => onPeriodo(desplazar(periodo, -1))}>
            <text className="PeriodoNavArrow">‹</text>
          </view>
          <text className="PeriodoNavLabel">{rangoDe(periodo).etiqueta}</text>
          <view
            className={`PeriodoNavButton ${esUltimo(periodo) ? 'PeriodoNavButton--off' : ''}`}
            bindtap={() => {
              if (esUltimo(periodo)) return
              onPeriodo(desplazar(periodo, 1))
            }}
          >
            <text className={`PeriodoNavArrow ${esUltimo(periodo) ? 'PeriodoNavArrow--off' : ''}`}>
              ›
            </text>
          </view>
        </view>
      ) : null}

      <view
        className={`PeriodoChip PeriodoChip--comparar ${comparar ? 'PeriodoChip--active' : ''}`}
        bindtap={() => onComparar(!comparar)}
      >
        <text className={`PeriodoChipText ${comparar ? 'PeriodoChipText--active' : ''}`}>
          Comparar con el periodo anterior
        </text>
      </view>
    </view>
  )
}
