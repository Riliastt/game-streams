import { followerGoal } from '../../game/gear'
import { goalName } from '../../game/goal'
import { useGame } from '../../game/GameContext'

export function StreamOverlays() {
  const { state } = useGame()
  const s = state.stream
  const donation = s.goalTarget > 0
  const goal = followerGoal(state)
  const pct = donation
    ? Math.min(100, (s.donations / s.goalTarget) * 100)
    : Math.min(100, (goal.current / goal.target) * 100)

  return (
    <div className="stream-overlays clean">
      <div className="overlay-top">
        <span className="live-pill live-pulse">LIVE</span>
        <strong className="channel-live">{state.channelName}</strong>
        {s.title && <span className="stream-live-title">{s.title}</span>}
      </div>
      <div
        className={`goal-bar ${donation ? 'donation-goal' : ''} ${s.goalHit ? 'hit' : ''}`}
        title={donation ? 'Цель доната на этот эфир' : 'Цель по подписчикам'}
      >
        <div className="goal-fill" style={{ width: `${pct}%` }} />
        <span>
          {donation
            ? `🎯 ${goalName(state)} ${Math.min(Math.floor(s.donations), s.goalTarget)}/${s.goalTarget}₽`
            : `Goal ${goal.current}/${goal.target}`}
        </span>
      </div>
    </div>
  )
}
