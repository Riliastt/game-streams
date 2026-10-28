import { CONTENT_TYPES } from './economy'
import { isGameLocked } from './endings'
import { getGame, type GameTheme } from './games'
import type { ContentType, FeedMedium, GameState, PublishedClip } from './state'
import { clamp } from './state'

export type ClipKind = 'clutch' | 'funny' | 'chill' | 'spicy' | 'guide' | 'collab'

export type MontageId =
  | 'hook'
  | 'gameplay'
  | 'facecam'
  | 'chat'
  | 'sfx'
  | 'text'
  | 'slowmo'
  | 'cta'

export type { FeedMedium }

export const FEED_MEDIUM_LABEL: Record<FeedMedium, string> = {
  clip: 'Клип',
  video: 'Видео',
  reel: 'Рилс',
}

export const PRODUCE_COST: Record<FeedMedium, { money: number; energy: number }> = {
  clip: { money: 0, energy: 0 },
  video: { money: 20, energy: 1 },
  reel: { money: 60, energy: 0 },
}

export type ClipOffer = {
  id: string
  medium: FeedMedium
  kind: ClipKind
  title: string
  blurb: string
  avatar: string
  gameId: string
  gameName: string
  format: ContentType
  formatName: string
  stats: {
    virality: number
    quality: number
    risk: number
    humor: number
  }
  /** Soft estimate before montage */
  preview: {
    peakViews: number
    rpm: number
  }
}

export type MontageOption = {
  id: MontageId
  label: string
  blurb: string
  mods: {
    virality: number
    quality: number
    risk: number
    humor: number
    rpm: number
  }
}

const KIND_AVATAR: Record<ClipKind, string> = {
  clutch: './art/clips/clutch.jpg',
  funny: './art/clips/funny.jpg',
  chill: './art/clips/chill.jpg',
  spicy: './art/clips/spicy.jpg',
  guide: './art/clips/guide.jpg',
  collab: './art/clips/collab.jpg',
}

const THEME_MOMENTS: Record<GameTheme, Record<ClipKind, string>> = {
  blocks: {
    clutch: 'выживание у криперов',
    funny: 'падение в лаву',
    chill: 'уютный крафт на закате',
    spicy: 'гриферский скандал',
    guide: 'быстрый гайд по ферме',
    collab: 'совместный данж',
  },
  lanes: {
    clutch: 'клатч 1 на 3 на миде',
    funny: 'фейл росхана',
    chill: 'спокойный фарм линии',
    spicy: 'токсик после тимвайпа',
    guide: 'гайд по ротации',
    collab: 'дуо на саппорте',
  },
  tactics: {
    clutch: 'эко-раунд вытянут',
    funny: 'граната в тиммейта',
    chill: 'чистая тактика без суеты',
    spicy: 'спор из-за пика',
    guide: 'раскидка за 20 секунд',
    collab: 'стек с другом',
  },
  crime: {
    clutch: 'погоня на закате',
    funny: 'врезался в столб',
    chill: 'ночной драйв по городу',
    spicy: 'хаос в центре',
    guide: 'маршрут ограбления',
    collab: 'совместный угон',
  },
  storm: {
    clutch: 'победа в финальной зоне',
    funny: 'шторм застал врасплох',
    chill: 'лут и вайб на окраине',
    spicy: 'тильт после третьего места',
    guide: 'ротация в сейф-зону',
    collab: 'дуо в шторме',
  },
  agents: {
    clutch: 'клатч на точке',
    funny: 'ультимейт в стену',
    chill: 'аккуратная защита сайта',
    spicy: 'спор за агента',
    guide: 'лайн-ап для спелла',
    collab: 'синхронный пуш',
  },
  bricks: {
    clutch: 'победа в мини-игре',
    funny: 'обвал постройки',
    chill: 'спокойный билд',
    spicy: 'рейд чужой базы',
    guide: 'схема дома за минуту',
    collab: 'общий мир с другом',
  },
  legends: {
    clutch: 'пентакелл в тимфайтах',
    funny: 'в вспышку своих',
    chill: 'фарм и контроль',
    spicy: 'чат после фидера',
    guide: 'билд на мету',
    collab: 'бот-лейн дуо',
  },
}

const FORMAT_HOOK: Record<ContentType, string> = {
  letsplay: 'Летсплей',
  reacts: 'Реакты',
  irl: 'ИРЛ',
  collab: 'Коллаб',
  vlog: 'Влог',
  shorts: 'Shorts',
}

