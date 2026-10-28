import gamesData from '../data/games.json'
import { isGameLocked } from './endings'
import type { GameState } from './state'

export type GameTheme =
  | 'blocks'
  | 'lanes'
  | 'tactics'
  | 'crime'
  | 'storm'
  | 'agents'
  | 'bricks'
  | 'legends'

export type CatalogGame = {
  id: string
  name: string
  tagline: string
  price: number
  theme: GameTheme
  color: string
  avatar: string
  mods: {
    viewers: number
    donate: number
    hype: number
    fatigue: number
    combo: number
  }
  toxicityRisk: number
}

export const CATALOG = gamesData as unknown as CatalogGame[]

export function getGame(id: string): CatalogGame {
  return CATALOG.find((g) => g.id === id) ?? CATALOG[0]!
}

export function isGameUnlocked(state: GameState, game: CatalogGame): boolean {
  return state.unlockedGames.includes(game.id) || game.price <= 0
}

export function canBuyGame(state: GameState, gameId: string): boolean {
  if (isGameLocked(state)) return false
  const game = getGame(gameId)
  if (isGameUnlocked(state, game)) return false
  if (game.price <= 0) return false
  return state.money >= game.price
}

export function buyGame(state: GameState, gameId: string): GameState {
  if (!canBuyGame(state, gameId)) return state
  const game = getGame(gameId)
  return {
    ...state,
    money: state.money - game.price,
    unlockedGames: [...state.unlockedGames, game.id],
    selectedGameId: game.id,
  }
}

export function listGames(state: GameState): (CatalogGame & { unlocked: boolean })[] {
  return CATALOG.map((g) => ({ ...g, unlocked: isGameUnlocked(state, g) }))
}

export function selectGame(state: GameState, gameId: string): GameState {
  const game = getGame(gameId)
  if (!isGameUnlocked(state, game)) return state
  if (state.dayPhase !== 'manage' && state.dayPhase !== 'stream') return state
  return { ...state, selectedGameId: game.id }
}

export function gameMods(state: GameState) {
  const mods = { ...getGame(state.selectedGameId).mods }
  const feat = featuredGameHypeMult(state)
  if (feat > 1) {
    mods.hype = mods.hype * feat
    mods.viewers = mods.viewers * (1 + (feat - 1) * 0.35)
  }
  return mods
}

export function favoriteGameBonus(state: GameState): number {
  const counts = state.gamePlayCounts[state.selectedGameId] ?? 0
  return counts >= 3 ? 1.05 : 1
}

export function bumpGamePlay(state: GameState): GameState {
  const id = state.selectedGameId
  const prev = state.gamePlayCounts[id] ?? 0
  return {
    ...state,
    gamePlayCounts: { ...state.gamePlayCounts, [id]: prev + 1 },
  }
}

export function dismissCamTip(state: GameState): GameState {
  if (state.flags.includes('tip_cam_seen')) return state
  return { ...state, flags: [...state.flags, 'tip_cam_seen'] }
}

export function starterUnlockedIds(): string[] {
  return CATALOG.filter((g) => g.price <= 0).map((g) => g.id)
}

/** Week index from day (1–7 = week 0) */
export function weekIndex(day: number): number {
  return Math.floor(Math.max(0, day - 1) / 7)
}

export function biweekIndex(day: number): number {
  return Math.floor(Math.max(0, day - 1) / 14)
}

export function pickWeekGameId(day: number): string {
  const idx = weekIndex(day) % CATALOG.length
  return CATALOG[idx]!.id
}

export function pickNewReleaseGameId(day: number): string {
  // Rotate through paid titles as “new releases”
  const paid = CATALOG.filter((g) => g.price > 0)
  if (!paid.length) return CATALOG[0]!.id
  const idx = biweekIndex(day) % paid.length
  return paid[idx]!.id
}

/** Hype multiplier while playing featured titles */
export function featuredGameHypeMult(state: GameState): number {
  let m = 1
  if (state.weekGameId && state.selectedGameId === state.weekGameId) m += 0.18
  if (state.newReleaseGameId && state.selectedGameId === state.newReleaseGameId) m += 0.28
  return m
}

export function syncFeaturedGames(state: GameState): GameState {
  const weekGameId = pickWeekGameId(state.day)
  const newReleaseGameId = pickNewReleaseGameId(state.day)
  const prevWeek = state.weekGameId
  const prevNew = state.newReleaseGameId

  let hype = state.hype
  let unlocked = [...state.unlockedGames]
  const flags = [...state.flags]

  // New week → small news hype
  if (prevWeek && prevWeek !== weekGameId) {
    hype += 4
    if (!flags.includes(`week_${weekIndex(state.day)}`)) {
      flags.push(`week_${weekIndex(state.day)}`)
    }
  }

  // Every 2 weeks a “new game” drops — unlock free for a while and bump hype
  if (prevNew && prevNew !== newReleaseGameId) {
    hype += 12
    if (!unlocked.includes(newReleaseGameId)) {
      unlocked = [...unlocked, newReleaseGameId]
    }
    flags.push(`release_${biweekIndex(state.day)}`)
  } else if (!prevNew) {
    // first sync
    if (!unlocked.includes(newReleaseGameId)) unlocked = [...unlocked, newReleaseGameId]
  }

  return {
    ...state,
    weekGameId,
    newReleaseGameId,
    hype: Math.min(9999, hype),
    unlockedGames: unlocked,
    flags: Array.from(new Set(flags)),
  }
}
