import { useEffect, useState } from 'react'

export type AvatarMood = 'idle' | 'talk' | 'hype' | 'shock' | 'happy' | 'tired' | 'focus' | 'laugh'

type Props = {
  mood: AvatarMood
  reacting?: boolean
  /** Stream format — changes look so non-letsplay isn’t “always Block Realm vibe” */
  format?: string
}

const LINES: Record<AvatarMood, string[]> = {
  idle: ['мм…', 'сейчас…', 'ок ок'],
  talk: ['смотрите!', 'чат, момент', 'вот так'],
  hype: ['ПОГНАЛИ!', 'ЭТО ИМБА', 'ГОООЛ!'],
  shock: ['ЧТО?!', 'нет нет нет', 'как так…'],
  happy: ['спасибо!', 'люблю чат', 'nice'],
  tired: ['усталь…', 'ещё чуть-чуть', 'кофе бы'],
  focus: ['фокус…', 'сейчас решу', 'один хп'],
  laugh: ['ахаха', 'лол', 'кринж'],
}

export function AvatarFace({ mood, reacting, format = 'letsplay' }: Props) {
  const [line, setLine] = useState('…')
  const [showLine, setShowLine] = useState(false)

  useEffect(() => {
    const pool = LINES[mood]
    setLine(pool[Math.floor(Math.random() * pool.length)] ?? '…')
    setShowLine(true)
    const t = window.setTimeout(() => setShowLine(false), mood === 'idle' ? 1200 : 1600)
    return () => clearTimeout(t)
  }, [mood, reacting])

  return (
    <div
      className={`avatar-face mood-${mood} format-${format} ${reacting ? 'hit' : ''} ${showLine ? 'speaking' : ''}`}
      aria-hidden
    >
      <div className="avatar-bg-glow" />
      <div className="avatar-monitor" aria-hidden>
        <div className="mon-screen" />
        <div className="mon-stand" />
      </div>

      {showLine && <div className="avatar-comment">{line}</div>}

      <div className="avatar-desk">
        <div className="avatar-keyboard">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="avatar-mic-base" />
      </div>

      <div className="avatar-body">
        <div className="avatar-shoulders">
          <div className="avatar-hoodie">
            <i className="draw left" />
            <i className="draw right" />
            <div className="hoodie-pocket" />
          </div>
        </div>

        <div className="avatar-neck" />

        <div className="avatar-head">
          <div className="avatar-ear left" />
          <div className="avatar-ear right" />
          <div className="avatar-headset">
            <span className="cup left" />
            <span className="cup right" />
            <span className="band" />
            <span className="boom" />
          </div>
          <div className="avatar-hair">
            <i className="bang a" />
            <i className="bang b" />
            <i className="bang c" />
          </div>
          <div className="avatar-face-plate">
            <div className="avatar-brow left" />
            <div className="avatar-brow right" />
            <div className="avatar-eyes">
              <span className="eye left">
                <i className="pupil" />
                <b className="shine" />
              </span>
              <span className="eye right">
                <i className="pupil" />
                <b className="shine" />
              </span>
            </div>
            <div className="avatar-nose" />
            <div className="avatar-mouth" />
            <div className="avatar-blush left" />
            <div className="avatar-blush right" />
          </div>
        </div>

        <div className="avatar-hands">
          <span className="hand left" />
          <span className="hand right" />
        </div>
      </div>
    </div>
  )
}
