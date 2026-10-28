type SfxKind = 'click' | 'donate' | 'combo' | 'level' | 'story' | 'ui'

/** CC0 «Heavenly Loop» — isaiah658 (OpenGameArt) */
const BGM_SRC = '/audio/bgm_calm.mp3'
const BGM_VOL = 0.22

let ctx: AudioContext | null = null
let muted = true
let bgm: HTMLAudioElement | null = null
let unlockBound = false

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

function ensureBgm(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!bgm) {
    bgm = new Audio(BGM_SRC)
    bgm.loop = true
    bgm.preload = 'auto'
    bgm.volume = muted ? 0 : BGM_VOL
  }
  return bgm
}

function bindUnlock(): void {
  if (unlockBound || typeof window === 'undefined') return
  unlockBound = true
  const unlock = () => {
    void ensureCtx()?.resume()
    const a = ensureBgm()
    if (a && !muted) void a.play().catch(() => {})
  }
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

export function setAudioMuted(value: boolean): void {
  muted = value
  const a = ensureBgm()
  if (a) {
    a.volume = muted ? 0 : BGM_VOL
    if (muted) a.pause()
    else void a.play().catch(() => bindUnlock())
  }
  if (!muted) void ensureCtx()?.resume()
}

export function playSfx(kind: SfxKind): void {
  if (muted) return
  const ac = ensureCtx()
  if (!ac) return
  void ac.resume()

  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)

  const map: Record<SfxKind, { f: number; d: number; type: OscillatorType; v: number }> = {
    click: { f: 420, d: 0.04, type: 'triangle', v: 0.05 },
    donate: { f: 660, d: 0.18, type: 'sine', v: 0.07 },
    combo: { f: 880, d: 0.12, type: 'square', v: 0.04 },
    level: { f: 520, d: 0.25, type: 'sine', v: 0.06 },
    story: { f: 300, d: 0.2, type: 'triangle', v: 0.05 },
    ui: { f: 240, d: 0.06, type: 'sine', v: 0.04 },
  }
  const conf = map[kind]
  osc.type = conf.type
  osc.frequency.setValueAtTime(conf.f, now)
  if (kind === 'donate' || kind === 'level') {
    osc.frequency.exponentialRampToValueAtTime(conf.f * 1.5, now + conf.d)
  }
  gain.gain.setValueAtTime(conf.v, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + conf.d)
  osc.start(now)
  osc.stop(now + conf.d + 0.02)

  // Kick BGM after first interaction if autoplay was blocked
  const a = ensureBgm()
  if (a && a.paused) void a.play().catch(() => {})
}

export function startBed(): void {
  const a = ensureBgm()
  if (!a) return
  a.volume = muted ? 0 : BGM_VOL
  if (muted) return
  void a.play().catch(() => bindUnlock())
}

export function stopBed(): void {
  if (!bgm) return
  bgm.pause()
  bgm.currentTime = 0
}
