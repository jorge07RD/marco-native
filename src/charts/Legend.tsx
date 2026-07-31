import './Legend.css'

export interface LegendItem {
  id: number
  nombre: string
  color: string
  valueLabel: string
}

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
