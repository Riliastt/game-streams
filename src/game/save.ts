import { emptyFormatLastDay, emptyFormatSkills } from './formatSkills'
import { createInitialState, SAVE_VERSION, type GameState, idleStream } from './state'
import { computeMaxEnergy } from './economy'
import { CATALOG, pickNewReleaseGameId, pickWeekGameId, starterUnlockedIds, syncFeaturedGames } from './games'
import { ensureDailyQuests, unlockAchievements } from './quests'
import { loadCloudSave, writeCloudSave } from '../yandex/player'
import { rankId } from './ranks'
import { ensureRivals } from './rivals'

const LOCAL_KEY = 'game_streams_save_v1'

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.money === 'number' && typeof v.subscribers === 'number' && typeof v.version === 'number'
}

export function migrateState(raw: Record<string, unknown>): GameState {
  const base = createInitialState()
  const version = typeof raw.version === 'number' ? raw.version : 1

  let merged: GameState = {
    ...base,
    ...(raw as unknown as GameState),
    upgrades: { ...((raw.upgrades as Record<string, number>) ?? {}) },
    flags: [...((raw.flags as string[]) ?? [])],
    seenScenes: [...((raw.seenScenes as string[]) ?? [])],
    staff: { ...((raw.staff as Record<string, number>) ?? {}) },
    projects: [...((raw.projects as GameState['projects']) ?? [])],
    dailyQuests: [...((raw.dailyQuests as GameState['dailyQuests']) ?? [])],
    achievements: [...((raw.achievements as string[]) ?? [])],
    unlockedThemes: [...((raw.unlockedThemes as string[]) ?? base.unlockedThemes)],
    unlockedGames: [...((raw.unlockedGames as string[]) ?? [])],
    gamePlayCounts: { ...((raw.gamePlayCounts as Record<string, number>) ?? {}) },
    selectedGameId: (raw.selectedGameId as string) || 'block_realm',
    members: Number(raw.members) || 0,
    membershipOpen: Boolean(raw.membershipOpen),
    videosUploaded: Number(raw.videosUploaded) || 0,
    dayPhase: (raw.dayPhase as GameState['dayPhase']) || 'stream',
    dayFlags: {
      streamed: Boolean((raw.dayFlags as GameState['dayFlags'] | undefined)?.streamed),
      produced: Boolean((raw.dayFlags as GameState['dayFlags'] | undefined)?.produced),
      bonusStream: Boolean((raw.dayFlags as GameState['dayFlags'] | undefined)?.bonusStream),
      promo: Boolean((raw.dayFlags as GameState['dayFlags'] | undefined)?.promo),
    },
    debtDays: Number(raw.debtDays) || 0,
    daysWithoutStream: Number(raw.daysWithoutStream) || 0,
    formatSkills: {
      ...emptyFormatSkills(),
      ...((raw.formatSkills as GameState['formatSkills']) ?? {}),
    },
    formatLastDay: {
      ...emptyFormatLastDay(),
      ...((raw.formatLastDay as GameState['formatLastDay']) ?? {}),
    },
    weekGameId: (raw.weekGameId as string) || pickWeekGameId(Number(raw.day) || 1),
    newReleaseGameId: (raw.newReleaseGameId as string) || pickNewReleaseGameId(Number(raw.day) || 1),
    clipFeed: Array.isArray(raw.clipFeed) ? (raw.clipFeed as GameState['clipFeed']) : [],
    stream: idleStream((raw.contentType as GameState['contentType']) ?? 'letsplay'),
    pendingSceneId: (raw.pendingSceneId as string | null) ?? null,
    paused: false,
    version: SAVE_VERSION,
  }

  if (version < 2) {
    merged.channelName = merged.channelName || 'Новый канал'
    merged.channelNamed = Boolean(raw.channelNamed)
    merged.themeId = (raw.themeId as string) || 'default'
    merged.burnout = Number(raw.burnout) || 0
    merged.toxicity = Number(raw.toxicity) || 0
    merged.bestCombo = Number(raw.bestCombo) || 0
    merged.questDay = Number(raw.questDay) || 0
  }

  if (version < 4) {
    const starters = starterUnlockedIds()
    merged.unlockedGames = Array.from(new Set([...starters, ...merged.unlockedGames]))
    if (!merged.selectedGameId) merged.selectedGameId = 'block_realm'
  }

  if (version < 5) {
    merged.members = Number(raw.members) || 0
    merged.membershipOpen = Boolean(raw.membershipOpen)
    merged.videosUploaded = Number(raw.videosUploaded) || 0
  }

  if (version < 6) {
    merged.dayPhase = (raw.dayPhase as GameState['dayPhase']) || 'stream'
    merged.dayFlags = {
      streamed: Boolean((raw.dayFlags as GameState['dayFlags'] | undefined)?.streamed),
      produced: Boolean((raw.dayFlags as GameState['dayFlags'] | undefined)?.produced),
    }
    merged.debtDays = Number(raw.debtDays) || 0
    merged.daysWithoutStream = Number(raw.daysWithoutStream) || 0
  }

  if (version < 7) {
    const starters = starterUnlockedIds()
    const known = new Set(CATALOG.map((g) => g.id))
    merged.unlockedGames = Array.from(
      new Set([...starters, ...merged.unlockedGames.filter((id) => known.has(id))]),
    )
    if (!known.has(merged.selectedGameId)) merged.selectedGameId = 'block_realm'
  }

  if (version < 8) {
    merged.formatSkills = {
      ...emptyFormatSkills(),
      ...((raw.formatSkills as GameState['formatSkills']) ?? {}),
    }
    merged.formatLastDay = {
      ...emptyFormatLastDay(),
      ...((raw.formatLastDay as GameState['formatLastDay']) ?? {}),
    }
  }

  if (version < 9) {
    merged.weekGameId = (raw.weekGameId as string) || pickWeekGameId(merged.day)
    merged.newReleaseGameId = (raw.newReleaseGameId as string) || pickNewReleaseGameId(merged.day)
    merged = syncFeaturedGames(merged)
  } else {
    merged.weekGameId = (raw.weekGameId as string) || pickWeekGameId(merged.day)
    merged.newReleaseGameId = (raw.newReleaseGameId as string) || pickNewReleaseGameId(merged.day)
  }

  if (version < 10) {
    merged.clipFeed = Array.isArray(raw.clipFeed) ? (raw.clipFeed as GameState['clipFeed']) : []
  }

  merged.clipFeed = (merged.clipFeed ?? []).map((c) => ({
    ...c,
    medium: c.medium === 'video' || c.medium === 'reel' ? c.medium : 'clip',
    pendingMoney: Number(c.pendingMoney) || 0,
    boostMult: Number(c.boostMult) || 1,
    boostUsed: Boolean(c.boostUsed),
    elements: Array.isArray(c.elements) ? c.elements : [],
    status: c.status === 'peaked' || c.status === 'dead' ? c.status : 'growing',
  }))

  const styles = ['calm', 'energy', 'chat', 'pro']
  if (!styles.includes(merged.streamStyle)) merged.streamStyle = 'calm'
  merged.streamTitle = typeof merged.streamTitle === 'string' ? merged.streamTitle.slice(0, 50) : ''
  merged.sponsorOffer = merged.sponsorOffer ?? null
  merged.sponsorActive = merged.sponsorActive ?? null
  merged.sponsorsDone = Number(merged.sponsorsDone) || 0
  merged.sponsorFails = Number(merged.sponsorFails) || 0

  merged.streamStreak = Number(merged.streamStreak) || 0
  merged.lastRankSeen = Number.isFinite(Number(raw.lastRankSeen)) ? Number(raw.lastRankSeen) : rankId(merged)
  merged.adX2Date = typeof merged.adX2Date === 'string' ? merged.adX2Date : ''
  merged.adX2Count = Number(merged.adX2Count) || 0
  merged.loginDate = typeof merged.loginDate === 'string' ? merged.loginDate : ''
  merged.loginStreak = Number(merged.loginStreak) || 0
  merged.studioTier = Math.max(0, Math.min(3, Number(merged.studioTier) || 0))
  merged.rivals = Array.isArray(merged.rivals) ? merged.rivals : []
  merged.weekStartSubs = Number(merged.weekStartSubs) || merged.subscribers
  merged.fans = Array.isArray(merged.fans) ? merged.fans : []
  merged.prestige = Number(merged.prestige) || 0
  merged.lastStreamMoney = Number(merged.lastStreamMoney) || 0
  merged.goalTier = Math.max(0, Math.min(3, Number(merged.goalTier) || 0))
  const persona = (raw.persona ?? {}) as Partial<GameState['persona']>
  merged.persona = { kind: Number(persona.kind) || 0, bold: Number(persona.bold) || 0 }
  merged.battleWeek = Number.isFinite(Number(raw.battleWeek)) ? Number(raw.battleWeek) : -1
  merged.battleOffer = typeof raw.battleOffer === 'string' ? raw.battleOffer : null
  merged.battleArmed = typeof raw.battleArmed === 'string' ? raw.battleArmed : null
  merged.battlesWon = Number(merged.battlesWon) || 0
  merged.battlesLost = Number(merged.battlesLost) || 0
  merged.nemesisId = typeof merged.nemesisId === 'string' ? merged.nemesisId : ''
  merged.memories = Array.isArray(merged.memories) ? merged.memories : []
  merged.drama = merged.drama && typeof merged.drama === 'object' ? merged.drama : null
  merged.dramaNextDay = Number(merged.dramaNextDay) || Math.max(12, merged.day + 5)
  merged.dramasDone = Array.isArray(merged.dramasDone) ? merged.dramasDone : []
  merged.fans = merged.fans.map((f) => ({ ...f, mood: f.mood ?? 70, streams: f.streams ?? 0 }))
  merged = ensureRivals(merged)

  // v12 rebalance: the old economy over-paid; trim hoarded cash so new sinks matter
  if (version < 12 && merged.money > 600) {
    merged.money = Math.round(600 + (merged.money - 600) * 0.3)
  }

  merged.maxEnergy = computeMaxEnergy(merged)
  merged.energy = Math.min(merged.energy, merged.maxEnergy)
  return unlockAchievements(ensureDailyQuests(merged))
}