const MEDIUM_HOOK: Record<FeedMedium, string> = {
  clip: 'нарезка со стрима',
  video: 'полное видео',
  reel: 'вертикальный рилс',
}

const ALL_MONTAGE: MontageOption[] = [
  {
    id: 'hook',
    label: 'Хук в первые 2с',
    blurb: '+вирал, чуть риска',
    mods: { virality: 14, quality: 2, risk: 4, humor: 0, rpm: 0 },
  },
  {
    id: 'gameplay',
    label: 'Геймплей-кадр',
    blurb: 'Суть игры и жанра',
    mods: { virality: 6, quality: 10, risk: 0, humor: 0, rpm: 0.2 },
  },
  {
    id: 'facecam',
    label: 'Реакция с вебки',
    blurb: 'Эмоции стримера',
    mods: { virality: 8, quality: 4, risk: 2, humor: 6, rpm: 0.1 },
  },
  {
    id: 'chat',
    label: 'Оверлей чата',
    blurb: 'Живой вайб аудитории',
    mods: { virality: 5, quality: 1, risk: 3, humor: 8, rpm: 0 },
  },
  {
    id: 'sfx',
    label: 'Мем-звук',
    blurb: 'Юмор, но алгоритмы капризны',
    mods: { virality: 10, quality: -2, risk: 6, humor: 14, rpm: -0.1 },
  },
  {
    id: 'text',
    label: 'Текст-панч',
    blurb: 'Понятный контекст',
    mods: { virality: 7, quality: 6, risk: 1, humor: 2, rpm: 0.15 },
  },
  {
    id: 'slowmo',
    label: 'Слоу-мо',
    blurb: 'Киношность момента',
    mods: { virality: 9, quality: 8, risk: 0, humor: -2, rpm: 0.05 },
  },
  {
    id: 'cta',
    label: 'Призыв подписаться',
    blurb: 'Больше конверсии в ₽',
    mods: { virality: 2, quality: 3, risk: 1, humor: 0, rpm: 0.45 },
  },
]

const MAX_FEED = 10
const MAX_MONTAGE_PICKS = 3

