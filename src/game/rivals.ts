import type { GameState, Rival } from './state'

const RIVAL_SEEDS: { id: string; name: string; scale: number; base: number; growth: number }[] = [
  { id: 'neon', name: 'NeonKat', scale: 1.4, base: 30, growth: 0.05 },
  { id: 'baka', name: 'Бака-тян', scale: 0.7, base: 12, growth: 0.07 },
  { id: 'ramen', name: 'RamenGod', scale: 2.2, base: 70, growth: 0.035 },
  { id: 'volt', name: 'ВольтТВ', scale: 0.4, base: 4, growth: 0.09 },
  { id: 'nexus', name: 'Nexus', scale: 3.2, base: 160, growth: 0.03 },
]

export const WEEK_LENGTH = 7

export function ensureRivals(state: GameState): GameState {
  if (state.rivals?.length) return state
  const rivals: Rival[] = RIVAL_SEEDS.map((r) => {
    const subs = Math.round(state.subscribers * r.scale + r.base)
    return { id: r.id, name: r.name, subs, weekStartSubs: subs, growth: r.growth }
  })
  return { ...state, rivals, weekStartSubs: state.subscribers }
}

/** Day rollover: rivals grow; a new week resets weekly gains. */
export function advanceRivals(state: GameState): GameState {
  const base = ensureRivals(state)
  const newWeek = (base.day - 1) % WEEK_LENGTH === 0
  const rivals = base.rivals.map((r) => {
    const swing = 0.6 + Math.random() * 0.8
    const subs = Math.round(r.subs + (r.subs * r.growth + 2 + Math.random() * 4) * swing)
    return { ...r, subs, weekStartSubs: newWeek ? subs : r.weekStartSubs }
  })
  return {
    ...base,
    rivals,
    weekStartSubs: newWeek ? base.subscribers : base.weekStartSubs,
  }
}

export type BoardRow = { id: string; name: string; gain: number; subs: number; isPlayer: boolean }

export function weeklyBoard(state: GameState): BoardRow[] {
  const s = ensureRivals(state)
  const rows: BoardRow[] = s.rivals.map((r) => ({
    id: r.id,
    name: r.name,
    gain: r.subs - r.weekStartSubs,
    subs: r.subs,
    isPlayer: false,
  }))
  rows.push({
    id: 'me',
    name: s.channelName,
    gain: s.subscribers - (s.weekStartSubs || 0),
    subs: s.subscribers,
    isPlayer: true,
  })
  return rows.sort((a, b) => b.gain - a.gain)
}

export function daysLeftInWeek(state: GameState): number {
  return WEEK_LENGTH - ((state.day - 1) % WEEK_LENGTH)
}

export function randomRivalName(state: GameState): string {
  const list = state.rivals?.length ? state.rivals : RIVAL_SEEDS
  return list[Math.floor(Math.random() * list.length)]!.name
}
