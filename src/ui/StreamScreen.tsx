import { useEffect, useState } from 'react'
import { useGame } from '../game/GameContext'
import { EVENT_TTL } from '../game/state'
import { battleScore } from '../game/battle'
import { formatNeedsWebcam } from './stream/FormatCaptureScene'
import { GameCapture } from './stream/GameCapture'
import type { HypeBubble } from './stream/HypeBubbles'
import { StreamOverlays } from './stream/StreamOverlays'
import { WebcamPanel } from './stream/WebcamPanel'

export function StreamScreen() {
  const { state, clickStream, chooseStreamEvent, arcadeHit } = useGame()
  const s = state.stream
  const [reacting, setReacting] = useState(false)
  const left = Math.max(0, Math.ceil(s.duration - s.elapsed))

  const onBubblePop = (kind: HypeBubble['kind']) => {
    clickStream()
    arcadeHit(true)
    if (kind === 'rare') arcadeHit(true)
    setReacting(true)
    window.setTimeout(() => setReacting(false), 420)
  }

  const onBubbleMiss = () => {
    arcadeHit(false)
  }

  useEffect(() => {
    if (!s.event) return
    const choices = s.event.choices
    const onKey = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1
      const c = choices[idx]
      if (c) chooseStreamEvent(c.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.event, chooseStreamEvent])

  const showCam = formatNeedsWebcam(s.contentType)
  const showHint = s.tutorial && s.elapsed < 6
  const myScore = battleScore(state)
  const battleShare = s.battle ? myScore / Math.max(1, myScore + s.battle.rivalScore) : 0.5

  return (
    <div className={`screen stream-screen landscape content-${s.contentType} ${showCam ? 'with-cam' : 'no-cam'}`}>
      <div className="obs-grid wide">
        <div className={`obs-main live-stage ${showCam ? '' : 'full-capture'}`}>
          <StreamOverlays />
          <GameCapture onBubblePop={onBubblePop} onBubbleMiss={onBubbleMiss} disabled={state.paused} />
          {showCam && (
            <div className="obs-webcam-slot compact">
              <WebcamPanel reacting={reacting} />
            </div>
          )}
          {showHint && (
            <div className="tutorial-hint" aria-live="polite">
              <strong>Лопай шарики!</strong>
              <span>Быстрые попадания подряд = комбо, а горячий чат донатит щедрее</span>
            </div>
          )}
          {s.weekend && <div className="weekend-badge">САБАТОН · донаты продлевают эфир</div>}
          {s.battle && (
            <div className={`battle-bar ${myScore >= s.battle.rivalScore ? 'lead' : 'behind'}`}>
              <span className="battle-me">Ты {myScore}</span>
              <div className="battle-track">
                <i style={{ width: `${battleShare * 100}%` }} />
              </div>
              <span className="battle-rival">
                {Math.round(s.battle.rivalScore)} {s.battle.name}
              </span>
            </div>
          )}
        </div>

        <aside className="obs-side slim">
          <div className="side-live-stats">
            <div>
              <span>Зрители</span>
              <strong>{Math.floor(s.viewers)}</strong>
            </div>
            <div>
              <span>В чате</span>
              <strong>{s.chatters?.length || Math.max(1, Math.floor(s.viewers * 0.8))}</strong>
            </div>
            <div>
              <span>Таймер</span>
              <strong>{left}с</strong>
            </div>
            <div className={s.combo >= 5 ? 'hot' : ''}>
              <span>Комбо</span>
              <strong>x{s.combo}</strong>
            </div>
            <div>
              <span>В бюджет</span>
              <strong>{Math.floor(s.donations)}₽</strong>
            </div>
          </div>

          <div className="progress-track" aria-hidden>
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (s.elapsed / s.duration) * 100)}%` }}
            />
          </div>
          <label className="bar-label">Хайп</label>
          <div className="progress-track hype">
            <div className="progress-fill hype-fill" style={{ width: `${Math.min(100, s.hype)}%` }} />
          </div>
          <label className="bar-label">Усталость · растёт со временем и от промахов</label>
          <div className="progress-track fatigue">
            <div className="progress-fill fatigue-fill" style={{ width: `${s.fatigue}%` }} />
          </div>

          <div className="chat-panel obs-chat" aria-live="polite">
            {s.chat.map((m) => (
              <p key={m.id} className={`chat-line chat-${m.kind}`}>
                <strong>{m.user}</strong>: {m.text}
              </p>
            ))}
          </div>
        </aside>
      </div>

      <div className="alerts-stack">
        {s.alerts.map((a) => (
          <div key={a.id} className={`stream-alert alert-${a.tone}`}>
            {a.text}
          </div>
        ))}
      </div>

      {s.event && (
        <div className="event-card" role="dialog" aria-label="Событие эфира">
          <div className="event-timer">
            <i style={{ width: `${Math.max(0, (s.eventTtl / EVENT_TTL) * 100)}%` }} />
          </div>
          <p className="event-kind">Событие · {Math.ceil(s.eventTtl)}с</p>
          <p className="event-text">{s.event.text}</p>
          <div className="event-choices">
            {s.event.choices.map((c, i) => (
              <button key={c.id} type="button" className="btn" onClick={() => chooseStreamEvent(c.id)}>
                <kbd>{i + 1}</kbd>
                {c.label}
                {c.chance !== undefined && <em className="event-chance">{Math.round(c.chance * 100)}%</em>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
