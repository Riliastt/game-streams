import { useEffect, useMemo, useState } from 'react'
import { canStartStream } from '../game/clicker'
import {
  FEED_MEDIUM_LABEL,
  MONTAGE_LIMIT,
  mediumLabel,
  montageLabel,
  montageOptionsFor,
  previewMontage,
  PRODUCE_COST,
  type MontageId,
} from '../game/clips'
import { failEndingCopy, isFailEnding } from '../game/endings'
import { getGame } from '../game/games'
import { gearChecklist, gearLevel } from '../game/gear'
import { useGame } from '../game/GameContext'
import { dailyUpkeep, listContentTypes, phaseHint, phaseLabel } from '../game/management'
import { getRank, nextRank, rankProgress } from '../game/ranks'
import { forecastStream, getStyle, STREAM_STYLES } from '../game/streamPlan'
import type { StreamRewards } from '../game/economy'
import { canBonusStream, canPromo, promoCost, promoGain } from '../game/management'
import { x2Left } from '../game/retention'
import { getStudio } from '../game/studio'
import { StatsBar } from './StatsBar'
import { StudioVisual } from './StudioVisual'
import { useCountUp } from './useCountUp'
import { getGoalTier, GOAL_TIERS, goalName, goalsUnlocked, goalTarget } from '../game/goal'
import { BATTLE_DURATION, getRival } from '../game/battle'
import { personaTitle } from '../game/persona'
import { CATALOG } from '../game/games'
import { currentTrend, TREND_HINT, TREND_LABEL, trendInfo, trendsActive } from '../game/trends'

const GEAR_ICON: Record<string, string> = {
  cam: '📷',
  mic: '🎙️',
  lights: '💡',
  pc: '💻',
}

const DEFAULT_NAMES = ['ПиксельПанда', 'ЛунныйКот', 'НеонЛис', 'КиберЁж', 'ТихийРейд', 'ЧайИКлатч']

