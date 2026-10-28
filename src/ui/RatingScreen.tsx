import { useState } from 'react'
import { fansBonus, prestigeBonus } from '../game/economy'
import { FAN_ALBUM_SIZE, FAN_RARITY_BONUS, FAN_RARITY_LABEL } from '../game/fans'
import { useGame } from '../game/GameContext'
import { canRebrand, PRESTIGE_MIN_RANK } from '../game/management'
import { RANKS } from '../game/ranks'
import { daysLeftInWeek, weeklyBoard } from '../game/rivals'
import { StatsBar } from './StatsBar'
import { personaPerks, personaTitle } from '../game/persona'

function moodIcon(mood: number): string {
  return mood >= 70 ? '😊' : mood >= 40 ? '😐' : '😟'
}

function PersonaAxis({ left, right, value }: { left: string; right: string; value: number }) {
  return (
    <div className="persona-axis">
      <span>{left}</span>
      <div className="persona-track">
        <i style={{ left: `${(value + 100) / 2}%` }} />
      </div>
      <span>{right}</span>
    </div>
  )
}

export function RatingScreen() {
  const { state, setScreen, rebrandChannel } = useGame()
  const [confirm, setConfirm] = useState(false)
  const board = weeklyBoard(state)
  const fans = state.fans ?? []

  return (
    <div className="screen quests-screen landscape">
      <StatsBar />
      <div className="section-head">
        <button type="button" className="btn ghost" onClick={() => setScreen('hub')}>
          ← Студия
        </button>
        <h2>Рейтинг и фанаты</h2>
      </div>

      <div className="panel-split">
        <section className="block">
          <h3>Топ недели · итоги через {daysLeftInWeek(state)} дн.</h3>
          <div className="board-list">
            {board.map((r, i) => (
              <div key={r.id} className={`board-row ${r.isPlayer ? 'me' : ''}`}>
                <span className="board-place">{i + 1}</span>
                <strong>
                  {r.name}
                  {r.id === state.nemesisId && <em className="nemesis-tag"> враг</em>}
                </strong>
                <span className="muted">{r.subs.toLocaleString('ru-RU')} подп.</span>
                <b>+{r.gain.toLocaleString('ru-RU')}</b>
              </div>
            ))}
          </div>
          <p className="muted">
            Прирост подписчиков за неделю. Раз в неделю кто-то зовёт на баттл · побед {state.battlesWon} / поражений{' '}
            {state.battlesLost}
          </p>

          <h3>Твой образ · {personaTitle(state)}</h3>
          <div className="persona-axes">
            <PersonaAxis left="Токсик" right="Добряк" value={state.persona.kind} />
            <PersonaAxis left="Осторожный" right="Безбашенный" value={state.persona.bold} />
          </div>
          <ul className="teaser-list">
            {personaPerks(state).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>

          <h3>Ребрендинг</h3>
          <div className="upgrade-row">
            <div style={{ flex: 1 }}>
              <strong>
                Престиж {state.prestige || 0}
                {prestigeBonus(state) > 0 && ` · +${Math.round(prestigeBonus(state) * 100)}% к зрителям и донатам`}
              </strong>
              <p>
                С ранга «{RANKS[PRESTIGE_MIN_RANK]!.name}»: начни канал заново, сохранив фанатов и +10% навсегда за
                каждый ребрендинг. Образ сбрасывается — можно стать кем-то другим.
              </p>
            </div>
            {confirm ? (
              <div className="row">
                <button type="button" className="btn primary" onClick={rebrandChannel}>
                  Да, заново
                </button>
                <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>
                  Нет
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn accent"
                disabled={!canRebrand(state)}
                onClick={() => setConfirm(true)}
              >
                Ребрендинг
              </button>
            )}
          </div>
        </section>

        <section className="block grow">
          <h3>
            Суперфаны {fans.length}/{FAN_ALBUM_SIZE} · +{Math.round(fansBonus(state) * 100)}% к донатам
          </h3>
          {fans.length === 0 ? (
            <p className="muted">
              Отвечай на вопросы, принимай рейды и благодари суперфанов — зрители из чата будут становиться
              фанатами.
            </p>
          ) : (
            <div className="fan-grid">
              {fans.map((f) => (
                <div key={f.nick} className={`fan-card rarity-${f.rarity} ${f.gone ? 'gone' : ''}`}>
                  <strong>{f.nick}</strong>
                  <span>{f.gone ? 'Ушёл' : FAN_RARITY_LABEL[f.rarity]}</span>
                  <em>
                    {f.gone
                      ? 'чат его не замечал'
                      : `${moodIcon(f.mood ?? 70)} · ${f.streams ?? 0} эф. · ${FAN_RARITY_BONUS[f.rarity]}`}
                  </em>
                </div>
              ))}
              {Array.from({ length: Math.max(0, Math.min(8, FAN_ALBUM_SIZE - fans.length)) }, (_, i) => (
                <div key={`empty_${i}`} className="fan-card empty">
                  ?
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
