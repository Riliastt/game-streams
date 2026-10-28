export type ScreenId =
  | 'hub'
  | 'stream'
  | 'upgrades'
  | 'story'
  | 'team'
  | 'quests'
  | 'games'
  | 'social'
  | 'rating'

export type DayPhase = 'stream' | 'produce' | 'manage'

export type ContentType = 'letsplay' | 'reacts' | 'irl' | 'collab' | 'vlog' | 'shorts'

export type StreamStyleId = 'calm' | 'energy' | 'chat' | 'pro'

export type SponsorContract = {
  id: string
  brand: string
  gameId: string
  minViewers: number
  reward: number
  deadlineDay: number
}

export type StreamEventKind =
  | 'question'
  | 'hate'
  | 'donate'
  | 'hype'
  | 'raid'
  | 'tech_fail'
  | 'sponsor_read'
  | 'mod_help'
  | 'clutch'
  | 'viral_moment'
  | 'chat_war'
  | 'super_fan'
  | 'algo_boost'
  | 'end_threat'
  | 'charity'
  | 'drama_bait'
  | 'stunt'
  | 'cozy'
  | 'hate_raid'

export type ChatMessage = {
  id: string
  user: string
  text: string
  kind: 'chat' | 'donate' | 'sub' | 'system' | 'hate' | 'fan'
}

export type StreamAlert = {
  id: string
  text: string
  tone: 'donate' | 'combo' | 'raid' | 'info' | 'hype'
  ttl: number
}

export type FloatText = {
  id: string
  text: string
  x: number
  y: number
  ttl: number
}

export type StreamRuntime = {
  active: boolean
  contentType: ContentType
  viewers: number
  donations: number
  hype: number
  fatigue: number
  clicks: number
  combo: number
  comboTimer: number
  elapsed: number
  duration: number
  event: StreamEvent | null
  chat: ChatMessage[]
  chatCooldown: number
  /** Unique active chat nicknames — sized ≈ viewers */
  chatters: string[]
  alerts: StreamAlert[]
  floats: FloatText[]
  peakCombo: number
  lastDonateAmount: number
  sticker: { id: string; text: string; ttl: number } | null
  /** Fate modifiers from mid-stream decisions */
  fateBonus: number
  endedEarly: boolean
  style: StreamStyleId
  title: string
  /** Sponsor payout earned on this stream (set at finish) */
  sponsorPaid: number
  sponsorBrand: string
  /** Events shown this stream (capped) */
  eventsSeen: number
  /** Seconds until the next event may roll */
  eventCooldown: number
  /** Seconds left to answer the current event before auto-resolve */
  eventTtl: number
  /** First-stream tutorial beats already fired (bitmask) */
  script: number
  tutorial: boolean
  weekend: boolean
  /** Fan recruited during this stream (nick) */
  newFan: string
  /** Donation goal for this stream (0 = none) */
  goalTarget: number
  goalTier: number
  goalHit: boolean
  battle: StreamBattle | null
  /** Superfans present in chat this stream */
  regulars: string[]
  /** Seconds until the next regular speaks */
  regularCooldown: number
  /** Fans who left the album at the end of this stream */
  fansLeft: string[]
}

export type StreamBattle = {
  rivalId: string
  name: string
  /** Player score = hype gained this stream */
  startHype: number
  rivalScore: number
  rivalRate: number
  won: boolean | null
  subsSwing: number
}

/** −100..100 axes: kind (добряк ↔ токсик), bold (безбашенный ↔ осторожный) */
export type Persona = { kind: number; bold: number }

export type DramaState = {
  id: string
  step: number
  /** Day the last step was answered (one step per day) */
  lastDay: number
  score: number
  subs: number
  /** Final outcome text once finished */
  outcome: string
}

export type EventChoice = {
  id: string
  label: string
  effect: 'good' | 'bad' | 'neutral'
  /** Success chance for risky choices; failure resolves as 'bad' */
  chance?: number
}

export type StreamEvent = {
  id: string
  kind: StreamEventKind
  text: string
  choices: EventChoice[]
}

export type Rival = {
  id: string
  name: string
  subs: number
  weekStartSubs: number
  growth: number
}

