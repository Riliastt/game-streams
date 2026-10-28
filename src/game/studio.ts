import { isGameLocked } from './endings'
import { rankId } from './ranks'
import type { GameState } from './state'

export type StudioDef = {
  tier: number
  name: string
  cost: number
  rent: number
  minRank: number
  viewers: number
  hype: number
  blurb: string
}

export const STUDIOS: StudioDef[] = [
  { tier: 0, name: 'Комната', cost: 0, rent: 15, minRank: 0, viewers: 1, hype: 1, blurb: 'Стол у окна и мечта' },
  {
    tier: 1,
    name: 'Съёмная студия',
    cost: 1500,
    rent: 60,
    minRank: 2,
    viewers: 1.15,
    hype: 1.05,
    blurb: 'Звукоизоляция и нормальный свет',
  },
  {
    tier: 2,
    name: 'Офис',
    cost: 6000,
    rent: 180,
    minRank: 4,
    viewers: 1.3,
    hype: 1.12,
    blurb: 'Команда рядом, гости заходят на коллабы',
  },
  {
    tier: 3,
    name: 'Медиахаус',
    cost: 20000,
    rent: 500,
    minRank: 6,
    viewers: 1.5,
    hype: 1.2,
    blurb: 'Свой лофт, сцена и логотип на стене',
  },
]

export function getStudio(state: GameState): StudioDef {
  return STUDIOS[Math.min(STUDIOS.length - 1, Math.max(0, state.studioTier || 0))]!
}

export function nextStudio(state: GameState): StudioDef | null {
  return STUDIOS[(state.studioTier || 0) + 1] ?? null
}

export function canMoveStudio(state: GameState): boolean {
  const next = nextStudio(state)
  if (!next || isGameLocked(state) || state.stream.active) return false
  return rankId(state) >= next.minRank && state.money >= next.cost
}

export function moveStudio(state: GameState): GameState {
  const next = nextStudio(state)
  if (!next || !canMoveStudio(state)) return state
  return { ...state, money: state.money - next.cost, studioTier: next.tier }
}
