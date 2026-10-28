import upgradesData from '../data/upgrades.json'
import { favoriteGameBonus, gameMods } from './games'
import { formatSubsMult, formatViewersMult } from './formatSkills'
import { rankId } from './ranks'
import { getStudio } from './studio'
import { personaMods } from './persona'
import { currentTrend } from './trends'
import { getGoalTier } from './goal'
import { getStyle } from './streamStyles'
import type { ContentType, Fan, GameState } from './state'
import { clamp } from './state'

export type UpgradeDef = {
  id: string
  name: string
  description: string
  baseCost: number
  maxLevel: number
  effects: Record<string, number>
}

export const UPGRADES = upgradesData as unknown as UpgradeDef[]

export const CONTENT_TYPES: {
  id: ContentType
  name: string
  description: string
  mods: { viewers: number; donate: number; subs: number; fatigue: number }
}[] = [
  {
    id: 'letsplay',
    name: 'Летсплей',
    description: 'Стабильный рост и донаты',
    mods: { viewers: 1, donate: 1.05, subs: 1, fatigue: 1.05 },
  },
  {
    id: 'reacts',
    name: 'Реакты',
    description: 'Больше хайпа, меньше донатов',
    mods: { viewers: 1.08, donate: 0.8, subs: 1.08, fatigue: 1 },
  },
  {
    id: 'irl',
    name: 'ИРЛ',
    description: 'Репутация и живой вайб',
    mods: { viewers: 0.85, donate: 0.95, subs: 1.05, fatigue: 1.15 },
  },
  {
    id: 'collab',
    name: 'Коллаб',
    description: 'Риск и большой всплеск аудитории',
    mods: { viewers: 1.18, donate: 1, subs: 1.15, fatigue: 1.25 },
  },
  {
    id: 'vlog',
    name: 'Влог',
    description: 'Видеоблог: больше подписчиков, меньше донатов в эфире',
    mods: { viewers: 0.9, donate: 0.65, subs: 1.18, fatigue: 0.95 },
  },
  {
    id: 'shorts',
    name: 'Shorts/Reels',
    description: 'Короткие ролики: хайп и подписчики',
    mods: { viewers: 1.1, donate: 0.55, subs: 1.22, fatigue: 0.9 },
  },
]

export function upgradeLevel(state: GameState, id: string): number {
  return state.upgrades[id] ?? 0
}

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(1.55, level))
}

export function sumEffect(state: GameState, key: string): number {
  let total = 0
  for (const def of UPGRADES) {
    const level = upgradeLevel(state, def.id)
    if (!level) continue
    const value = def.effects[key]
    if (value) total += value * level
  }
  return total
}

export function clickPower(state: GameState): number {
  return 1 + sumEffect(state, 'clickPower')
}

export function computeMaxEnergy(state: GameState): number {
  return 5 + Math.floor(sumEffect(state, 'maxEnergy'))
}

export function contentMods(type: ContentType) {
  return CONTENT_TYPES.find((c) => c.id === type)?.mods ?? CONTENT_TYPES[0]!.mods
}

const FAN_DONATE: Record<Fan['rarity'], number> = { common: 0.01, rare: 0.02, epic: 0.04 }

/** +5% donations per streak day, up to +50% */
export function streakBonus(state: GameState): number {
  return Math.min(0.5, (state.streamStreak || 0) * 0.05)
}

export function fansBonus(state: GameState): number {
  return Math.min(
    0.25,
    (state.fans ?? []).reduce((s, f) => s + (f.gone ? 0 : FAN_DONATE[f.rarity]), 0),
  )
}

export function prestigeBonus(state: GameState): number {
  return (state.prestige || 0) * 0.1
}

/** Merge format + selected game multipliers */
export function streamMods(state: GameState) {
  const c = contentMods(state.stream.active ? state.stream.contentType : state.contentType)
  const g = gameMods(state)
  const fav = favoriteGameBonus(state)
  const st = getStyle(state.stream.active ? state.stream.style : state.streamStyle).mods
  const studio = getStudio(state)
  const partner = rankId(state) >= 6 ? 0.1 : 0
  const persona = personaMods(state)
  const trend = currentTrend(state)
  const donateMult =
    (1 + sumEffect(state, 'donateMult') * 0.7) *
    (1 + streakBonus(state) + fansBonus(state) + prestigeBonus(state) + partner)
  return {
    viewers: c.viewers * g.viewers * st.viewers * studio.viewers * trend.viewers,
    donate: c.donate * g.donate * st.donate * donateMult * persona.donate,
    subs: c.subs * g.viewers * st.subs * persona.subs * trend.subs,
    fatigue: c.fatigue * g.fatigue * st.fatigue * persona.fatigue,
    hype: g.hype * fav * st.hype * studio.hype * persona.hype,
    combo: g.combo,
  }
}

/** Soft-cap for off-stream content (videos) on big channels. */
export function audienceSoftCap(subscribers: number): number {
  return 1 / (1 + subscribers / 180)
}