export function sanitizeState(raw: GameState): GameState {
  return migrateState(raw as unknown as Record<string, unknown>)
}

export function saveLocal(state: GameState): void {
  const payload: GameState = { ...state, updatedAt: Date.now(), paused: false }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(payload))
}

export function loadLocal(): GameState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isGameState(parsed)) return null
    return sanitizeState(parsed)
  } catch {
    return null
  }
}

export async function loadBestSave(): Promise<GameState> {
  const local = loadLocal()
  const cloudRaw = await loadCloudSave()
  const cloud =
    cloudRaw && isGameState(cloudRaw) ? sanitizeState(cloudRaw as GameState) : null

  if (local && cloud) {
    return cloud.updatedAt >= local.updatedAt ? cloud : local
  }
  if (cloud) return cloud
  if (local) return local
  return ensureDailyQuests(createInitialState())
}

let cloudTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleCloudSave(state: GameState): void {
  if (cloudTimer) clearTimeout(cloudTimer)
  cloudTimer = setTimeout(() => {
    const payload = { ...state, updatedAt: Date.now(), paused: false }
    void writeCloudSave(payload as unknown as Record<string, unknown>)
  }, 1200)
}

export function persistAll(state: GameState): void {
  saveLocal(state)
  scheduleCloudSave(state)
}

export function resetSave(): GameState {
  localStorage.removeItem(LOCAL_KEY)
  return ensureDailyQuests(createInitialState())
}
