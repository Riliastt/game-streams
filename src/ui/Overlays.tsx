import { useGame } from '../game/GameContext'
import { getRank, nextRank, rankProgress } from '../game/ranks'
import { getGame } from '../game/games'
import { streakBonus } from '../game/economy'
import { useCountUp } from './useCountUp'
import { DRAMA_STEPS, dramaFinished, dramaStep, dramaTitle } from '../game/drama'
import { personaTitle } from '../game/persona'
import { getRival } from '../game/battle'
import { currentTrend, TREND_LABEL, trendsActive } from '../game/trends'

function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 7) * 0.12}s`,
            ['--hue' as string]: `${(i * 47) % 360}`,
          }}
        />
      ))}
    </div>
  )
}

function RankUp() {
  const { state, ackRank } = useGame()
  const rank = getRank(state)
  const next = nextRank(state)
  return (
    <div className="overlay-backdrop">
      <Confetti />
      <div className="overlay-card rankup-card" role="dialog">
        <p className="eyebrow">Новый ранг</p>
        <div className="rankup-badge">{rank.name}</div>
        <p className="lede">{rank.unlock}</p>
        {next && (
          <p className="muted">
            Следующий: {next.name} — {next.minSubs.toLocaleString('ru-RU')} подписчиков
          </p>
        )}
        <button type="button" className="btn primary big" onClick={ackRank}>
          Круто!
        </button>
      </div>
    </div>
  )
}

function LoginGiftCard() {
  const { loginGift, claimLogin } = useGame()
  if (!loginGift) return null
  return (
    <div className="overlay-backdrop">
      <div className="overlay-card" role="dialog">
        <p className="eyebrow">Подарок за вход · день {loginGift.streak} из 7</p>
        <h2>С возвращением!</h2>
        <div className="login-row">
          {loginGift.rewards.map((r, i) => (
            <div
              key={i}
              className={`login-day ${i + 1 < loginGift.streak ? 'done' : ''} ${i + 1 === loginGift.streak ? 'today' : ''}`}
            >
              <span>Д{i + 1}</span>
              <strong>{r}₽</strong>
              {i === 6 && <em>+хайп</em>}
            </div>
          ))}
        </div>
        <p className="muted">Заходи каждый день — награда растёт. Пропуск сбрасывает серию.</p>
        <button type="button" className="btn primary big" onClick={claimLogin}>
          Забрать {loginGift.money}₽
        </button>
      </div>
    </div>
  )
}

function OfflineCard() {
  const { offlineReport, claimOffline } = useGame()
  const money = useCountUp(offlineReport?.money ?? 0)
  if (!offlineReport) return null
  return (
    <div className="overlay-backdrop">
      <div className="overlay-card" role="dialog">
        <p className="eyebrow">Пока тебя не было · {offlineReport.hours} ч</p>
        <h2>Записи эфиров крутились</h2>
        <div className="summary-grid">
          <div>
            <b>+{money}₽</b>
            <span>с VOD и клипов</span>
          </div>
          <div>
            <b>+{offlineReport.subs}</b>
            <span>подписчиков</span>
          </div>
        </div>
        <p className="muted">Копится до 8 часов.</p>
        <div className="row">
          <button type="button" className="btn primary" onClick={() => void claimOffline(false)}>
            Забрать
          </button>
          <button type="button" className="btn accent" onClick={() => void claimOffline(true)}>
            x2 за рекламу
          </button>
        </div>
      </div>
    </div>
  )
}

function DaySummaryCard() {
  const { state, daySummary, dismissDaySummary } = useGame()
  const subs = useCountUp(daySummary?.subsGain ?? 0)
  if (!daySummary) return null
  const next = nextRank(state)
  const progress = rankProgress(state)
  const weekGame = getGame(state.weekGameId)
  const teasers: string[] = []
  if (daySummary.newSponsor) teasers.push(`Новое предложение от спонсора «${daySummary.newSponsor}»`)
  if (daySummary.weekChanged) teasers.push(`Новая игра недели: ${weekGame.name} — бонус к хайпу`)
  if (state.sponsorActive) teasers.push(`Контракт ${state.sponsorActive.brand}: до дня ${state.sponsorActive.deadlineDay}`)
  const challenger = getRival(state, state.battleOffer)
  if (challenger) teasers.push(`⚔ ${challenger.name} вызывает тебя на баттл`)
  if (state.drama && state.drama.step === 0) teasers.push('⚠ В сети назревает драма вокруг тебя…')
  if (trendsActive(state)) {
    const t = currentTrend(state)
    teasers.push(
      `${getGame(state.selectedGameId).name}: ${TREND_LABEL[t.phase]}${t.phase !== 'peak' ? ` · пик через ${t.daysToPeak} дн.` : ''}`,
    )
  }
  teasers.push(
    `Рейтинг недели: ${daySummary.boardPlace}-е место · до итогов ${daySummary.daysLeftInWeek} дн.`,
  )
  return (
    <div className="overlay-backdrop">
      <div className="overlay-card day-summary" role="dialog">
        <p className="eyebrow">Итоги дня {daySummary.day}</p>
        <div className="summary-grid">
          <div>
            <b>+{subs}</b>
            <span>подписчиков</span>
          </div>
          <div>
            <b className={daySummary.moneyGain >= 0 ? 'good' : 'warn'}>
              {daySummary.moneyGain >= 0 ? '+' : ''}
              {daySummary.moneyGain}₽
            </b>
            <span>за день</span>
          </div>
          <div>
            <b className="warn">−{daySummary.upkeep}₽</b>
            <span>расходы</span>
          </div>
        </div>
        <div className={`streak-line ${daySummary.streakLost ? 'lost' : ''}`}>
          {daySummary.streakLost
            ? 'Серия эфиров прервана — стримь каждый день, чтобы вернуть бонус'
            : daySummary.streak > 0
              ? `🔥 Серия ${daySummary.streak} дн. · +${Math.round(streakBonus(state) * 100)}% к донатам`
              : 'Начни серию: эфир каждый день = до +50% к донатам'}
        </div>
        {next && (
          <div className="rank-progress">
            <div className="rank-progress-head">
              <span>{getRank(state).name}</span>
              <span>
                до «{next.name}» — {(next.minSubs - state.subscribers).toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        <p className="eyebrow">День {state.day}</p>
        <ul className="teaser-list">
          {teasers.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <button type="button" className="btn primary big" onClick={dismissDaySummary}>
          Начать день {state.day}
        </button>
      </div>
    </div>
  )
}

function DramaCard() {
  const { state, chooseDrama, closeDramaCard, dramaNote } = useGame()
  const drama = state.drama
  if (!drama) return null
  const view = dramaStep(state)
  const title = dramaTitle(drama)
  if (dramaFinished(state)) {
    return (
      <div className="overlay-backdrop">
        <div className="overlay-card drama-card" role="dialog">
          <p className="eyebrow">Драма · {title} · финал</p>
          <h2>{drama.outcome}</h2>
          {dramaNote && <p className="warn">{dramaNote}</p>}
          <div className="summary-grid">
            <div>
              <b className="good">+{drama.subs}</b>
              <span>подписчиков за историю</span>
            </div>
            <div>
              <b>{personaTitle(state)}</b>
              <span>твой образ</span>
            </div>
          </div>
          <button type="button" className="btn primary big" onClick={closeDramaCard}>
            Закрыть историю
          </button>
        </div>
      </div>
    )
  }
  if (!view) return null
  return (
    <div className="overlay-backdrop">
      <div className={`overlay-card drama-card ${drama.score < 0 ? 'hot' : ''}`} role="dialog">
        <p className="eyebrow">
          Драма · {title} · день {view.step + 1} из {DRAMA_STEPS}
        </p>
        <h2>{view.text}</h2>
        {dramaNote && <p className="warn">{dramaNote}</p>}
        <div className="drama-choices">
          {view.choices.map((c) => (
            <button key={c.id} type="button" className="btn" onClick={() => chooseDrama(c.id)}>
              {c.label}
              {c.chance !== undefined && <em className="event-chance">{Math.round(c.chance * 100)}%</em>}
              {c.effects.money ? (
                <small className={c.effects.money > 0 ? 'good' : 'warn'}>
                  {c.effects.money > 0 ? '+' : ''}
                  {c.effects.money}₽
                </small>
              ) : null}
            </button>
          ))}
        </div>
        <p className="muted">Каждый день — новый поворот. Решения меняют репутацию и образ.</p>
      </div>
    </div>
  )
}

/** Hub-level modals, one at a time by priority. */
export function Overlays() {
  const { state, screen, loginGift, offlineReport, daySummary, lastRewards, clipOffers, montageDraft } = useGame()
  if (screen !== 'hub' || state.stream.active || state.pendingSceneId) return null
  const rank = getRank(state)
  if (rank.id > (state.lastRankSeen ?? 0) && !lastRewards) return <RankUp />
  if (loginGift) return <LoginGiftCard />
  if (offlineReport) return <OfflineCard />
  if (daySummary) return <DaySummaryCard />
  if (!lastRewards && !clipOffers && !montageDraft && (dramaStep(state) || dramaFinished(state))) {
    return <DramaCard />
  }
  return null
}
