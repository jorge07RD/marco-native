import './Legend.css'

export interface LegendItem {
  id: number
  nombre: string
  color: string
  valueLabel: string
}

/** Leyenda en dos columnas: con once hábitos, una lista de una columna
 *  repetía bajo cada gráfica lo mismo que el ranking de «Por hábito». */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <view className="Legend">
      {items.map((item) => (
        <view key={item.id} className="LegendRow">
          <view className="LegendDot" style={{ backgroundColor: item.color }} />
          <text className="LegendName">{item.nombre}</text>
          <text className="LegendValue">{item.valueLabel}</text>
        </view>
      ))}
    </view>
  )
}

/** Una gráfica circular con su cifra en el centro, en vistas encima del <svg>
 *  (el texto de SVG en Lynx no centra solo). */
export function ChartCentro({
  markup,
  width,
  height,
  valor,
  label,
  alto,
}: {
  markup: string
  width: number
  height: number
  valor: string
  label: string
  /** Alto de la capa de la cifra, si no es todo el <svg> (el medidor la baja). */
  alto?: number
}) {
  return (
    <view className="ChartCentro" style={{ width: `${width}px`, height: `${height}px` }}>
      <svg content={markup} style={{ width: `${width}px`, height: `${height}px` }} />
      <view className="ChartCentroCapa" style={alto ? { top: `${height - alto}px` } : undefined}>
        <text className="ChartCentroValor">{valor}</text>
        <text className="ChartCentroLabel">{label}</text>
      </view>
    </view>
  )
}
