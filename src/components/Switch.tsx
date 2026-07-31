import './Switch.css'

export function Switch({ on }: { on: boolean }) {
  return (
    <view className={`SwitchTrack ${on ? 'SwitchTrack--on' : ''}`}>
      <view className={`SwitchKnob ${on ? 'SwitchKnob--on' : ''}`} />
    </view>
  )
}
