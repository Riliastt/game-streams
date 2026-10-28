import questsData from '../data/quests.json'
import achievementsData from '../data/achievements.json'
import type { DailyQuest, GameState } from './state'
import { clamp } from './state'

type QuestTemplate = {
  id: string
  title: string
  metric: DailyQuest['metric']
  target: number
  rewardMoney: number
  rewardHype: number
  rewardEnergy: number
}

type AchDef = {
  id: string
  title: string
  description: string
  check: string
}

const TEMPLATES = questsData as QuestTemplate[]
export const ACHIEVEMENTS = achievementsData as AchDef[]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function ensureDailyQuests(state: GameState): GameState {
  if (state.questDay === state.day && state.dailyQuests.length > 0) return state
  const picks = shuffle(TEMPLATES).slice(0, 3)
  const dailyQuests: DailyQuest[] = picks.map((t) => ({
    id: `${t.id}_${state.day}`,
    templateId: t.id,
    title: t.title.replace('{n}', String(t.target)),
    target: t.target,
    progress: 0,
    rewardMoney: t.rewardMoney,
    rewardHype: t.rewardHype,
    rewardEnergy: t.rewardEnergy,
    claimed: false,
    metric: t.metric,
  }))
  return {
    ...state,
    questDay: state.day,
    dailyQuests,
    dayStartSubs: state.subscribers,
    dayStartMoney: state.money,
  }
}

export function syncQuestProgress(state: GameState): GameState {
  const daySubs = Math.max(0, state.subscribers - state.dayStartSubs)
  const dayMoney = Math.max(0, state.money - state.dayStartMoney)
  const dailyQuests = state.dailyQuests.map((q) => {
    if (q.claimed) return q
    let progress = q.progress
    switch (q.metric) {
      case 'streams':
        // tracked incrementally
        break
      case 'clicks':
        break
      case 'donations':
        break
      case 'subscribers_gain':
        progress = daySubs
        break
      case 'money_gain':
        progress = dayMoney
        break
      case 'combo':
        progress = Math.max(progress, state.bestCombo)
        break
    }
    return { ...q, progress: Math.min(q.target, progress) }
  })
  return { ...state, dailyQuests }
}

export function bumpQuestMetric(
  state: GameState,
  metric: DailyQuest['metric'],
  amount: number,
): GameState {
  const dailyQuests = state.dailyQuests.map((q) => {
    if (q.claimed || q.metric !== metric) return q
    if (metric === 'combo') {
      return { ...q, progress: Math.min(q.target, Math.max(q.progress, amount)) }
    }
    return { ...q, progress: Math.min(q.target, q.progress + amount) }
  })
  return { ...state, dailyQuests }
}

export function claimQuest(state: GameState, questId: string): GameState {
  const q = state.dailyQuests.find((x) => x.id === questId)
  if (!q || q.claimed || q.progress < q.target) return state
  return {
    ...state,
    money: state.money + q.rewardMoney,
    hype: state.hype + q.rewardHype,
    energy: clamp(state.energy + q.rewardEnergy, 0, state.maxEnergy),
    dailyQuests: state.dailyQuests.map((x) => (x.id === questId ? { ...x, claimed: true } : x)),
  }
}

function checkUnlocked(state: GameState, check: string): boolean {
  if (check.startsWith('streams>=')) return state.streamsDone >= Number(check.split('>=')[1])
  if (check.startsWith('subscribers>=')) return state.subscribers >= Number(check.split('>=')[1])
  if (check.startsWith('bestCombo>=')) return state.bestCombo >= Number(check.split('>=')[1])
  if (check.startsWith('flag:')) return state.flags.includes(check.slice(5))
  if (check === 'staffAny') return Object.values(state.staff).some((v) => v > 0)
  if (check === 'channelNamed') return state.channelNamed
  if (check === 'hasEnding') return Boolean(state.ending)
  return false
}

export function unlockAchievements(state: GameState): GameState {
  const next = [...state.achievements]
  let changed = false
  for (const a of ACHIEVEMENTS) {
    if (next.includes(a.id)) continue
    if (checkUnlocked(state, a.check)) {
      next.push(a.id)
      changed = true
    }
  }
  if (!changed) return state
  return { ...state, achievements: next }
}
