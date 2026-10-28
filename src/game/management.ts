import {
  baseViewers,
  computeMaxEnergy,
  CONTENT_TYPES,
  membershipDailyIncome,
  type UpgradeDef,
  upgradeCost,
  upgradeLevel,
  UPGRADES,
} from './economy'
import { checkFailEndings, isGameLocked } from './endings'
import { gearLevel } from './gear'
import { ensureDailyQuests, unlockAchievements } from './quests'
import { applyDailyStaffPassive, sumStaffEffect } from './staff'
import { decayFormatSkills } from './formatSkills'
import { syncFeaturedGames } from './games'
import { rollSponsorsForNewDay } from './streamPlan'
import { advanceRivals } from './rivals'
import { rollBattleOffer } from './battle'
import { maybeStartDrama } from './drama'
import { decayFanMood } from './regulars'
import { STAFF, staffLevel } from './staff'
import { getStudio } from './studio'
import type { ContentType, DayPhase, GameState } from './state'
import { clamp, createInitialState } from './state'
import { rankId } from './ranks'

export function phaseLabel(phase: DayPhase): string {
  switch (phase) {
    case 'stream':
      return 'Стрим'
    case 'produce':
      return 'Продакшн'
    case 'manage':
      return 'Студия'
  }
}

export function phaseHint(phase: DayPhase): string {
  switch (phase) {
    case 'stream':
      return 'Выйди в эфир — сегодня это главная роль.'
    case 'produce':
      return 'Выпусти ролик или клип, либо сразу перейди к студии.'
    case 'manage':
      return 'Прокачай железо/команду и ляг спать — день закроется.'
  }
}

export type UpkeepBreakdown = { rent: number; salaries: number; gear: number; total: number }

export function upkeepBreakdown(state: GameState): UpkeepBreakdown {
  const gearTier =
    (gearLevel(state, 'cam') +
      gearLevel(state, 'mic') +
      gearLevel(state, 'lights') +
      gearLevel(state, 'pc')) /
    4
  const rent = getStudio(state).rent + Math.floor(state.day * 0.5)
  const salaries = Math.round(
    STAFF.reduce((sum, def) => sum + def.baseCost * 0.06 * staffLevel(state, def.id), 0),
  )
  const gear = Math.round(gearTier * 4)
  return { rent, salaries, gear, total: rent + salaries + gear }
}

export function dailyUpkeep(state: GameState): number {
  return upkeepBreakdown(state).total
}

export function canUseContentType(state: GameState, contentType: ContentType): boolean {
  if (contentType === 'collab') {
    return state.flags.includes('collab') || state.flags.includes('nexus_collab') || state.subscribers >= 100
  }
  if (contentType === 'vlog') return state.subscribers >= 25 || state.streamsDone >= 2
  if (contentType === 'shorts') return state.subscribers >= 40 || state.videosUploaded >= 1
  return true
}

export function setContentType(state: GameState, contentType: ContentType): GameState {
  if (state.stream.active || isGameLocked(state)) return state
  if (state.dayPhase !== 'manage' && state.dayPhase !== 'stream') return state
  if (!canUseContentType(state, contentType)) return state
  return { ...state, contentType }
}

export function buyUpgrade(state: GameState, upgradeId: string): GameState {
  if (isGameLocked(state) || state.stream.active) return state
  const def = UPGRADES.find((u) => u.id === upgradeId)
  if (!def) return state
  const level = upgradeLevel(state, upgradeId)
  if (level >= def.maxLevel) return state
  const discount = Math.min(0.35, sumStaffEffect(state, 'upgradeDiscount'))
  const cost = Math.round(upgradeCost(def, level) * (1 - discount))
  if (state.money < cost) return state

  const next: GameState = {
    ...state,
    money: state.money - cost,
    upgrades: { ...state.upgrades, [upgradeId]: level + 1 },
  }
  next.maxEnergy = computeMaxEnergy(next)
  next.energy = clamp(next.energy, 0, next.maxEnergy)
  return unlockAchievements(next)
}

