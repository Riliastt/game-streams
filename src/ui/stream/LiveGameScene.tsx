import { useEffect, useRef, useState } from 'react'
import type { GameTheme } from '../../game/games'

type Props = {
  theme: GameTheme
  gameName: string
  gameColor: string
  clicks: number
  combo: number
  active: boolean
  onOutcome?: (hit: boolean) => void
}

type Burst = { id: number; x: number; y: number; kind: 'hit' | 'spark' | 'boom' }

export function LiveGameScene({
  theme,
  gameName,
  gameColor,
  clicks,
  combo,
  active,
  onOutcome,
}: Props) {
  const [bursts, setBursts] = useState<Burst[]>([])
  const [punch, setPunch] = useState(false)
  const onOutcomeRef = useRef(onOutcome)
  onOutcomeRef.current = onOutcome

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      const bid = Date.now()
      const kind: Burst['kind'] = Math.random() > 0.7 ? 'boom' : 'spark'
      setBursts((b) =>
        [...b, { id: bid, x: 12 + Math.random() * 76, y: 18 + Math.random() * 55, kind }].slice(-8),
      )
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== bid)), 900)
    }, 1600)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => {
    if (!clicks) return
    const hit = Math.random() < 0.6 + Math.min(0.25, combo * 0.04)
    const id = Date.now()
    const kind: Burst['kind'] = hit ? 'hit' : 'spark'
    setPunch(true)
    setBursts((b) =>
      [...b, { id, x: 25 + Math.random() * 50, y: 28 + Math.random() * 40, kind }].slice(-10),
    )
    onOutcomeRef.current?.(hit)
    const t = window.setTimeout(() => setPunch(false), 220)
    const t2 = window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 700)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
    }
  }, [clicks, combo])

  return (
    <div
      className={`live-game-scene theme-${theme} ${punch ? 'punch' : ''} ${combo >= 5 ? 'hot' : ''}`}
      style={{ ['--game-color' as string]: gameColor }}
      aria-hidden
    >
      <ThemeBackdrop theme={theme} />
      <div className="lgs-color-wash" />
      <div className="lgs-vignette" />
      <div className="lgs-scan" />

      <div className="lgs-fx-layer">
        {bursts.map((b) => (
          <span
            key={b.id}
            className={`lgs-burst ${b.kind}`}
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          />
        ))}
      </div>

      <div className="lgs-particles">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ ['--i' as string]: i }} />
        ))}
      </div>

      <div className="lgs-hud">
        <span className="lgs-chip">{gameName}</span>
        {combo > 1 && <span className="lgs-chip hot">x{combo}</span>}
      </div>
    </div>
  )
}

function ThemeBackdrop({ theme }: { theme: GameTheme }) {
  switch (theme) {
    case 'blocks':
      return (
        <div className="theme-stage blocks-stage">
          <div className="blocks-sky" />
          <div className="blocks-sun" />
          <div className="blocks-cloud c1" />
          <div className="blocks-cloud c2" />
          <div className="blocks-hill" />
          <div className="blocks-grid">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className={`cube c${i % 5}`} />
            ))}
          </div>
          <div className="blocks-creeper" />
        </div>
      )
    case 'lanes':
      return (
        <div className="theme-stage lanes-stage">
          <div className="lanes-map">
            <div className="lane top" />
            <div className="lane mid" />
            <div className="lane bot" />
            <div className="lane-tower t1" />
            <div className="lane-tower t2" />
            <div className="lane-ancient" />
            <div className="lane-hero" />
            <div className="lane-creep a" />
            <div className="lane-creep b" />
          </div>
          <div className="lanes-minimap" />
        </div>
      )
    case 'tactics':
      return (
        <div className="theme-stage tactics-stage">
          <div className="tac-floor" />
          <div className="tac-crate a" />
          <div className="tac-crate b" />
          <div className="tac-crosshair" />
          <div className="tac-smoke" />
          <div className="tac-timer">0:34</div>
        </div>
      )
    case 'crime':
      return (
        <div className="theme-stage crime-stage">
          <div className="crime-skyline" />
          <div className="crime-road" />
          <div className="crime-car" />
          <div className="crime-neon n1">OPEN</div>
          <div className="crime-neon n2">24/7</div>
          <div className="crime-wanted">★ ★ ★</div>
        </div>
      )
    case 'storm':
      return (
        <div className="theme-stage storm-stage">
          <div className="storm-island" />
          <div className="storm-ring" />
          <div className="storm-build b1" />
          <div className="storm-build b2" />
          <div className="storm-player" />
          <div className="storm-loot" />
        </div>
      )
    case 'agents':
      return (
        <div className="theme-stage agents-stage">
          <div className="agent-site" />
          <div className="agent-spike" />
          <div className="agent-abil a" />
          <div className="agent-abil b" />
          <div className="agent-reticle" />
        </div>
      )
    case 'bricks':
      return (
        <div className="theme-stage bricks-stage">
          <div className="brick-sky" />
          <div className="brick-plat p1" />
          <div className="brick-plat p2" />
          <div className="brick-avatar" />
          <div className="brick-coin a" />
          <div className="brick-coin b" />
          <div className="brick-portal" />
        </div>
      )
    case 'legends':
      return (
        <div className="theme-stage legends-stage">
          <div className="leg-lane" />
          <div className="leg-tower" />
          <div className="leg-champ" />
          <div className="leg-minion m1" />
          <div className="leg-minion m2" />
          <div className="leg-ult" />
          <div className="leg-dragon" />
        </div>
      )
  }
}
