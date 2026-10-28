import { weekIndex } from './games'
import { ensureRivals } from './rivals'
import type { GameState, Rival, StreamBattle } from './state'
import { BATTLE_DURATION } from './state'

export const BATTLE_UNLOCK_STREAMS = 5

/** Rival with subscriber count closest to the player */
function closestRival(state: GameState): Rival | null {
  const rivals = ensureRivals(state).rivals
  if (!rivals.length) return null
  return [...rivals].sort(
    (a, b) => Math.abs(a.subs - state.subscribers) - Math.abs(b.subs - state.subscribers),
  )[0]!
}

export function getRival(state: GameState, id: string | null): Rival | null {
  if (!id) return null
  return state.rivals.find((r) => r.id === id) ?? null
}

/** Day rollover: once a week a rival throws down a challenge. */
export function rollBattleOffer(state: GameState): GameState {
  const week = weekIndex(state.day)
  if (state.battleOffer && state.battleWeek !== week) {
    state = { ...state, battleOffer: null }
  }
  if (state.streamsDone < BATTLE_UNLOCK_STREAMS) return state
  if (state.battleWeek === week || state.battleOffer || state.battleArmed) return state
  const dayInWeek = (state.day - 1) % 7
  // Usually mid-week; guaranteed by day 5 of the week
  if (dayInWeek < 4 && Math.random() > 0.4) return state
  const nemesis = getRival(state, state.nemesisId)
  const rival = nemesis && Math.random() < 0.5 ? nemesis : closestRival(state)
  if (!rival) return state
  return { ...state, battleOffer: rival.id, battleWeek: week }
}

export function acceptBattle(state: GameState): GameState {
  if (!state.battleOffer || state.stream.active) return state
  return { ...state, battleArmed: state.battleOffer, battleOffer: null }
}

export function declineBattle(state: GameState): GameState {
  if (!state.battleOffer) return state
  return { ...state, battleOffer: null, hype: Math.max(0, state.hype - 3) }
}

/**
 * Rival pace is tuned to an average player stream, so a good run wins.
 * `hypeGain` is the forecast hype earned over a regular-length stream.
 */
export function createBattle(state: GameState, hypeGain: number, startHype: number): StreamBattle | null {
  const rival = getRival(state, state.battleArmed)
  if (!rival) return null
  const nemesis = rival.id === state.nemesisId ? 1.08 : 1
  // Forecast models a cautious stream; real average play earns ~1.6× that hype
  const perSec = (hypeGain / 50) * 1.65 * (0.92 + Math.random() * 0.2) * nemesis
  return {
    rivalId: rival.id,
    name: rival.name,
    startHype,
    rivalScore: 0,
    rivalRate: Math.max(0.5, perSec),
    won: null,
    subsSwing: Math.max(6, Math.round(Math.min(rival.subs, state.subscribers) * 0.04 + 6)),
  }
}

export function battleScore(state: GameState): number {
  const b = state.stream.battle
  if (!b) return 0
  return Math.max(0, Math.round(state.stream.hype - b.startHype))
}

/** Rival gains score in bursts so the lead changes hands. */
export function tickBattle(state: GameState, dt: number): GameState {
  const b = state.stream.battle
  if (!b || b.won !== null) return state
  // Half fixed pace, half the player's own pace: keeps the race close for any skill level
  const playerPace = battleScore(state) / Math.max(6, state.stream.elapsed)
  const rate = b.rivalRate * 0.5 + playerPace * 0.5
  // 70% steady, 30% in bursts so the lead changes hands
  const surge = Math.random() < 0.15 * dt ? rate * (1 + Math.random() * 2) : 0
  const rivalScore = b.rivalScore + rate * 0.7 * dt * (0.6 + Math.random() * 0.8) + surge
  return { ...state, stream: { ...state.stream, battle: { ...b, rivalScore } } }
}

export function settleBattle(state: GameState): GameState {
  const b = state.stream.battle
  if (!b || b.won !== null) return state
  const won = battleScore(state) >= b.rivalScore
  return { ...state, stream: { ...state.stream, battle: { ...b, won } } }
}

export { BATTLE_DURATION }
