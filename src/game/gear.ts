import { upgradeLevel } from './economy'
import type { GameState } from './state'

export type GearKey = 'cam' | 'mic' | 'lights' | 'pc' | 'room'

export function gearLevel(state: GameState, key: GearKey): number {
  return upgradeLevel(state, key)
}

/** Visual tier 0–3 used by UI filters */
export function visualTier(level: number): 0 | 1 | 2 | 3 {
  if (level <= 0) return 0
  if (level === 1) return 1
  if (level <= 3) return 2
  return 3
}

export function streamQualityScore(state: GameState): number {
  const cam = gearLevel(state, 'cam')
  const pc = gearLevel(state, 'pc')
  const lights = gearLevel(state, 'lights')
  const mic = gearLevel(state, 'mic')
  return Math.min(100, cam * 18 + pc * 10 + lights * 12 + mic * 8)
}

export function streamQualityLabel(score: number): string {
  if (score < 25) return '360p'
  if (score < 50) return '480p'
  if (score < 75) return '720p'
  return '1080p'
}

export type GearStatus = 'none' | 'ok' | 'pro'

export function gearStatus(level: number): GearStatus {
  if (level <= 0) return 'none'
  if (level <= 2) return 'ok'
  return 'pro'
}

export function gearChecklist(state: GameState): { key: GearKey; label: string; level: number; status: GearStatus }[] {
  return [
    { key: 'cam', label: 'Вебка', level: gearLevel(state, 'cam'), status: gearStatus(gearLevel(state, 'cam')) },
    { key: 'mic', label: 'Мик', level: gearLevel(state, 'mic'), status: gearStatus(gearLevel(state, 'mic')) },
    { key: 'lights', label: 'Свет', level: gearLevel(state, 'lights'), status: gearStatus(gearLevel(state, 'lights')) },
    { key: 'pc', label: 'ПК', level: gearLevel(state, 'pc'), status: gearStatus(gearLevel(state, 'pc')) },
  ]
}

export function followerGoal(state: GameState): { current: number; target: number } {
  const targets = [20, 50, 100, 200, 350, 500, 800, 1200]
  const target = targets.find((t) => state.subscribers < t) ?? state.subscribers + 200
  return { current: state.subscribers, target }
}