export type Fan = {
  nick: string
  rarity: 'common' | 'rare' | 'epic'
  day: number
  /** 0–100; below 20 the fan leaves */
  mood?: number
  streams?: number
  gone?: boolean
}

export type Project = {
  id: string
  type: 'clip' | 'shorts' | 'collab_pitch'
  finishesAt: number
  label: string
}

export type FeedMedium = 'clip' | 'video' | 'reel'

/** Clip / video / reel published to the channel feed after montage */
export type PublishedClip = {
  id: string
  title: string
  blurb: string
  avatar: string
  gameId: string
  format: ContentType
  kind: string
  medium: FeedMedium
  views: number
  peakViews: number
  earned: number
  pendingMoney: number
  rpm: number
  virality: number
  quality: number
  risk: number
  humor: number
  age: number
  boostMult: number
  boostUsed: boolean
  elements: string[]
  status: 'growing' | 'peaked' | 'dead'
}

export type DailyQuest = {
  id: string
  templateId: string
  title: string
  target: number
  progress: number
  rewardMoney: number
  rewardHype: number
  rewardEnergy: number
  claimed: boolean
  metric: 'streams' | 'clicks' | 'donations' | 'subscribers_gain' | 'money_gain' | 'combo'
}

export type GameState = {
  money: number
  subscribers: number
  reputation: number
  hype: number
  energy: number
  maxEnergy: number
  day: number
  streamsDone: number
  contentType: ContentType
  upgrades: Record<string, number>
  flags: string[]
  seenScenes: string[]
  pendingSceneId: string | null
  ending: string | null
  stream: StreamRuntime
  lastInterstitialAt: number
  soundEnabled: boolean
  paused: boolean
  updatedAt: number
  version: number
  channelName: string
  channelNamed: boolean
  themeId: string
  burnout: number
  toxicity: number
  staff: Record<string, number>
  projects: Project[]
  dailyQuests: DailyQuest[]
  questDay: number
  achievements: string[]
  dayStartSubs: number
  dayStartMoney: number
  bestCombo: number
  unlockedThemes: string[]
  selectedGameId: string
  unlockedGames: string[]
  gamePlayCounts: Record<string, number>
  /** Paid channel members (membership) */
  members: number
  membershipOpen: boolean
  videosUploaded: number
  /** Day role cycle: stream → produce → manage → sleep */
  dayPhase: DayPhase
  dayFlags: { streamed: boolean; produced: boolean; bonusStream?: boolean; promo?: boolean }
  debtDays: number
  daysWithoutStream: number
  /** Mastery 0–100 per stream format */
  formatSkills: Record<ContentType, number>
  /** Last calendar day this format was streamed (0 = never) */
  formatLastDay: Record<ContentType, number>
  /** Featured “game of the week” catalog id */
  weekGameId: string
  /** New release every ~2 weeks */
  newReleaseGameId: string
  /** Published clips gaining views / monetization */
  clipFeed: PublishedClip[]
  streamStyle: StreamStyleId
  streamTitle: string
  sponsorOffer: SponsorContract | null
  sponsorActive: SponsorContract | null
  sponsorsDone: number
  sponsorFails: number
  /** Consecutive in-game days with a stream */
  streamStreak: number
  lastRankSeen: number
  /** Real-calendar limits for rewarded x2 payouts */
  adX2Date: string
  adX2Count: number
  /** Real-calendar daily login gift */
  loginDate: string
  loginStreak: number
  studioTier: number
  rivals: Rival[]
  weekStartSubs: number
  fans: Fan[]
  prestige: number
  lastStreamMoney: number
  /** Chosen donation goal tier for the next stream (0 = none) */
  goalTier: number
  persona: Persona
  /** Week index of the last battle offer */
  battleWeek: number
  battleOffer: string | null
  battleArmed: string | null
  battlesWon: number
  battlesLost: number
  nemesisId: string
  /** Memorable stream moments fans bring up later */
  memories: string[]
  drama: DramaState | null
  dramaNextDay: number
  dramasDone: string[]
}

export const SAVE_VERSION = 13
export const BASE_MAX_ENERGY = 5
export const STREAM_DURATION = 50
export const ENERGY_COST = 1
export const CHAT_LIMIT = 28