function uid(prefix = 'clip'): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9999)}`
}

function formatName(format: ContentType): string {
  return CONTENT_TYPES.find((c) => c.id === format)?.name ?? format
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function pickKinds(format: ContentType, peakCombo: number, fate: number, theme: GameTheme): ClipKind[] {
  const pool: ClipKind[] = ['chill', 'funny']
  if (peakCombo >= 4 || fate > 3) pool.push('clutch')
  if (fate < -4 || format === 'reacts' || format === 'shorts') pool.push('spicy')
  if (format === 'collab') pool.push('collab')
  if (format === 'letsplay' || format === 'vlog') pool.push('guide')
  if (format === 'irl') pool.push('chill', 'guide')
  if (theme === 'lanes' || theme === 'agents' || theme === 'legends') pool.push('clutch')
  if (theme === 'crime' || theme === 'storm') pool.push('spicy', 'funny')
  if (theme === 'blocks' || theme === 'bricks') pool.push('guide', 'chill')

  return shuffle(Array.from(new Set(pool))).slice(0, 3)
}

function buildTitle(
  medium: FeedMedium,
  gameName: string,
  format: ContentType,
  kind: ClipKind,
  theme: GameTheme,
): { title: string; blurb: string } {
  const moment = THEME_MOMENTS[theme][kind]
  const formatLabel = FORMAT_HOOK[format]
  const mediumLabel = MEDIUM_HOOK[medium]
  if (medium === 'video') {
    return {
      title: `${gameName}: ${moment}`,
      blurb: `${formatLabel}-видео · ${moment}`,
    }
  }
  if (medium === 'reel') {
    return {
      title: `Рилс · ${moment}`,
      blurb: `${gameName} · ${formatLabel} · ${mediumLabel}`,
    }
  }
  return {
    title: `${gameName}: ${moment}`,
    blurb: `${formatLabel}-клип · ${moment}`,
  }
}

export function canStartContent(state: GameState, medium: FeedMedium): boolean {
  if (isGameLocked(state) || state.stream.active) return false
  if (medium === 'clip') return true
  // Video / reel available in stream or produce phase
  if (state.dayPhase !== 'stream' && state.dayPhase !== 'produce') return false
  const cost = PRODUCE_COST[medium]
  return state.money >= cost.money && state.energy >= cost.energy
}

/** Small early-game peaks; rare “shot” videos break out */
function rollPeakViews(args: {
  medium: FeedMedium
  audience: number
  virality: number
  quality: number
  streamViewers: number
}): { peakViews: number; viral: boolean } {
  const { medium, audience, virality, quality, streamViewers } = args
  const roll = Math.random()
  const viral = roll > 0.9
  const mega = roll > 0.975

  let base: number
  if (medium === 'video') {
    // Longform: dozens → low hundreds until you grow
    base = 6 + audience * 1.1 + quality * 0.08 + virality * 0.05
  } else if (medium === 'reel') {
    base = 12 + audience * 1.8 + virality * 0.2 + quality * 0.05
  } else {
    base = 8 + audience * 1.4 + streamViewers * 0.25 + virality * 0.12
  }

  let peak = base * (0.75 + Math.random() * 0.5)
  if (viral) {
    peak *= mega ? 9 + Math.random() * 10 : 3.2 + Math.random() * 2.8
  }
  return { peakViews: Math.max(5, Math.round(peak)), viral }
}

export function generateClipOffers(state: GameState, medium: FeedMedium = 'clip'): ClipOffer[] {
  const s = state.stream
  const game = getGame(state.selectedGameId)
  const format = (s.active || s.clicks > 0 ? s.contentType : null) || state.contentType
  const peakCombo = medium === 'clip' ? s.peakCombo : Math.max(2, Math.floor(state.bestCombo / 2))
  const fate = medium === 'clip' ? s.fateBonus : state.reputation
  const kinds = pickKinds(format, peakCombo, fate, game.theme)

  const streamPerf =
    medium === 'clip'
      ? 0.65 + s.clicks / 90 + s.hype / 130 + s.viewers / 70
      : 0.7 + state.hype / 160 + state.subscribers / 220 + (state.upgrades.software ?? 0) * 0.04
  const mediumBias = medium === 'reel' ? 1.12 : medium === 'video' ? 0.95 : 1
  const perf = Math.min(1.5, streamPerf * mediumBias + state.hype / 220)

  return kinds.map((kind) => {
    const { title, blurb } = buildTitle(medium, game.name, format, kind, game.theme)
    const baseViral =
      kind === 'spicy' || kind === 'funny' ? 48 : kind === 'clutch' ? 42 : kind === 'collab' ? 40 : 32
    const baseQuality = kind === 'guide' || kind === 'chill' ? 50 : 36
    const baseRisk = kind === 'spicy' ? 55 : kind === 'funny' ? 28 : 12
    const baseHumor = kind === 'funny' ? 62 : kind === 'spicy' ? 35 : 18

    let virality = clamp(
      Math.round((baseViral + perf * 22 + Math.random() * 12) * (0.9 + game.mods.hype * 0.1)),
      8,
      92,
    )
    let quality = clamp(Math.round(baseQuality + perf * 18 + Math.random() * 10), 10, 95)
    const risk = clamp(Math.round(baseRisk + game.toxicityRisk * 80 + Math.random() * 10), 0, 90)
    const humor = clamp(Math.round(baseHumor + Math.random() * 18), 5, 95)

    if (medium === 'video') {
      quality = clamp(quality + 8, 10, 95)
      virality = clamp(virality - 4, 8, 92)
    }
    if (medium === 'reel') {
      virality = clamp(virality + 10, 8, 95)
      quality = clamp(quality - 2, 10, 95)
    }

    const audience =
      1 + state.subscribers * 0.12 + state.streamsDone * 0.55 + state.hype * 0.04 + state.videosUploaded * 0.35
    const { peakViews } = rollPeakViews({
      medium,
      audience,
      virality,
      quality,
      streamViewers: medium === 'clip' ? s.viewers : 0,
    })
    // Low RPM early — viral hits still pay via volume
    const rpmBase = medium === 'video' ? 2.4 : medium === 'reel' ? 1.4 : 1.6
    const rpm =
      Math.round((rpmBase + quality * 0.025 + (format === 'shorts' || medium === 'reel' ? 0.25 : 0)) * 10) /
      10

    return {
      id: uid('idea'),
      medium,
      kind,
      title,
      blurb,
      avatar: KIND_AVATAR[kind],
      gameId: game.id,
      gameName: game.name,
      format,
      formatName: formatName(format),
      stats: { virality, quality, risk, humor },
      preview: { peakViews, rpm },
    }
  })
}

/** Montage choices tailored to medium + format + game theme */
export function montageOptionsFor(offer: ClipOffer): MontageOption[] {
  const ids = new Set<MontageId>(['hook', 'gameplay', 'text', 'cta'])
  if (offer.medium === 'video') {
    ids.add('facecam')
    ids.add('slowmo')
  }
  if (offer.medium === 'reel') {
    ids.add('sfx')
    ids.add('chat')
    ids.add('facecam')
  }
  if (offer.format === 'letsplay' || offer.format === 'shorts') ids.add('slowmo')
  if (offer.format === 'reacts' || offer.format === 'vlog' || offer.format === 'irl') ids.add('facecam')
  if (offer.format === 'collab' || offer.format === 'reacts') ids.add('chat')
  if (offer.kind === 'funny' || offer.kind === 'spicy') ids.add('sfx')
  if (offer.kind === 'clutch') ids.add('slowmo')
  if (offer.kind === 'guide') ids.add('text')

  const game = getGame(offer.gameId)
  if (game.theme === 'crime' || game.theme === 'storm') ids.add('sfx')
  if (game.theme === 'tactics' || game.theme === 'agents') ids.add('slowmo')

  return ALL_MONTAGE.filter((m) => ids.has(m.id))
}

export function previewMontage(offer: ClipOffer, picks: MontageId[]) {
  const chosen = ALL_MONTAGE.filter((m) => picks.includes(m.id))
  let virality = offer.stats.virality
  let quality = offer.stats.quality
  let risk = offer.stats.risk
  let humor = offer.stats.humor
  let rpm = offer.preview.rpm

  for (const m of chosen) {
    virality += m.mods.virality
    quality += m.mods.quality
    risk += m.mods.risk
    humor += m.mods.humor
    rpm += m.mods.rpm
  }

  // Overstuffed edits hurt quality
  if (picks.length >= MAX_MONTAGE_PICKS) quality -= 4
  if (picks.length === 0) {
    virality -= 12
    quality -= 10
  }

  virality = clamp(virality, 5, 99)
  quality = clamp(quality, 5, 99)
  risk = clamp(risk, 0, 99)
  humor = clamp(humor, 0, 99)
  rpm = Math.max(0.5, Math.round(rpm * 10) / 10)

  // Montage tweaks reach a bit — doesn't multiply into thousands
  const peakViews = Math.max(
    5,
    Math.round(offer.preview.peakViews * (0.85 + virality / 400 + quality / 500 + picks.length * 0.04)),
  )

  return { virality, quality, risk, humor, rpm, peakViews, picks: chosen.map((c) => c.id) }
}

export const MONTAGE_LIMIT = MAX_MONTAGE_PICKS

export function publishClip(
  state: GameState,
  offer: ClipOffer,
  picks: MontageId[],
): GameState {
  const medium = offer.medium
  const cost = PRODUCE_COST[medium]
  if (medium !== 'clip') {
    if (!canStartContent(state, medium)) return state
  }

  const preview = previewMontage(offer, picks.slice(0, MAX_MONTAGE_PICKS))
  const startsTiny = Math.max(1, Math.round(1 + Math.random() * 4))
  const clip: PublishedClip = {
    id: uid('pub'),
    title: offer.title,
    blurb: offer.blurb,
    avatar: offer.avatar,
    gameId: offer.gameId,
    format: offer.format,
    kind: offer.kind,
    medium,
    views: startsTiny,
    peakViews: preview.peakViews,
    earned: 0,
    pendingMoney: 0,
    rpm: preview.rpm,
    virality: preview.virality,
    quality: preview.quality,
    risk: preview.risk,
    humor: preview.humor,
    age: 0,
    boostMult: 1,
    boostUsed: false,
    elements: preview.picks,
    status: 'growing',
  }

  const hypeGain = Math.round(
    (medium === 'video' ? 5 : medium === 'reel' ? 8 : 3) + preview.virality * 0.08,
  )
  const subGain = Math.max(
    0,
    Math.round(
      (medium === 'video' ? 2 : 1) + preview.quality * 0.04 - preview.risk * 0.02,
    ),
  )
  const toxGain = preview.risk > 50 ? Math.round((preview.risk - 50) / 12) : 0
  const repGain = preview.quality > 60 && preview.risk < 40 ? 1 : preview.risk > 70 ? -1 : 0
  const flag =
    medium === 'video' ? 'video_posted' : medium === 'reel' ? 'reel_posted' : 'clip_posted'

  let next: GameState = {
    ...state,
    money: state.money - cost.money,
    energy: clamp(state.energy - cost.energy, 0, state.maxEnergy),
    clipFeed: [clip, ...state.clipFeed].slice(0, MAX_FEED),
    videosUploaded: state.videosUploaded + 1,
    hype: clamp(state.hype + hypeGain, 0, 9999),
    subscribers: Math.max(0, state.subscribers + subGain),
    toxicity: clamp(state.toxicity + toxGain, 0, 100),
    reputation: clamp(state.reputation + repGain, -20, 100),
    burnout: clamp(state.burnout + (medium === 'video' ? 3 : medium === 'reel' ? 2 : 0), 0, 100),
    flags: state.flags.includes(flag) ? state.flags : [...state.flags, flag],
  }

  // From produce phase — posting finishes the day-role; from stream phase keep the day open
  if ((medium === 'video' || medium === 'reel') && state.dayPhase === 'produce') {
    next = {
      ...next,
      dayPhase: 'manage',
      dayFlags: { ...next.dayFlags, produced: true },
    }
  }

  return next
}

export function mediumLabel(medium: FeedMedium): string {
  return FEED_MEDIUM_LABEL[medium]
}

export type ClipTickResult = {
  state: GameState
  /** True when UI should re-render (whole views / money / status) */
  dirty: boolean
}

/** Grow views & accrue monetization over time (real-time seconds) */
export function tickClipFeed(state: GameState, dt: number): ClipTickResult {
  if (!state.clipFeed.length) return { state, dirty: false }

  let moneyGain = 0
  let subGain = 0
  let hypeGain = 0
  let dirty = false

  const feed = state.clipFeed.map((c) => {
    if (c.status === 'dead') return c

    const age = c.age + dt
    const progress = c.views / Math.max(1, c.peakViews)
    const decay = progress >= 1 ? 0.12 : Math.max(0.35, 1 - progress * 0.65)
    // Keep modest, but enough that fractional growth accumulates visibly
    const hot = c.peakViews >= 120 ? 1.5 : c.peakViews >= 50 ? 1.15 : 1
    const rate =
      (3.5 + c.virality * 0.08 + c.quality * 0.04) *
      c.boostMult *
      decay *
      hot *
      (c.status === 'peaked' ? 0.2 : 1)

    // Keep fractional views — rounding every frame froze growth under 1 view/tick
    let views = c.views + rate * dt
    let status: PublishedClip['status'] = c.status
    if (views >= c.peakViews * 0.98) {
      views = Math.min(views, c.peakViews * (1 + Math.random() * 0.08))
      status = age > 90 ? 'dead' : 'peaked'
    } else {
      status = 'growing'
    }

    const viewDelta = Math.max(0, views - c.views)
    const pay = (viewDelta / 1000) * c.rpm * (0.85 + c.quality / 200)
    let pending = c.pendingMoney + pay
    let earned = c.earned

    if (status === 'growing' && Math.random() < dt * 0.1) {
      if (Math.random() < 0.35) {
        subGain += 1
        dirty = true
      }
      if (Math.random() < 0.4) {
        hypeGain += 1
        dirty = true
      }
    }

    if (pending >= 0.5) {
      const take = Math.floor(pending)
      if (take >= 1) {
        moneyGain += take
        earned += take
        pending -= take
        dirty = true
      }
    }

    if (Math.floor(views) !== Math.floor(c.views) || status !== c.status) dirty = true

    return {
      ...c,
      views,
      age,
      status,
      earned,
      pendingMoney: pending,
    }
  })

  if (!dirty && moneyGain === 0 && subGain === 0 && hypeGain === 0) {
    // Still write float progress into state for the next tick
    return { state: { ...state, clipFeed: feed }, dirty: false }
  }

  return {
    state: {
      ...state,
      clipFeed: feed,
      money: state.money + moneyGain,
      subscribers: state.subscribers + subGain,
      hype: clamp(state.hype + hypeGain, 0, 9999),
    },
    dirty: true,
  }
}

export function boostClipViews(state: GameState, clipId: string): GameState {
  const idx = state.clipFeed.findIndex((c) => c.id === clipId)
  if (idx < 0) return state
  const clip = state.clipFeed[idx]!
  if (clip.boostUsed) return state

  const next: PublishedClip = {
    ...clip,
    boostMult: 2,
    boostUsed: true,
    peakViews: Math.round(clip.peakViews * 1.35),
    views: Math.round(clip.views + Math.max(40, clip.peakViews * 0.08)),
    status: 'growing',
  }
  const feed = [...state.clipFeed]
  feed[idx] = next
  return { ...state, clipFeed: feed }
}

export function montageLabel(id: MontageId): string {
  return ALL_MONTAGE.find((m) => m.id === id)?.label ?? id
}
