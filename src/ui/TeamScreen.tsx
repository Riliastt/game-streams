import { useGame } from '../game/GameContext'
import {
  canStartProject,
  listProjectTypes,
  projectInfo,
} from '../game/projects'
import { getRank, rankId } from '../game/ranks'
import { canHire, staffCost, staffLevel, STAFF } from '../game/staff'
import { StatsBar } from './StatsBar'

export function TeamScreen() {
  const { state, setScreen, hire, startProj } = useGame()
  const rank = getRank(state)

  return (
    <div className="screen team-screen landscape">
      <StatsBar />
      <div className="section-head">
        <button type="button" className="btn ghost" onClick={() => setScreen('hub')}>
          ← Студия
        </button>
        <h2>Команда · {rank.name}</h2>
      </div>

      <section className="block">
        <h3>Сотрудники</h3>
        <div className="upgrade-list">
          {STAFF.map((s) => {
            const level = staffLevel(state, s.id)
            const maxed = level >= s.maxLevel
            const locked = rankId(state) < s.minRank
            const cost = maxed ? 0 : staffCost(s, level)
            const ok = canHire(state, s.id)
            return (
              <div key={s.id} className="upgrade-row">
                <div>
                  <strong>
                    {s.name}{' '}
                    <span className="muted">
                      {level}/{s.maxLevel}
                    </span>
                  </strong>
                  <p>
                    {locked ? `Нужен ранг ${s.minRank}+` : s.description}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn primary"
                  disabled={maxed || locked || !ok}
                  onClick={() => hire(s.id)}
                >
                  {maxed ? 'MAX' : `${cost}₽`}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="block">
        <h3>Проекты</h3>
        <p className="muted">До 2 активных. Рилсы и видео монтируются в фазе продакшна.</p>
        <div className="chip-grid">
          {listProjectTypes().map((type) => {
            const info = projectInfo(type)
            const ok = canStartProject(state, type)
            return (
              <button
                key={type}
                type="button"
                className="chip"
                disabled={!ok}
                onClick={() => startProj(type)}
              >
                <strong>{info.label}</strong>
                <span>
                  {info.cost}₽{info.energy ? ` · ${info.energy} эн.` : ''} · ~
                  {Math.round(info.durationMs / 1000)}с
                </span>
              </button>
            )
          })}
        </div>
        {state.projects.map((p) => (
          <p key={p.id} className="muted">
            В работе: {p.label} ({Math.max(0, Math.ceil((p.finishesAt - Date.now()) / 1000))}с)
          </p>
        ))}
      </section>
    </div>
  )
}