export function advanceAfterStream(state: GameState): GameState {
  return {
    ...state,
    dayPhase: 'produce',
    dayFlags: { ...state.dayFlags, streamed: true },
    daysWithoutStream: 0,
  }
}

export function skipToManage(state: GameState): GameState {
  if (isGameLocked(state) || state.dayPhase !== 'produce') return state
  return { ...state, dayPhase: 'manage' }
}

export function restDay(state: GameState): GameState {
  if (state.stream.active || isGameLocked(state)) return state
  if (state.dayPhase !== 'manage') return state

  const upkeep = dailyUpkeep(state)
  let money = state.money - upkeep
  let debtDays = money < 0 ? state.debtDays + 1 : 0
  const streamedToday = state.dayFlags.streamed
  const daysWithoutStream = streamedToday ? 0 : state.daysWithoutStream + 1

  let next: GameState = {
    ...state,
    streamStreak: streamedToday ? (state.streamStreak || 0) + 1 : 0,
    day: state.day + 1,
    energy: state.maxEnergy,
    hype: Math.max(0, Math.floor(state.hype * 0.85)),
    burnout: clamp(state.burnout - 28, 0, 100),
    toxicity: clamp(state.toxicity - 8, 0, 100),
    money,
    debtDays,
    daysWithoutStream,
    dayPhase: 'stream',
    dayFlags: { streamed: false, produced: false },
    dayStartMoney: money,
    dayStartSubs: state.subscribers,
  }
  next = applyDailyStaffPassive(next)
  const memberPay = membershipDailyIncome(next)
  if (memberPay > 0) {
    next = { ...next, money: next.money + memberPay }
  }
  if (next.membershipOpen && next.subscribers > 50) {
    const gain = Math.max(0, Math.floor(next.subscribers * 0.01) + (Math.random() < 0.4 ? 1 : 0))
    next = { ...next, members: next.members + gain }
  }
  next = decayFormatSkills(next)
  next = syncFeaturedGames(next)
  next = rollSponsorsForNewDay(next)
  next = advanceRivals(next)
  next = rollBattleOffer(next)
  next = maybeStartDrama(next)
  if (!streamedToday) next = decayFanMood(next)
  next = ensureDailyQuests(next)
  next = unlockAchievements(next)
  return checkFailEndings(next)
}

export function openMembership(state: GameState): GameState {
  if (isGameLocked(state) || state.stream.active) return state
  if (state.membershipOpen || state.subscribers < 80 || state.money < 100) return state
  return {
    ...state,
    money: state.money - 100,
    membershipOpen: true,
    members: Math.max(3, Math.floor(state.subscribers * 0.02)),
    flags: state.flags.includes('membership_on') ? state.flags : [...state.flags, 'membership_on'],
  }
}

export function uploadVideo(state: GameState): GameState {
  if (isGameLocked(state)) return state
  if (state.dayPhase !== 'produce') return state
  if (state.stream.active || state.energy < 1 || state.money < 20) return state
  const quality = 1 + (state.upgrades.software ?? 0) * 0.06 + (state.upgrades.editor ?? 0) * 0.08
  const soft = 1 / (1 + state.subscribers / 180)
  const subs = Math.max(
    1,
    Math.round((2.5 + state.hype * 0.02 + state.subscribers * 0.008) * quality * soft),
  )
  const money = Math.round(8 + state.subscribers * 0.015)
  return {
    ...state,
    energy: state.energy - 1,
    money: state.money - 20 + money,
    subscribers: state.subscribers + subs,
    hype: state.hype + 4,
    videosUploaded: state.videosUploaded + 1,
    burnout: clamp(state.burnout + 3, 0, 100),
    dayPhase: 'manage',
    dayFlags: { ...state.dayFlags, produced: true },
  }
}

/** Rewarded-ad bonus: one extra stream per in-game day, granted from the studio phase. */
export function canBonusStream(state: GameState): boolean {
  return (
    !isGameLocked(state) &&
    state.dayPhase === 'manage' &&
    state.dayFlags.streamed &&
    !state.dayFlags.bonusStream &&
    !state.stream.active
  )
}

