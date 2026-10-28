import { useEffect, useState } from 'react'
import { gearLevel, visualTier } from '../../game/gear'
import { useGame } from '../../game/GameContext'
import type { AvatarMood } from './AvatarFace'

const CAM_ART: Record<AvatarMood, string> = {
  idle: './art/streamer_cam.jpg',
  happy: './art/cam/happy.jpg',
  hype: './art/cam/hype.jpg',
  laugh: './art/cam/hype.jpg',
  shock: './art/cam/shock.jpg',
  tired: './art/cam/tired.jpg',
  focus: './art/cam/focus.jpg',
  talk: './art/cam/talk.jpg',
}

type Props = { reacting?: boolean }

function deriveMood(
  reacting: boolean,
  fatigue: number,
  combo: number,
  lastDonate: number,
  eventKind: string | undefined,
  stickerText: string | null,
): AvatarMood {
  if (eventKind === 'hate' || eventKind === 'end_threat' || eventKind === 'tech_fail') return 'shock'
  if (eventKind === 'clutch' || eventKind === 'viral_moment') return 'focus'
  if (eventKind === 'chat_war') return 'shock'
  if (stickerText === 'LOL' || stickerText === 'POG') return 'laugh'
  if (stickerText === '$$' || lastDonate > 0) return 'happy'
  if (combo >= 8) return 'hype'
  if (combo >= 4) return 'hype'
  if (fatigue > 70) return 'tired'
  if (reacting) return 'talk'
  if (eventKind === 'question' || eventKind === 'donate' || eventKind === 'super_fan') return 'talk'
  return 'idle'
}

export function WebcamPanel({ reacting }: Props) {
  const { state } = useGame()
  const cam = gearLevel(state, 'cam')
  const lights = gearLevel(state, 'lights')
  const room = gearLevel(state, 'room')
  const tier = visualTier(cam)
  const lightTier = visualTier(lights)
  const sticker = state.stream.sticker
  const s = state.stream

  const [moodHold, setMoodHold] = useState<AvatarMood | null>(null)
  const [donateFlash, setDonateFlash] = useState(0)

  useEffect(() => {
    if (s.lastDonateAmount > 0) setDonateFlash(s.lastDonateAmount)
  }, [s.lastDonateAmount, s.clicks])

  useEffect(() => {
    if (!donateFlash) return
    const t = window.setTimeout(() => setDonateFlash(0), 600)
    return () => clearTimeout(t)
  }, [donateFlash])

  const liveMood = deriveMood(
    Boolean(reacting),
    s.fatigue,
    s.combo,
    donateFlash,
    s.event?.kind,
    sticker?.text ?? null,
  )

  useEffect(() => {
    if (liveMood === 'idle') return
    setMoodHold(liveMood)
    const t = window.setTimeout(() => setMoodHold(null), 900)
    return () => clearTimeout(t)
  }, [liveMood, s.clicks, s.combo, sticker?.id, s.event?.id])

  const mood = moodHold ?? liveMood

  if (tier === 0) {
    return (
      <div className={`webcam-panel cam-0 room-${visualTier(room)} cartoon`}>
        <div className="webcam-nosignal">
          <span>NO SIGNAL</span>
          <small>Нет вебкамеры</small>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`webcam-panel live-gif cam-${tier} lights-${lightTier} room-${visualTier(room)} cartoon mood-${mood} ${reacting ? 'reacting' : ''}`}
    >
      <div className="webcam-frame avatar-stage">
        <img className="webcam-img" src={CAM_ART[mood]} alt="" draggable={false} />
        <div className="webcam-noise" aria-hidden />
        {tier >= 3 && <div className="ring-light ring-pulse" aria-hidden />}
        {sticker && <div className="cam-sticker">{sticker.text}</div>}
      </div>
      <div className="webcam-label">CAM {tier >= 3 ? 'HD+' : tier >= 2 ? 'HD' : 'LOW'}</div>
    </div>
  )
}
