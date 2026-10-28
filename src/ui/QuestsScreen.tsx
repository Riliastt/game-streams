import { ACHIEVEMENTS } from '../game/quests'
import { useGame } from '../game/GameContext'
import { StatsBar } from './StatsBar'

export function QuestsScreen() {
  const { state, setScreen, claimDaily } = useGame()

  return (
    <div className="screen quests-screen landscape">
      <StatsBar />
      <div className="section-head">
        <button type="button" className="btn ghost" onClick={() => setScreen('hub')}>
          ← Студия
        </button>
        <h2>Цели</h2>
      </div>

      <section className="block">
        <h3>Ежедневные</h3>
        <div className="upgrade-list">
          {state.dailyQuests.map((q) => {
            const done = q.progress >= q.target
            return (
              <div key={q.id} className="upgrade-row">
                <div>
                  <strong>{q.title}</strong>
                  <p>
                    {q.progress}/{q.target} · награда {q.rewardMoney}₽
                    {q.rewardEnergy ? ` +${q.rewardEnergy} эн.` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn accent"
                  disabled={!done || q.claimed}
                  onClick={() => claimDaily(q.id)}
                >
                  {q.claimed ? 'OK' : done ? 'Забрать' : '…'}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="block grow">
        <h3>Достижения</h3>
        <div className="upgrade-list">
          {ACHIEVEMENTS.map((a) => {
            const got = state.achievements.includes(a.id)
            return (
              <div key={a.id} className={`upgrade-row ${got ? 'ach-got' : ''}`}>
                <div>
                  <strong>
                    {got ? '★ ' : ''}
                    {a.title}
                  </strong>
                  <p>{a.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
