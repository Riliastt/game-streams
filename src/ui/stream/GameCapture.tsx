import { getGame } from '../../game/games'
import { gearLevel, streamQualityLabel, streamQualityScore, visualTier } from '../../game/gear'
import { CONTENT_TYPES } from '../../game/economy'
import { useGame } from '../../game/GameContext'
import { FormatCaptureScene } from './FormatCaptureScene'
import { HypeBubbles, type HypeBubble } from './HypeBubbles'
import { LiveGameScene } from './LiveGameScene'

type Props = {
  onBubblePop: (kind: HypeBubble['kind']) => void
  onBubbleMiss?: () => void
  disabled?: boolean
}

export function GameCapture({ onBubblePop, onBubbleMiss, disabled }: Props) {
  const { state } = useGame()
  const s = state.stream
  const game = getGame(state.selectedGameId)
  const pcTier = visualTier(gearLevel(state, 'pc'))
  const quality = streamQualityScore(state)
  const formatMeta = CONTENT_TYPES.find((c) => c.id === s.contentType)
  const formatName = formatMeta?.name ?? s.contentType
  const isLetsplay = s.contentType === 'letsplay'
  const accent = isLetsplay ? game.color : formatAccent(s.contentType)

  return (
    <div
      className={`game-capture live-play pc-${pcTier} format-${s.contentType} ${s.combo >= 5 ? 'pulsing' : ''}`}
      style={{ ['--game-color' as string]: accent }}
    >
      {isLetsplay ? (
        <LiveGameScene
          theme={game.theme}
          gameName={game.name}
          gameColor={game.color}
          clicks={s.clicks}
          combo={s.combo}
          active={s.active && !state.paused}
        />
      ) : (
        <FormatCaptureScene
          format={s.contentType}
          formatName={formatName}
          clicks={s.clicks}
          combo={s.combo}
          active={s.active && !state.paused}
        />
      )}
      <HypeBubbles
        active={s.active}
        paused={state.paused || Boolean(s.event)}
        combo={s.combo}
        disabled={disabled}
        onPop={onBubblePop}
        onMiss={onBubbleMiss}
      />
      <div className="game-noise" aria-hidden />
      {s.floats.map((f) => (
        <span
          key={f.id}
          className="float-text"
          style={{ left: `${f.x}%`, top: `${f.y}%`, opacity: Math.max(0, f.ttl) }}
        >
          {f.text}
        </span>
      ))}
      <div className="game-hud slim">
        <span className="game-format sticker-label">{isLetsplay ? game.name : formatName}</span>
        <span className="game-format muted-pill">{formatName}</span>
        <span className="game-quality">{streamQualityLabel(quality)}</span>
        <span className="game-format muted-pill tip-pill">Жми шарики!</span>
      </div>
    </div>
  )
}

function formatAccent(format: string): string {
  switch (format) {
    case 'reacts':
      return '#ff8fab'
    case 'irl':
      return '#6ec6ff'
    case 'collab':
      return '#c792ea'
    case 'vlog':
      return '#ffd166'
    case 'shorts':
      return '#ff6b6b'
    default:
      return '#e8a45a'
  }
}