/** Starting audience: grows visibly with subscribers (≈9 @50, 13 @136, 40 @1k, 500 @100k). */
export function baseViewers(state: GameState): number {
  const fromSubs = 1 + 0.9 * Math.pow(Math.max(0, state.subscribers), 0.55)
  const fromRep = Math.max(0, state.reputation) * 0.15
  const fromHype = Math.sqrt(Math.max(0, state.hype)) * 0.5
  const mult = (1 + sumEffect(state, 'viewersMult') * 0.7) * (1 + prestigeBonus(state))
  const formatMult = formatViewersMult(state)
  return Math.max(1, Math.floor((fromSubs + fromRep + fromHype) * mult * formatMult))
}

export type StreamRewards = {
  /** Exactly stream donations → player budget */
  donations: number
  /** Extra from ads/views/fate (not donations) */
  streamBonus: number
  sponsor: number
  sponsorBrand: string
  money: number
  subscribers: number
  hype: number
  reputation: number
  goal: { target: number; raised: number; hit: boolean; tier: number; subs: number } | null
  battle: { won: boolean; name: string; subs: number } | null
}

export function calcStreamRewards(state: GameState): StreamRewards {
  const s = state.stream
  const mods = streamMods(state)
  const moneyMult = 1 + sumEffect(state, 'moneyMult') * 0.75
  const subsMult = (1 + sumEffect(state, 'subsMult') * 0.65) * (s.weekend ? 1.25 : 1)

  // 100% of on-stream donations go to the wallet — no platform cut
  const donations = Math.max(0, Math.round(s.donations))
  const streamBonus = Math.max(
    0,
    Math.round(
      (s.viewers * 0.6 + s.clicks * 0.25 + Math.max(0, s.fateBonus) * 0.8) *
        moneyMult *
        (s.endedEarly ? 0.55 : 1),
    ),
  )
  const sponsor = Math.max(0, Math.round(s.sponsorPaid))
  const money = donations + streamBonus + sponsor
  const rawSubs =
    (s.viewers * 0.22 + s.hype * 0.03 + s.clicks * 0.03 + Math.max(0, s.fateBonus) * 0.03) *
    mods.subs *
    subsMult *
    formatSubsMult(state, s.contentType) *
    (s.endedEarly ? 0.55 : 1)
  // Weak streams barely convert; need real performance for growth
  const performance = Math.min(1, (s.clicks / 40 + s.hype / 50 + s.viewers / 25) / 3)
  const converted = Math.max(1, Math.round(rawSubs * (0.35 + performance * 0.65)))
  // First stream always feels like a win
  let subscribers = s.tutorial ? Math.max(8, converted) : converted
  let hype = Math.round(s.hype * 0.22 * mods.hype)
  // Game of the week / new release hype kick
  if (state.weekGameId && state.selectedGameId === state.weekGameId) hype += 6
  if (state.newReleaseGameId && state.selectedGameId === state.newReleaseGameId) hype += 10
  let reputation =
    s.endedEarly && s.fateBonus < 0
      ? -2
      : s.fatigue > 80
        ? -1
        : s.hype > 55 && s.clicks > 45
          ? 1
          : 0

  let goal: StreamRewards['goal'] = null
  if (s.goalTarget > 0) {
    const tier = getGoalTier(s.goalTier)
    const hit = s.donations >= s.goalTarget
    const bonus = hit ? Math.max(1, Math.round(subscribers * tier.subsBonus)) : 0
    subscribers += bonus
    reputation += hit ? tier.repWin : tier.repFail
    goal = { target: s.goalTarget, raised: donations, hit, tier: s.goalTier, subs: bonus }
  }

  let battle: StreamRewards['battle'] = null
  if (s.battle && s.battle.won !== null) {
    const won = s.battle.won
    const swing = won ? s.battle.subsSwing : -Math.round(s.battle.subsSwing * 0.3)
    subscribers += swing
    if (won) reputation += 1
    else hype = Math.max(0, hype - 5)
    battle = { won, name: s.battle.name, subs: swing }
  }

  return {
    donations,
    streamBonus,
    sponsor,
    sponsorBrand: s.sponsorBrand,
    money,
    subscribers,
    hype,
    reputation,
    goal,
    battle,
  }
}

export function applyRewards(state: GameState, rewards: StreamRewards, doubleMoney = false): GameState {
  // x2 ad doubles donations + stream bonus; sponsor contracts pay a fixed amount
  const earned = rewards.donations + rewards.streamBonus
  const payout = (doubleMoney ? earned * 2 : earned) + rewards.sponsor
  let next: GameState = {
    ...state,
    lastStreamMoney: payout,
    money: state.money + payout,
    subscribers: Math.max(0, state.subscribers + rewards.subscribers),
    hype: clamp(state.hype + rewards.hype, 0, 9999),
    reputation: clamp(state.reputation + rewards.reputation, -20, 100),
  }
  const battle = state.stream.battle
  if (rewards.battle && battle) {
    const won = rewards.battle.won
    next = {
      ...next,
      rivals: next.rivals.map((r) =>
        r.id === battle.rivalId ? { ...r, subs: Math.max(0, r.subs + (won ? -battle.subsSwing : battle.subsSwing)) } : r,
      ),
      nemesisId: battle.rivalId,
      battlesWon: next.battlesWon + (won ? 1 : 0),
      battlesLost: next.battlesLost + (won ? 0 : 1),
    }
  }
  return next
}

export function membershipDailyIncome(state: GameState): number {
  if (!state.membershipOpen || state.members <= 0) return 0
  return Math.floor(state.members * 2.5)
}
