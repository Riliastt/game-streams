import { gearLevel, visualTier } from '../../game/gear'
import { useGame } from '../../game/GameContext'

type Props = { activity: number }

export function MicMeter({ activity }: Props) {
  const { state } = useGame()
  const mic = gearLevel(state, 'mic')
  const tier = visualTier(mic)
  const bars = 8
  const level = Math.min(1, activity)

  return (
    <div className={`mic-meter mic-${tier}`}>
      <span className="mic-title">{tier === 0 ? 'Встроенный мик' : tier === 1 ? 'USB-мик' : 'Студийный мик'}</span>
      <div className="mic-bars" aria-hidden>
        {Array.from({ length: bars }, (_, i) => {
          const on = level > i / bars
          return <i key={i} className={on ? 'on' : ''} />
        })}
      </div>
      {tier === 0 && <span className="mic-warn">CLIP</span>}
    </div>
  )
}