export function grantBonusStream(state: GameState): GameState {
  if (!canBonusStream(state)) return state
  return {
    ...state,
    dayPhase: 'stream',
    energy: Math.max(state.energy, 1),
    dayFlags: { ...state.dayFlags, bonusStream: true },
  }
}

export function refillEnergy(state: GameState, amount: number): GameState {
  if (isGameLocked(state)) return state
  return {
    ...state,
    energy: clamp(state.energy + amount, 0, state.maxEnergy),
  }
}

export function listUpgrades(): UpgradeDef[] {
  return UPGRADES
}

export function listContentTypes() {
  return CONTENT_TYPES
}

export function canAfford(state: GameState, upgradeId: string): boolean {
  const def = UPGRADES.find((u) => u.id === upgradeId)
  if (!def) return false
  const level = upgradeLevel(state, upgradeId)
  if (level >= def.maxLevel) return false
  const discount = Math.min(0.35, sumStaffEffect(state, 'upgradeDiscount'))
  const cost = Math.round(upgradeCost(def, level) * (1 - discount))
  return state.money >= cost
}

/** Daily paid promo: late-game money sink that converts cash into audience. */
export function promoCost(state: GameState): number {
  return Math.round(150 + state.subscribers * 0.6)
}

export function promoGain(state: GameState): number {
  return Math.round(4 + baseViewers(state) * 0.35)
}

export function canPromo(state: GameState): boolean {
  return (
    !isGameLocked(state) &&
    !state.stream.active &&
    state.streamsDone >= 3 &&
    !state.dayFlags.promo &&
    state.money >= promoCost(state)
  )
}

export function runPromo(state: GameState): GameState {
  if (!canPromo(state)) return state
  return {
    ...state,
    money: state.money - promoCost(state),
    subscribers: state.subscribers + promoGain(state),
    hype: state.hype + 5,
    dayFlags: { ...state.dayFlags, promo: true },
  }
}

export const PRESTIGE_MIN_RANK = 4

export function canRebrand(state: GameState): boolean {
  return !state.stream.active && rankId(state) >= PRESTIGE_MIN_RANK
}

/** Prestige: restart the channel, keep a permanent +10% per level and the fan album. */
export function rebrand(state: GameState): GameState {
  if (!canRebrand(state)) return state
  const fresh = createInitialState()
  return {
    ...fresh,
    prestige: (state.prestige || 0) + 1,
    fans: state.fans,
    achievements: state.achievements,
    seenScenes: state.seenScenes,
    unlockedThemes: state.unlockedThemes,
    themeId: state.themeId,
    soundEnabled: state.soundEnabled,
    channelName: state.channelName,
    channelNamed: state.channelNamed,
    loginDate: state.loginDate,
    loginStreak: state.loginStreak,
    adX2Date: state.adX2Date,
    adX2Count: state.adX2Count,
    streamsDone: 1,
    money: 30 + 100 * ((state.prestige || 0) + 1),
    memories: state.memories,
    dramasDone: state.dramasDone,
  }
}

export function renameChannel(state: GameState, name: string): GameState {
  if (isGameLocked(state)) return state
  const trimmed = name.trim().slice(0, 24)
  if (!trimmed || state.channelNamed) return state
  return unlockAchievements({
    ...state,
    channelName: trimmed,
    channelNamed: true,
  })
}

export function setTheme(state: GameState, themeId: string): GameState {
  if (isGameLocked(state) || state.stream.active) return state
  if (!state.unlockedThemes.includes(themeId)) return state
  return { ...state, themeId }
}

export function buyTheme(state: GameState, themeId: string, cost: number): GameState {
  if (isGameLocked(state) || state.stream.active) return state
  if (state.unlockedThemes.includes(themeId) || state.money < cost) return state
  return {
    ...state,
    money: state.money - cost,
    unlockedThemes: [...state.unlockedThemes, themeId],
    themeId,
  }
}
