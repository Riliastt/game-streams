import { canBuyGame, getGame, listGames } from '../game/games'
import { useGame } from '../game/GameContext'
import { StatsBar } from './StatsBar'
import { TREND_HINT, TREND_LABEL, trendInfo, trendsActive } from '../game/trends'

function StatBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.round(value * 50))
  return (
    <div className="game-stat">
      <span>{label}</span>
      <div className="game-stat-track">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function GamesScreen() {
  const { state, setScreen, selectCatalogGame, purchaseGame } = useGame()
  const games = listGames(state)
  const current = getGame(state.selectedGameId)
  const favCount = state.gamePlayCounts[state.selectedGameId] ?? 0
  const showTrends = trendsActive(state)
  const trends = Object.fromEntries(games.map((g) => [g.id, trendInfo(state, g.id)]))

  return (
    <div className="screen games-screen landscape">
      <StatsBar />
      <div className="section-head">
        <button type="button" className="btn ghost" onClick={() => setScreen('hub')}>
          ← Студия
        </button>
        <h2>Магазин игр</h2>
      </div>
      <p className="lede sticky-note">
        Сейчас: <strong>{current.name}</strong>
        {favCount >= 3 ? ' · любимая (+5% хайп)' : favCount > 0 ? ` · сыграно ${favCount}/3` : ''}
        {' · '}
        Бюджет: <strong>{Math.floor(state.money)}₽</strong>
      </p>
      <p className="lede featured-hint">
        {showTrends
          ? 'У каждой игры свой цикл тренда: зайди на росте — получишь больше всего новых подписчиков, на пике — больше зрителей.'
          : 'Игра недели и новинка дают доп. хайп в эфире. Новинка меняется каждые 2 недели.'}
      </p>
      <div className="games-grid">
        {games.map((g) => {
          const owned = g.unlocked
          const canBuy = canBuyGame(state, g.id)
          const isWeek = g.id === state.weekGameId
          const isNew = g.id === state.newReleaseGameId
          return (
            <div
              key={g.id}
              className={`game-card shop ${state.selectedGameId === g.id ? 'selected' : ''} ${owned ? '' : 'locked'} ${isWeek ? 'week-pick' : ''} ${isNew ? 'new-release' : ''}`}
              style={{ ['--game-color' as string]: g.color }}
            >
              <div className="game-card-art">
                <img src={g.avatar} alt="" draggable={false} />
                {!owned && <span className="lock-badge">{g.price}₽</span>}
                {isWeek && <span className="feat-badge week">Недели</span>}
                {isNew && <span className="feat-badge release">Новинка</span>}
              </div>
              <strong>{g.name}</strong>
              {showTrends ? (
                <span className={`trend-tag trend-${trends[g.id]!.phase}`} title={TREND_HINT[trends[g.id]!.phase]}>
                  {TREND_LABEL[trends[g.id]!.phase]}
                  {trends[g.id]!.phase !== 'peak' && ` · пик через ${trends[g.id]!.daysToPeak} дн.`}
                </span>
              ) : (
                <span className="muted">{g.tagline}</span>
              )}
              {(isWeek || isNew) && (
                <span className="feat-boost">
                  {isWeek ? '+18% хайп' : ''}
                  {isWeek && isNew ? ' · ' : ''}
                  {isNew ? '+28% хайп' : ''}
                </span>
              )}
              <div className="game-stats">
                <StatBar label="Зрит." value={g.mods.viewers} />
                <StatBar label="Донат" value={g.mods.donate} />
                <StatBar label="Хайп" value={g.mods.hype} />
              </div>
              <div className="row wrap game-card-actions">
                {owned ? (
                  <button
                    type="button"
                    className={`btn ${state.selectedGameId === g.id ? 'primary' : ''}`}
                    onClick={() => selectCatalogGame(g.id)}
                  >
                    {state.selectedGameId === g.id ? 'Выбрано' : 'Выбрать'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!canBuy}
                    onClick={() => purchaseGame(g.id)}
                  >
                    Купить · {g.price}₽
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
