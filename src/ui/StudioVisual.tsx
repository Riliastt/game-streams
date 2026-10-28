import { useEffect, useRef } from 'react'
import { gearLevel, visualTier } from '../game/gear'
import { useGame } from '../game/GameContext'

const HERO_VIDEO = './art/studio/studio_hero_loop.mp4'
const HERO_STILL = './art/studio/studio_hero.jpg'

/** One animated neural studio scene — no CSS prop collage */
export function StudioVisual() {
  const { state } = useGame()
  const videoRef = useRef<HTMLVideoElement>(null)
  const camLv = gearLevel(state, 'cam')
  const micLv = gearLevel(state, 'mic')
  const lightsLv = gearLevel(state, 'lights')
  const pcLv = gearLevel(state, 'pc')
  const lightT = visualTier(lightsLv)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = true
    const play = () => {
      void el.play().catch(() => {
        /* autoplay can be blocked until interaction */
      })
    }
    play()
    el.addEventListener('canplay', play)
    return () => el.removeEventListener('canplay', play)
  }, [])

  return (
    <div className={`studio-visual hero-studio theme-${state.themeId} lights-${lightT}`}>
      <div className="studio-hero">
        <img className="studio-hero-fallback" src={HERO_STILL} alt="" draggable={false} />
        <video
          ref={videoRef}
          className="studio-hero-media"
          src={HERO_VIDEO}
          poster={HERO_STILL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className={`studio-glow lights-${lightT}`} aria-hidden />
      <div className="studio-badges">
        <span className={camLv > 0 ? 'on' : ''}>CAM {camLv || '—'}</span>
        <span className={micLv > 0 ? 'on' : ''}>MIC {micLv || '—'}</span>
        <span className={pcLv > 0 ? 'on' : ''}>PC {pcLv || '—'}</span>
        <span className={lightsLv > 0 ? 'on' : ''}>LIGHT {lightsLv || '—'}</span>
      </div>
      <div className="studio-meters">
        <span>Выгор. {Math.floor(state.burnout)}</span>
        <span>Токс. {Math.floor(state.toxicity)}</span>
      </div>
    </div>
  )
}