function RewardsCard({
  rewards,
  onCollect,
}: {
  rewards: StreamRewards
  onCollect: (double: boolean) => Promise<void>
}) {
  const { state } = useGame()
  const earned = rewards.donations + rewards.streamBonus
  const total = earned + rewards.sponsor
  const money = useCountUp(total)
  const subs = useCountUp(rewards.subscribers, 1300)
  const adsLeft = x2Left(state)
  const prev = state.lastStreamMoney
  const projected = { ...state, subscribers: state.subscribers + rewards.subscribers }
  const next = nextRank(projected)
  const progress = rankProgress(projected)
  return (
    <div className="rewards-card juicy" role="dialog">
      <h2>Стрим окончен</h2>
      <div className="reward-big">
        <div>
          <b>+{money}₽</b>
          <span>в бюджет</span>
        </div>
        <div>
          <b>
            {subs >= 0 ? '+' : ''}
            {subs}
          </b>
          <span>подписчиков</span>
        </div>
        <div>
          <b>+{rewards.hype}</b>
          <span>хайпа</span>
        </div>
      </div>
      <p className="reward-breakdown muted">
        Донаты {rewards.donations}₽ · бонус эфира {rewards.streamBonus}₽
        {rewards.sponsor > 0 && ` · спонсор ${rewards.sponsorBrand} ${rewards.sponsor}₽`} · репутация{' '}
        {rewards.reputation >= 0 ? '+' : ''}
        {rewards.reputation}
      </p>
      {prev > 0 && (
        <p className={`reward-compare ${total >= prev ? 'good' : 'warn'}`}>
          {total >= prev ? '▲' : '▼'} {Math.abs(total - prev)}₽ к прошлому эфиру
        </p>
      )}
      {rewards.battle && (
        <p className={`reward-result ${rewards.battle.won ? 'good' : 'warn'}`}>
          {rewards.battle.won
            ? `⚔ Победа над ${rewards.battle.name}! +${rewards.battle.subs} его подписчиков`
            : `⚔ ${rewards.battle.name} победил · ${rewards.battle.subs} подписчиков`}
        </p>
      )}
      {rewards.goal && (
        <p className={`reward-result ${rewards.goal.hit ? 'good' : 'warn'}`}>
          {rewards.goal.hit
            ? `🎯 Цель ${rewards.goal.target}₽ собрана! +${rewards.goal.subs} подписчиков · репутация +${getGoalTier(rewards.goal.tier).repWin}`
            : `🎯 Цель не собрана: ${rewards.goal.raised}/${rewards.goal.target}₽${getGoalTier(rewards.goal.tier).repFail ? ` · репутация ${getGoalTier(rewards.goal.tier).repFail}` : ''}`}
        </p>
      )}
      {state.stream.newFan && <p className="reward-fan">★ Новый суперфан: {state.stream.newFan}</p>}
      {state.stream.fansLeft.length > 0 && (
        <p className="reward-result warn">
          💔 {state.stream.fansLeft.join(', ')} {state.stream.fansLeft.length > 1 ? 'ушли' : 'ушёл'} из суперфанов —
          чат их не замечал
        </p>
      )}
      {next && (
        <div className="rank-progress">
          <div className="rank-progress-head">
            <span>{getRank(projected).name}</span>
            <span>
              до «{next.name}» — {(next.minSubs - projected.subscribers).toLocaleString('ru-RU')}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn primary" onClick={() => void onCollect(false)}>
          Забрать
        </button>
        <button
          type="button"
          className="btn accent"
          disabled={adsLeft <= 0}
          onClick={() => void onCollect(true)}
        >
          {adsLeft > 0 ? `x2 = +${earned * 2 + rewards.sponsor}₽ за рекламу · ${adsLeft}/3` : 'x2 — лимит на сегодня'}
        </button>
      </div>
    </div>
  )
}

export function HubScreen() {
  const {
    state,
    lastRewards,
    clipOffers,
    montageDraft,
    collectRewards,
    selectClipIdea,
    publishClipMontage,
    skipClip,
    boostClip,
    startStreaming,
    setScreen,
    sleep,
    toggleSound,
    newGame,
    setChannelName,
    selectTheme,
    purchaseTheme,
    goingLive,
    dismissCamTipFlag,
    openPaidMembership,
    startContentIdeas,
    goToManage,
    chooseStreamStyle,
    setStreamTitle,
    rollStreamTitle,
    acceptSponsorOffer,
    declineSponsorOffer,
    watchBonusStreamAd,
    buyPromo,
    chooseGoalTier,
    acceptBattleOffer,
    declineBattleOffer,
  } = useGame()

  const [nameDraft, setNameDraft] = useState(
    () => DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)]!,
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const firstStream = state.streamsDone === 0
  const showPlan = state.streamsDone >= 1
  const showStyles = state.streamsDone >= 2
  const showFeatured = state.day >= 3
  const nudgeUpgrades = state.streamsDone >= 1 && Object.keys(state.upgrades).length === 0
  const studio = getStudio(state)
  const [titleDraft, setTitleDraft] = useState(state.streamTitle)
  useEffect(() => setTitleDraft(state.streamTitle), [state.streamTitle])
  const forecast = useMemo(() => forecastStream(state), [state])
  const showGoal = goalsUnlocked(state)
  const showTrends = trendsActive(state)
  const trend = currentTrend(state)
  const hotGames = showTrends
    ? CATALOG.map((g) => ({ g, t: trendInfo(state, g.id) }))
        .filter((x) => x.t.phase === 'rising' || x.t.phase === 'peak')
        .slice(0, 3)
    : []
  const battleOffer = getRival(state, state.battleOffer)
  const battleArmed = getRival(state, state.battleArmed)
  const goalScale = battleArmed ? 0.9 : 1
  const [montagePicks, setMontagePicks] = useState<MontageId[]>([])
  const content = listContentTypes().find((c) => c.id === state.contentType)
  const clipBusy = Boolean(lastRewards || clipOffers || montageDraft)
  const canStream = canStartStream(state) && !goingLive && !clipBusy
  const rank = getRank(state)
  const gear = gearChecklist(state)
  const selectedGame = getGame(state.selectedGameId)
  const weekGame = getGame(state.weekGameId || 'block_realm')
  const newRelease = getGame(state.newReleaseGameId || 'brick_verse')
  const showCamTip =
    !state.flags.includes('tip_cam_seen') &&
    gearLevel(state, 'cam') === 0 &&
    state.streamsDone >= 1 &&
    state.streamsDone < 3
  const phase = state.dayPhase
  const locked = isFailEnding(state.ending)
  const upkeep = dailyUpkeep(state)
  const failCopy = isFailEnding(state.ending) ? failEndingCopy(state.ending) : null
  const montageOptions = useMemo(
    () => (montageDraft ? montageOptionsFor(montageDraft) : []),
    [montageDraft],
  )
  const montagePreview = useMemo(
    () => (montageDraft ? previewMontage(montageDraft, montagePicks) : null),
    [montageDraft, montagePicks],
  )

  const toggleMontage = (id: MontageId) => {
    setMontagePicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MONTAGE_LIMIT) return prev
      return [...prev, id]
    })
  }

  return (
    <div className={`screen hub-screen landscape theme-${state.themeId} phase-${phase}`}>
      <StatsBar />

      <div className="hub-daybar">
        <div>
          <p className="eyebrow">День {state.day}</p>
          <h1>
            {phaseLabel(phase)}
            <span className="hub-rank"> · {rank.name}</span>
          </h1>
          <p className="lede">{phaseHint(phase)}</p>
        </div>
        <div className="hub-day-meta">
          <span>{state.channelName}</span>
          <span>
            {studio.name} · {content?.name}
          </span>
          {state.streamsDone >= 3 && <span className="persona-tag">Образ: {personaTitle(state)}</span>}
          {state.debtDays > 0 && <span className="warn">Долг {state.debtDays} дн.</span>}
          {phase === 'manage' && <span className="muted">Сон: −{upkeep}₽</span>}
        </div>
      </div>

      <div className="hub-split clean">
        <div className="hub-left">
          <StudioVisual />
          <div className="gear-checklist cartoon-panel">
            <strong className="sticker-title">Железо</strong>
            <div className="gear-row">
              {gear.map((g) => (
                <div key={g.key} className={`gear-item status-${g.status}`}>
                  <span className="gear-ico">{GEAR_ICON[g.key]}</span>
                  <span>{g.label}</span>
                  <em>
                    {g.status === 'none' ? 'Нет' : g.status === 'ok' ? 'Ok' : 'Pro'} · L{g.level}
                  </em>
                </div>
              ))}
            </div>
          </div>
          <div
            className="selected-game-card cartoon-panel"
            style={{ ['--game-color' as string]: selectedGame.color }}
          >
            <img src={selectedGame.avatar} alt="" draggable={false} />
            <div>
              <p className="eyebrow">Игра эфира</p>
              <strong>{selectedGame.name}</strong>
              {showTrends ? (
                <p className={`trend-tag trend-${trend.phase}`} title={TREND_HINT[trend.phase]}>
                  {TREND_LABEL[trend.phase]}
                  {trend.phase !== 'peak' && ` · пик через ${trend.daysToPeak} дн.`}
                </p>
              ) : (
                <p className="muted">{selectedGame.tagline}</p>
              )}
              {phase !== 'produce' && !firstStream && (
                <button type="button" className="btn" onClick={() => setScreen('games')}>
                  Сменить
                </button>
              )}
            </div>
          </div>
          {showFeatured && (
          <div className="featured-games cartoon-panel">
            <div className="featured-row">
              <img src={weekGame.avatar} alt="" draggable={false} />
              <div>
                <p className="eyebrow">Игра недели</p>
                <strong>{weekGame.name}</strong>
                <p className="muted">+хайп в эфире · меняется каждую неделю</p>
              </div>
            </div>
            <div className="featured-row">
              <img src={newRelease.avatar} alt="" draggable={false} />
              <div>
                <p className="eyebrow">Новинка (каждые 2 нед.)</p>
                <strong>{newRelease.name}</strong>
                <p className="muted">Сильный буст хайпа · бесплатный unlock при смене</p>
              </div>
            </div>
            {hotGames.length > 0 && (
              <p className="trend-line">
                В тренде:{' '}
                {hotGames.map((x) => `${x.g.name} (${TREND_LABEL[x.t.phase]})`).join(', ')}
              </p>
            )}
            <button type="button" className="btn ghost" onClick={() => setScreen('games')}>
              К каталогу
            </button>
          </div>
          )}
        </div>

        <div className="hub-right">
          <div className="hub-right-scroll">
          {showCamTip && !clipBusy && (
            <div className="tip-card cartoon-panel">
              <strong>Подсказка</strong>
              <p>Купи вебкамеру в апгрейдах — иначе в эфире будет NO SIGNAL.</p>
              <button type="button" className="btn ghost" onClick={dismissCamTipFlag}>
                Понятно
              </button>
            </div>
          )}

          {!state.channelNamed && !clipBusy && (
            <div className="name-card">
              <p>Назовите канал (один раз)</p>
              <div className="row">
                <input
                  className="text-input"
                  maxLength={24}
                  value={nameDraft}
                  placeholder="Мой канал"
                  onChange={(e) => setNameDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setChannelName(nameDraft)}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {phase === 'stream' && firstStream && !clipBusy && !locked && (
            <div className="tip-card first-stream cartoon-panel">
              <strong>Твой первый эфир</strong>
              <p>
                Жми «Начать стрим», лопай шарики и отвечай чату. Эфир короткий — 30 секунд. Зрители уже ждут!
              </p>
            </div>
          )}

          {(battleOffer || battleArmed) && !clipBusy && !locked && (
            <div className="battle-card cartoon-panel">
              {battleArmed ? (
                <>
                  <strong className="sticker-title">⚔ Баттл с {battleArmed.name}</strong>
                  <p>
                    Следующий эфир — {BATTLE_DURATION} секунд против него. Кто наберёт больше хайпа, заберёт часть чужой аудитории.
                  </p>
                </>
              ) : battleOffer ? (
                <>
                  <strong className="sticker-title">
                    ⚔ {battleOffer.name} {battleOffer.id === state.nemesisId ? '(заклятый враг) ' : ''}зовёт на баттл
                  </strong>
                  <p>
                    {battleOffer.subs.toLocaleString('ru-RU')} подписчиков. Победа — его зрители переходят к тебе,
                    поражение — часть твоих уходит к нему.
                  </p>
                  <div className="row sponsor-foot">
                    <span className="muted">Раз в неделю</span>
                    <button type="button" className="btn primary" onClick={acceptBattleOffer}>
                      Принять вызов
                    </button>
                    <button type="button" className="btn ghost" onClick={declineBattleOffer}>
                      Отказаться
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {phase === 'stream' && showPlan && !clipBusy && !locked && (
            <div className="stream-plan cartoon-panel">
              <div className="stream-plan-head">
                <strong className="sticker-title">Подготовка эфира</strong>
                <span className="muted">
                  {showStyles ? getStyle(state.streamStyle).hint : 'Стили эфира откроются завтра'}
                </span>
              </div>
              {showStyles && (
              <div className="stream-style-chips" role="group" aria-label="Стиль эфира">
                {STREAM_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip ${state.streamStyle === s.id ? 'active' : ''}`}
                    aria-pressed={state.streamStyle === s.id}
                    onClick={() => chooseStreamStyle(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              )}
              {showGoal && (
                <div className="goal-picker">
                  <span className="goal-picker-label">
                    🎯 Цель доната{state.goalTier > 0 ? ` «${goalName(state)}»` : ''}
                  </span>
                  <div className="stream-style-chips" role="group" aria-label="Цель доната">
                    {GOAL_TIERS.map((t) => {
                      const target = goalTarget(forecast.donations * goalScale, t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`chip ${state.goalTier === t.id ? 'active' : ''}`}
                          aria-pressed={state.goalTier === t.id}
                          title={
                            t.id
                              ? `Собрал — +${Math.round(t.subsBonus * 100)}% подписчиков${t.repFail ? `, нет — репутация ${t.repFail}` : ''}`
                              : 'Без риска и бонуса'
                          }
                          onClick={() => chooseGoalTier(t.id)}
                        >
                          {t.name}
                          {target > 0 && ` · ${target}₽`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="stream-title-row">
                <input
                  className="text-input"
                  maxLength={50}
                  value={titleDraft}
                  placeholder="Название эфира (необязательно)"
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => setStreamTitle(titleDraft)}
                />
                <button
                  type="button"
                  className="btn ghost"
                  title="Случайное название"
                  aria-label="Случайное название"
                  onClick={rollStreamTitle}
                >
                  🎲
                </button>
              </div>
              <div className="stream-forecast">
                <div>
                  <b>~{forecast.viewers}</b>
                  <span>зрителей</span>
                </div>
                <div>
                  <b>~{forecast.subs}</b>
                  <span>подписчиков</span>
                </div>
                <div>
                  <b>~{forecast.money}₽</b>
                  <span>доход</span>
                </div>
              </div>
              <p className="muted stream-forecast-note">Прогноз для среднего эфира — многое решают клики и события.</p>
            </div>
          )}

          {(state.sponsorOffer || state.sponsorActive) && !clipBusy && (
            <div className="sponsor-card cartoon-panel">
              {state.sponsorActive ? (
                <>
                  <strong className="sticker-title">Контракт · {state.sponsorActive.brand}</strong>
                  <p>
                    Эфир в <b>{getGame(state.sponsorActive.gameId).name}</b> и не меньше{' '}
                    <b>{state.sponsorActive.minViewers}</b> зрителей к концу.
                  </p>
                  <p className="muted">
                    Награда {state.sponsorActive.reward}₽ · до дня {state.sponsorActive.deadlineDay} · провал −3
                    репутации
                    {state.selectedGameId !== state.sponsorActive.gameId && ' · смени игру в студии'}
                  </p>
                </>
              ) : state.sponsorOffer ? (
                <>
                  <strong className="sticker-title">Предложение · {state.sponsorOffer.brand}</strong>
                  <p>
                    Бренд ищет эфир в <b>{getGame(state.sponsorOffer.gameId).name}</b>: нужно{' '}
                    <b>{state.sponsorOffer.minViewers}</b>+ зрителей к концу стрима.
                  </p>
                  <div className="row sponsor-foot">
                    <span className="muted">
                      {state.sponsorOffer.reward}₽ · до дня {state.sponsorOffer.deadlineDay}
                    </span>
                    <button type="button" className="btn primary" onClick={acceptSponsorOffer}>
                      Принять
                    </button>
                    <button type="button" className="btn ghost" onClick={declineSponsorOffer}>
                      Отказаться
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {lastRewards && <RewardsCard rewards={lastRewards} onCollect={collectRewards} />}

          {clipOffers && !lastRewards && !montageDraft && (
            <div className="rewards-card clip-picker compact" role="dialog">
              <div className="clip-picker-head">
                <h2>Идея: {FEED_MEDIUM_LABEL[clipOffers[0]?.medium ?? 'clip']}</h2>
                <button type="button" className="btn ghost" onClick={skipClip}>
                  Отказаться
                </button>
              </div>
              <div className="clip-grid">
                {clipOffers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="clip-card"
                    onClick={() => {
                      setMontagePicks(['hook', 'gameplay'])
                      selectClipIdea(c.id)
                    }}
                  >
                    <img src={c.avatar} alt="" draggable={false} />
                    <div className="clip-card-body">
                      <strong>{c.title}</strong>
                      <span className="muted">
                        {c.gameName} · {c.formatName}
                      </span>
                      <div className="clip-stats">
                        <span>Вирал {c.stats.virality}</span>
                        <span>Качество {c.stats.quality}</span>
                        <span>Риск {c.stats.risk}</span>
                        <span>Юмор {c.stats.humor}</span>
                      </div>
                      <div className="clip-effects">
                        ~{c.preview.peakViews} просм. · RPM {c.preview.rpm}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {montageDraft && (
            <div className="rewards-card clip-picker clip-montage compact" role="dialog">
              <div className="clip-picker-head">
                <h2>Монтаж · {mediumLabel(montageDraft.medium)}</h2>
                <button type="button" className="btn ghost" onClick={skipClip}>
                  Отказаться
                </button>
              </div>
              <p className="clip-montage-sub muted">
                {montageDraft.title} · до {MONTAGE_LIMIT} вставок
                {montageDraft.medium !== 'clip'
                  ? ` · −${PRODUCE_COST[montageDraft.medium].money}₽` +
                    (PRODUCE_COST[montageDraft.medium].energy
                      ? `/−${PRODUCE_COST[montageDraft.medium].energy} эн.`
                      : '')
                  : ''}
              </p>
              <div className="montage-grid">
                {montageOptions.map((m) => {
                  const on = montagePicks.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`montage-chip ${on ? 'on' : ''}`}
                      onClick={() => toggleMontage(m.id)}
                    >
                      <strong>{m.label}</strong>
                    </button>
                  )
                })}
              </div>
              {montagePreview && (
                <div className="clip-stats montage-preview">
                  <span>Вирал {montagePreview.virality}</span>
                  <span>Качество {montagePreview.quality}</span>
                  <span>Риск {montagePreview.risk}</span>
                  <span>Юмор {montagePreview.humor}</span>
                  <span>~{montagePreview.peakViews} просм.</span>
                  <span>RPM {montagePreview.rpm}</span>
                </div>
              )}
              <button
                type="button"
                className="btn primary"
                onClick={() => publishClipMontage(montagePicks)}
              >
                Выложить в ленту
              </button>
            </div>
          )}

          {state.clipFeed.length > 0 && !clipOffers && !montageDraft && (
            <div className="hub-panel clip-feed">
              <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Лента канала</strong>
                <button type="button" className="btn ghost" onClick={() => setScreen('social')}>
                  Статистика соцсетей
                </button>
              </div>
              <p className="muted">
                С низов рост медленный; иногда ролик выстреливает. x2 за рекламу усиливает охват.
              </p>
              <div className="clip-feed-list">
                {state.clipFeed.map((c) => (
                  <div key={c.id} className={`feed-clip status-${c.status}`}>
                    <img src={c.avatar} alt="" draggable={false} />
                    <div className="feed-clip-body">
                      <strong>
                        <span className="feed-medium-tag inline">{mediumLabel(c.medium ?? 'clip')}</span>{' '}
                        {c.title}
                      </strong>
                      <span className="muted">
                        {Math.floor(c.views).toLocaleString('ru-RU')} просм. · заработано{' '}
                        {Math.floor(c.earned)}₽
                        {c.boostMult > 1 ? ' · x2' : ''}
                      </span>
                      <div className="feed-bar">
                        <i
                          style={{
                            width: `${Math.min(100, Math.round((c.views / Math.max(1, c.peakViews)) * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="feed-elements muted">
                        {c.elements.map((e) => montageLabel(e as MontageId)).join(' · ') || 'базовый монтаж'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn accent"
                      disabled={c.boostUsed || c.status === 'dead' || locked}
                      onClick={() => void boostClip(c.id)}
                    >
                      {c.boostUsed ? 'Буст есть' : 'x2 просм.'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.ending && !locked && (
            <p className="ending-badge">Концовка: {state.ending.replace('ending_', '')}</p>
          )}

          {state.projects.length > 0 && (
            <div className="hub-panel">
              <strong>Проекты</strong>
              {state.projects.map((p) => (
                <p key={p.id} className="muted">
                  {p.label} — {Math.max(0, Math.ceil((p.finishesAt - Date.now()) / 1000))}с
                </p>
              ))}
            </div>
          )}
          </div>

          <div className="actions-grid hub-actions phase-actions">
            {phase === 'stream' && (
              <>
                <button
                  type="button"
                  className={`btn primary big ${firstStream ? 'pulse' : ''}`}
                  disabled={!canStream || locked}
                  onClick={startStreaming}
                >
                  {goingLive
                    ? 'Выходим в эфир…'
                    : state.burnout >= 95
                      ? 'Выгорание'
                      : state.energy < 1
                        ? 'Нет энергии'
                        : state.dayFlags.bonusStream
                          ? 'Бонусный эфир'
                          : 'Начать стрим'}
                </button>
                {!firstStream && !state.dayFlags.streamed && (
                  <>
                    <button
                      type="button"
                      className="btn"
                      disabled={
                        locked ||
                        clipBusy ||
                        state.energy < PRODUCE_COST.video.energy ||
                        state.money < PRODUCE_COST.video.money
                      }
                      onClick={() => startContentIdeas('video')}
                    >
                      Видео (−{PRODUCE_COST.video.money}₽/−{PRODUCE_COST.video.energy} эн.)
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={locked || clipBusy || state.money < PRODUCE_COST.reel.money}
                      onClick={() => startContentIdeas('reel')}
                    >
                      Рилс (−{PRODUCE_COST.reel.money}₽)
                    </button>
                  </>
                )}
              </>
            )}

            {phase === 'produce' && (
              <>
                <button
                  type="button"
                  className="btn primary big"
                  disabled={
                    state.energy < PRODUCE_COST.video.energy ||
                    state.money < PRODUCE_COST.video.money ||
                    clipBusy ||
                    locked
                  }
                  onClick={() => startContentIdeas('video')}
                >
                  Выложить видео (−{PRODUCE_COST.video.money}₽, −{PRODUCE_COST.video.energy} эн.)
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={locked || clipBusy || state.money < PRODUCE_COST.reel.money}
                  onClick={() => startContentIdeas('reel')}
                >
                  Сделать рилс (−{PRODUCE_COST.reel.money}₽)
                </button>
                <button type="button" className="btn" disabled={locked || clipBusy} onClick={goToManage}>
                  Дальше →
                </button>
              </>
            )}

            {phase === 'manage' && (
              <>
                {state.streamsDone >= 3 && (
                  <button
                    type="button"
                    className="btn"
                    disabled={!canPromo(state)}
                    onClick={buyPromo}
                    title="Раз в день: платное продвижение канала"
                  >
                    {state.dayFlags.promo
                      ? 'Промо запущено'
                      : `Промо: +${promoGain(state)} подп. (−${promoCost(state)}₽)`}
                  </button>
                )}
                {canBonusStream(state) && (
                  <button
                    type="button"
                    className="btn accent"
                    disabled={locked || clipBusy}
                    onClick={() => void watchBonusStreamAd()}
                  >
                    Ещё эфир сегодня · реклама
                  </button>
                )}
                <button
                  type="button"
                  className="btn primary big"
                  disabled={locked || clipBusy}
                  onClick={sleep}
                >
                  Спать (−{upkeep}₽)
                </button>
              </>
            )}
          </div>

          {!firstStream && (
            <nav className="hub-nav" aria-label="Разделы">
              <button
                type="button"
                className={nudgeUpgrades ? 'nudge' : ''}
                disabled={locked}
                onClick={() => setScreen('upgrades')}
              >
                <span>🛠️</span>Студия
              </button>
              <button type="button" disabled={locked} onClick={() => setScreen('team')}>
                <span>👥</span>Команда
              </button>
              <button type="button" disabled={locked} onClick={() => setScreen('games')}>
                <span>🎮</span>Игры
              </button>
              <button type="button" disabled={locked} onClick={() => setScreen('quests')}>
                <span>🎯</span>Цели
              </button>
              <button type="button" disabled={locked} onClick={() => setScreen('rating')}>
                <span>🏆</span>Рейтинг
              </button>
              <button type="button" disabled={locked || clipBusy} onClick={() => setScreen('social')}>
                <span>📱</span>Соцсети
              </button>
              <button type="button" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
                <span>⚙️</span>Ещё
              </button>
            </nav>
          )}
          {firstStream && (
            <nav className="hub-nav slim">
              <button type="button" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
                <span>⚙️</span>Настройки
              </button>
            </nav>
          )}

          {settingsOpen && (
            <div className="settings-pop cartoon-panel" role="dialog">
              <button type="button" className="btn ghost" onClick={toggleSound}>
                Звук: {state.soundEnabled ? 'вкл' : 'выкл'}
              </button>
              {state.subscribers >= 60 && (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={locked || state.membershipOpen || state.subscribers < 80 || state.money < 100}
                  onClick={openPaidMembership}
                >
                  {state.membershipOpen ? 'Платные подписки открыты' : 'Платные подписки (80+ подп., 100₽)'}
                </button>
              )}
              {state.day >= 3 && (
                <div className="theme-row">
                  {(['default', 'neon', 'warm', 'volt'] as const).map((t) => {
                    const unlocked = state.unlockedThemes.includes(t)
                    const prices: Record<string, number> = { neon: 80, warm: 60, volt: 0 }
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`theme-chip ${state.themeId === t ? 'active' : ''}`}
                        disabled={locked}
                        onClick={() => {
                          if (unlocked) selectTheme(t)
                          else if (t !== 'volt' && t !== 'default') purchaseTheme(t, prices[t] ?? 100)
                        }}
                      >
                        {t}
                        {!unlocked && t !== 'volt' ? ` ${prices[t]}₽` : ''}
                      </button>
                    )
                  })}
                </div>
              )}
              {confirmReset ? (
                <div className="row">
                  <span className="warn">Весь прогресс удалится. Точно?</span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setConfirmReset(false)
                      setSettingsOpen(false)
                      newGame()
                    }}
                  >
                    Да, начать заново
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setConfirmReset(false)}>
                    Отмена
                  </button>
                </div>
              ) : (
                <button type="button" className="btn ghost danger" onClick={() => setConfirmReset(true)}>
                  Новая игра…
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {failCopy && (
        <div className="game-over-modal" role="dialog">
          <p className="eyebrow">Конец игры</p>
          <h2>{failCopy.title}</h2>
          <p>{failCopy.body}</p>
          <button type="button" className="btn primary big" onClick={newGame}>
            Новая игра
          </button>
        </div>
      )}
    </div>
  )
}
