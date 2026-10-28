import staffData from '../data/staff.json'
import { isGameLocked } from './endings'
import { rankId } from './ranks'
import type { GameState } from './state'

export type StaffDef = {
  id: string
  name: string
  description: string
  baseCost: number
  maxLevel: number
  minRank: number
  effects: Record<string, number>
}

export const STAFF = staffData as unknown as StaffDef[]

export function staffLevel(state: GameState, id: string): number {
  return state.staff[id] ?? 0
}

export function staffCost(def: StaffDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(1.7, level))
}

export function sumStaffEffect(state: GameState, key: string): number {
  let total = 0
  for (const def of STAFF) {
    const level = staffLevel(state, def.id)
    if (!level) continue
    const v = def.effects[key]
    if (v) total += v * level
  }
  return total
}

export function canHire(state: GameState, id: string): boolean {
  if (isGameLocked(state) || state.stream.active) return false
  const def = STAFF.find((s) => s.id === id)
  if (!def) return false
  const level = staffLevel(state, id)
  if (level >= def.maxLevel) return false
  if (rankId(state) < def.minRank) return false
  return state.money >= staffCost(def, level)
}

export function hireStaff(state: GameState, id: string): GameState {
  const def = STAFF.find((s) => s.id === id)
  if (!def || !canHire(state, id)) return state
  const level = staffLevel(state, id)
  const cost = staffCost(def, level)
  return {
    ...state,
    money: state.money - cost,
    staff: { ...state.staff, [id]: level + 1 },
  }
}

export function applyDailyStaffPassive(state: GameState): GameState {
  const subs = Math.floor(sumStaffEffect(state, 'passiveSubs'))
  const money = Math.floor(sumStaffEffect(state, 'passiveMoney'))
  if (!subs && !money) return state
  return {
    ...state,
    subscribers: state.subscribers + subs,
    money: state.money + money,
  }
}
