import { CATALOG } from './games'
import type { GameState } from './state'

export const TRENDS_UNLOCK_DAY = 4

export type TrendPhase = 'rising' | 'peak' | 'falling' | 'dead'

export type TrendInfo = {
  phase: TrendPhase
  viewers: number
  subs: number
  /** Days until the next peak (0 = peaking now) */
  daysToPeak: number
}

export const TREND_LABEL: Record<TrendPhase, string> = {
  rising: '🌱 Набирает',
  peak: '🔥 Пик',
  falling: '📉 Спад',
  dead: '💀 Мёртв',
}

export const TREND_HINT: Record<TrendPhase, string> = {
  rising: 'Мало стримеров — новички находят тебя: много подписчиков',
  peak: 'Все смотрят: максимум зрителей, но конкуренция',
  falling: 'Интерес угасает',
  dead: 'Почти никто не ищет эту игру',
}

const PHASES: { phase: TrendPhase; days: number; viewers: number; subs: number }[] = [
  { phase: 'rising', days: 3, viewers: 1.05, subs: 1.25 },
  { phase: 'peak', days: 2, viewers: 1.25, subs: 1.05 },
  { phase: 'falling', days: 3, viewers: 0.92, subs: 0.85 },
  { phase: 'dead', days: 3, viewers: 0.82, subs: 0.72 },
]
const CYCLE = PHASES.reduce((s, p) => s + p.days, 0)

const NEUTRAL: TrendInfo = { phase: 'falling', viewers: 1, subs: 1, daysToPeak: 0 }

function cycleDay(gameId: string, day: number): number {
  const idx = Math.max(0, CATALOG.findIndex((g) => g.id === gameId))
  return (day + idx * 5) % CYCLE
}

export function trendsActive(state: GameState): boolean {
  return state.day >= TRENDS_UNLOCK_DAY
}

export function trendInfo(state: GameState, gameId: string, day = state.day): TrendInfo {
  if (day < TRENDS_UNLOCK_DAY) return NEUTRAL
  const d = cycleDay(gameId, day)
  let acc = 0
  const peakStart = PHASES[0]!.days
  for (const p of PHASES) {
    if (d < acc + p.days) {
      const daysToPeak = p.phase === 'peak' ? 0 : (peakStart - d + CYCLE) % CYCLE
      return { phase: p.phase, viewers: p.viewers, subs: p.subs, daysToPeak }
    }
    acc += p.days
  }
  return NEUTRAL
}

/** Trend multipliers for the game currently selected */
export function currentTrend(state: GameState): TrendInfo {
  return trendInfo(state, state.selectedGameId)
}
