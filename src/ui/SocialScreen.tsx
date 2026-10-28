import { computeSocialStats, socialTotals } from '../game/social'
import { useGame } from '../game/GameContext'
import { StatsBar } from './StatsBar'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(2)}K`
  return String(Math.floor(n))
}

export function SocialScreen() {
  const { state, setScreen } = useGame()
  const platforms = computeSocialStats(state)
  const totals = socialTotals(platforms)

  return (
    <div className="screen social-screen landscape">
      <StatsBar />
      <div className="section-head">
        <button type="button" className="btn ghost" onClick={() => setScreen('hub')}>
          ← Студия
        </button>
        <h2>Соцсети</h2>
      </div>
      <div className="social-totals">
        <span>Всего ≈ {fmt(totals.followers)} подп.</span>
        <span>{fmt(totals.views)} просм.</span>
        <span>{fmt(totals.likes)} лайков</span>
      </div>
      <div className="social-grid">
        {platforms.map((p) => (
          <article
            key={p.id}
            className={`social-card social-${p.id}`}
            style={{ ['--social-accent' as string]: p.accent }}
          >
            <header className="social-card-head">
              <div className="social-logo" aria-hidden>
                {p.id === 'instagrim' && 'IG'}
                {p.id === 'twitchly' && 'TV'}
                {p.id === 'facelook' && 'f'}
                {p.id === 'ticktock' && '♪'}
              </div>
              <div>
                <strong>{p.name}</strong>
                <p className="muted">{p.handle}</p>
              </div>
              <span className="social-rank">{p.rankLabel}</span>
            </header>
            <p className="social-tagline">{p.tagline}</p>
            <div className="social-metrics">
              <div>
                <em>{fmt(p.followers)}</em>
                <span>подписчики</span>
              </div>
              <div>
                <em>{fmt(p.views)}</em>
                <span>просмотры</span>
              </div>
              <div>
                <em>{fmt(p.likes)}</em>
                <span>лайки</span>
              </div>
              <div>
                <em>{p.engagement}%</em>
                <span>ER</span>
              </div>
              <div>
                <em>{p.posts}</em>
                <span>посты</span>
              </div>
              <div>
                <em>{p.following}</em>
                <span>подписки</span>
              </div>
            </div>
            <p className="social-tip muted">{p.tip}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
