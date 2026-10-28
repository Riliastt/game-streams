import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export type HypeBubble = {
  id: number
  x: number
  y: number
  ttl: number
  maxTtl: number
  size: number
  kind: 'hype' | 'gold' | 'rare'
}

type Props = {
  active: boolean
  paused?: boolean
  combo: number
  disabled?: boolean
  onPop: (kind: HypeBubble['kind']) => void
  onMiss?: () => void
}

let bubbleSeq = 1

export function HypeBubbles({ active, paused, combo, disabled, onPop, onMiss }: Props) {
  const [bubbles, setBubbles] = useState<HypeBubble[]>([])
  const onMissRef = useRef(onMiss)
  onMissRef.current = onMiss
  const bubblesRef = useRef(bubbles)
  bubblesRef.current = bubbles

  const comboRef = useRef(combo)
  comboRef.current = combo

  // Self-rescheduling timer that reads combo from a ref: restarting on every
  // combo change would spawn a bubble per pop and remove the pacing limit.
  useEffect(() => {
    if (!active || paused) return
    let timer = 0
    const spawn = () => {
      const combo = comboRef.current
      setBubbles((list) => {
        if (list.length >= 4) return list
        const maxTtl = 2.1 - Math.min(0.5, combo * 0.04)
        const roll = Math.random()
        const kind: HypeBubble['kind'] = roll > 0.92 ? 'rare' : roll > 0.72 ? 'gold' : 'hype'
        return [
          ...list,
          {
            id: bubbleSeq++,
            x: 12 + Math.random() * 70,
            y: 18 + Math.random() * 55,
            ttl: maxTtl,
            maxTtl,
            size: 42 + Math.random() * 22,
            kind,
          },
        ]
      })
    }
    const schedule = () => {
      const base = Math.max(750, 1600 - comboRef.current * 60)
      timer = window.setTimeout(() => {
        spawn()
        schedule()
      }, base + Math.random() * 500)
    }
    spawn()
    schedule()
    return () => clearTimeout(timer)
  }, [active, paused])

  useEffect(() => {
    if (!active || paused) return
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const cur = bubblesRef.current
      let missed = 0
      const next: HypeBubble[] = []
      for (const b of cur) {
        const ttl = b.ttl - dt
        if (ttl <= 0) missed += 1
        else next.push({ ...b, ttl })
      }
      if (missed || next.length !== cur.length || next.some((b, i) => b.ttl !== cur[i]?.ttl)) {
        setBubbles(next)
      }
      if (missed) {
        for (let i = 0; i < missed; i++) onMissRef.current?.()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, paused])

  const pop = (b: HypeBubble, e: ReactPointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (disabled) return
    setBubbles((list) => list.filter((x) => x.id !== b.id))
    onPop(b.kind)
  }

  if (!active) return null

  return (
    <div className="hype-bubbles">
      {bubbles.map((b) => {
        const life = b.ttl / b.maxTtl
        return (
          <button
            key={b.id}
            type="button"
            className={`hype-bubble kind-${b.kind} ${life < 0.35 ? 'urgent' : ''}`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              ['--life' as string]: life,
            }}
            onPointerDown={(e) => pop(b, e)}
            disabled={disabled}
            aria-label="Хайп-шарик"
          >
            <span className="hb-core" />
            <span className="hb-ring" />
            {b.kind === 'gold' && <em>₽</em>}
            {b.kind === 'rare' && <em>★</em>}
            {b.kind === 'hype' && <em>!</em>}
          </button>
        )
      })}
    </div>
  )
}
