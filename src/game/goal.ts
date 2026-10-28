import type { GameState } from './state'

export const GOAL_UNLOCK_STREAMS = 2

export type GoalTier = {
  id: number
  name: string
  /** Target = forecast donations × factor */
  factor: number
  subsBonus: number
  repWin: number
  repFail: number
}

export const GOAL_TIERS: GoalTier[] = [
  { id: 0, name: 'Без цели', factor: 0, subsBonus: 0, repWin: 0, repFail: 0 },
  { id: 1, name: 'Скромная', factor: 0.75, subsBonus: 0.15, repWin: 1, repFail: 0 },
  { id: 2, name: 'Смелая', factor: 1.25, subsBonus: 0.35, repWin: 1, repFail: -1 },
  { id: 3, name: 'Безумная', factor: 1.6, subsBonus: 0.7, repWin: 2, repFail: -2 },
]

const GOAL_NAMES = [
  'На новый микрофон',
  'На кресло мечты',
  'На пиццу для чата',
  'На апгрейд ПК',
  'На свет как у профи',
  'На оплату аренды',
]

export function getGoalTier(id: number): GoalTier {
  return GOAL_TIERS[id] ?? GOAL_TIERS[0]!
}

export function goalName(state: GameState): string {
  return GOAL_NAMES[(state.day + state.streamsDone) % GOAL_NAMES.length]!
}

export function goalTarget(forecastDonations: number, tier: number): number {
  const t = getGoalTier(tier)
  if (!t.factor) return 0
  return Math.max(30, Math.round((forecastDonations * t.factor) / 10) * 10)
}

export function goalsUnlocked(state: GameState): boolean {
  return state.streamsDone >= GOAL_UNLOCK_STREAMS
}