export const FAIL_ENDINGS = [
  'ending_bankrupt',
  'ending_burnout',
  'ending_cancelled',
] as const

export function createInitialState(): GameState {
  return {
    money: 30,
    subscribers: 0,
    reputation: 5,
    hype: 0,
    energy: BASE_MAX_ENERGY,
    maxEnergy: BASE_MAX_ENERGY,
    day: 1,
    streamsDone: 0,
    contentType: 'letsplay',
    upgrades: {},
    flags: [],
    seenScenes: [],
    pendingSceneId: null,
    ending: null,
    stream: idleStream('letsplay'),
    lastInterstitialAt: 0,
    soundEnabled: true,
    paused: false,
    updatedAt: Date.now(),
    version: SAVE_VERSION,
    channelName: 'Новый канал',
    channelNamed: false,
    themeId: 'default',
    burnout: 0,
    toxicity: 0,
    staff: {},
    projects: [],
    dailyQuests: [],
    questDay: 0,
    achievements: [],
    dayStartSubs: 0,
    dayStartMoney: 30,
    bestCombo: 0,
    unlockedThemes: ['default'],
    selectedGameId: 'block_realm',
    unlockedGames: ['block_realm'],
    gamePlayCounts: {},
    members: 0,
    membershipOpen: false,
    videosUploaded: 0,
    dayPhase: 'stream',
    dayFlags: { streamed: false, produced: false },
    debtDays: 0,
    daysWithoutStream: 0,
    formatSkills: {
      letsplay: 0,
      reacts: 0,
      irl: 0,
      collab: 0,
      vlog: 0,
      shorts: 0,
    },
    formatLastDay: {
      letsplay: 0,
      reacts: 0,
      irl: 0,
      collab: 0,
      vlog: 0,
      shorts: 0,
    },
    weekGameId: 'block_realm',
    newReleaseGameId: 'brick_verse',
    clipFeed: [],
    streamStyle: 'calm',
    streamTitle: '',
    sponsorOffer: null,
    sponsorActive: null,
    sponsorsDone: 0,
    sponsorFails: 0,
    streamStreak: 0,
    lastRankSeen: 0,
    adX2Date: '',
    adX2Count: 0,
    loginDate: '',
    loginStreak: 0,
    studioTier: 0,
    rivals: [],
    weekStartSubs: 0,
    fans: [],
    prestige: 0,
    lastStreamMoney: 0,
    goalTier: 0,
    persona: { kind: 0, bold: 0 },
    battleWeek: -1,
    battleOffer: null,
    battleArmed: null,
    battlesWon: 0,
    battlesLost: 0,
    nemesisId: '',
    memories: [],
    drama: null,
    dramaNextDay: 12,
    dramasDone: [],
  }
}

export function idleStream(contentType: ContentType): StreamRuntime {
  return {
    active: false,
    contentType,
    viewers: 0,
    donations: 0,
    hype: 0,
    fatigue: 0,
    clicks: 0,
    combo: 0,
    comboTimer: 0,
    elapsed: 0,
    duration: STREAM_DURATION,
    event: null,
    chat: [],
    chatCooldown: 0,
    chatters: [],
    alerts: [],
    floats: [],
    peakCombo: 0,
    lastDonateAmount: 0,
    sticker: null,
    fateBonus: 0,
    endedEarly: false,
    style: 'calm',
    title: '',
    sponsorPaid: 0,
    sponsorBrand: '',
    eventsSeen: 0,
    eventCooldown: 8,
    eventTtl: 0,
    script: 0,
    tutorial: false,
    weekend: false,
    newFan: '',
    goalTarget: 0,
    goalTier: 0,
    goalHit: false,
    battle: null,
    regulars: [],
    regularCooldown: 4,
    fansLeft: [],
  }
}

export const MAX_EVENTS_PER_STREAM = 3
export const BATTLE_DURATION = 45
export const EVENT_TTL = 5
export const TUTORIAL_DURATION = 30
export const WEEKEND_DURATION = 60

/** Local calendar date as YYYY-MM-DD */
export function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function isWeekend(d = new Date()): boolean {
  const wd = d.getDay()
  return wd === 0 || wd === 6
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
