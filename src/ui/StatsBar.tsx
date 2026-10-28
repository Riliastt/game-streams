import { useGame } from '../game/GameContext'
import { getRank, nextRank, rankProgress } from '../game/ranks'

export function StatsBar() {
  const { state } = useGame()
  const rank = getRank(state)
  const next = nextRank(state)
  return (
    <header className="stats-bar">
      <div className="stat stat-rank" title={next ? `До «${next.name}»: ${next.minSubs - state.subscribers}` : rank.name}>
        <span className="stat-label">Ранг</span>
        <strong>{rank.name}</strong>
        <i className="stat-rank-bar">
          <b style={{ width: `${rankProgress(state) * 100}%` }} />
        </i>
      </div>
      <div className="stat">
        <span className="stat-label">₽</span>
        <strong>{state.money.toLocaleString('ru-RU')}</strong>
      </div>
      <div className="stat">
        <span className="stat-label">Подп.</span>
        <strong>{state.subscribers.toLocaleString('ru-RU')}</strong>
      </div>
      <div className="stat">
        <span className="stat-label">Серия</span>
        <strong>{state.streamStreak > 0 ? `🔥 ${state.streamStreak}` : '—'}</strong>
      </div>
      <div className="stat">
        <span className="stat-label">Энерг.</span>
        <strong>
          {state.energy}/{state.maxEnergy}
        </strong>
      </div>
      <div className="stat">
        <span className="stat-label">День</span>
        <strong>{state.day}</strong>
      </div>
    </header>
  )
}
