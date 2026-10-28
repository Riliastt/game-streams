import { baseViewers } from './economy'
import { rankId } from './ranks'
import type { GameState } from './state'
import { todayKey } from './state'
import { forecastStream } from './streamPlan'

const OFFLINE_MIN_MS = 10 * 60 * 1000
export const OFFLINE_CAP_HOURS = 8

export type OfflineReport = { hours: number; money: number; subs: number }

/** VOD and clips keep earning while the player is away (capped at 8h ≈ 30% of a stream). */
export function computeOffline(state: GameState, now = Date.now()): OfflineReport | null {
  if (state.streamsDone < 1 || state.ending?.startsWith('ending_bankrupt')) return null
  const elapsed = now - state.updatedAt
  if (!Number.isFinite(elapsed) || elapsed < OFFLINE_MIN_MS) return null
  const hours = Math.min(OFFLINE_CAP_HOURS, elapsed / 3_600_000)
  const share = hours / OFFLINE_CAP_HOURS
  const money = Math.round(forecastStream(state).money * 0.3 * share)
  const subs = Math.round(baseViewers(state) * 0.5 * share)
  if (money < 1 && subs < 1) return null
  return { hours: Math.round(hours * 10) / 10, money, subs }
}

export function applyOffline(state: GameState, report: OfflineReport, doubled: boolean): GameState {
  const k = doubled ? 2 : 1
  return {
    ...state,
    money: state.money + report.money * k,
    subscribers: state.subscribers + report.subs * k,
  }
}

const LOGIN_REWARDS = [30, 40, 50, 70, 90, 120, 200]

export type LoginGift = { streak: number; money: number; hype: number; rewards: number[] }

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return todayKey(d)
}

export function loginRewardScale(state: GameState): number {
  return 1 + rankId(state) * 0.5
}

export function pendingLoginGift(state: GameState): LoginGift | null {
  if (state.streamsDone < 1) return null
  const today = todayKey()
  if (state.loginDate === today) return null
  const streak = state.loginDate === yesterdayKey() ? (state.loginStreak % 7) + 1 : 1
  const scale = loginRewardScale(state)
  const rewards = LOGIN_REWARDS.map((r) => Math.round(r * scale))
  return { streak, money: rewards[streak - 1]!, hype: streak === 7 ? 30 : 0, rewards }
}

export function claimLoginGift(state: GameState, gift: LoginGift): GameState {
  return {
    ...state,
    loginDate: todayKey(),
    loginStreak: gift.streak,
    money: state.money + gift.money,
    hype: state.hype + gift.hype,
  }
}

/** Rewarded x2 on stream payouts: up to 3 per real day. */
export const X2_DAILY_LIMIT = 3

export function x2Left(state: GameState): number {
  return state.adX2Date === todayKey() ? Math.max(0, X2_DAILY_LIMIT - state.adX2Count) : X2_DAILY_LIMIT
}

export function consumeX2(state: GameState): GameState {
  const today = todayKey()
  const count = state.adX2Date === today ? state.adX2Count + 1 : 1
  return { ...state, adX2Date: today, adX2Count: count }
}
