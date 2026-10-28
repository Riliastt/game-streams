import { getGame } from './games'
import { getRival } from './battle'
import type { Fan, GameState } from './state'
import { CHAT_LIMIT, clamp } from './state'

export const FAN_LEAVE_MOOD = 20
const MAX_REGULARS = 6

export type MemoryId =
  | 'clutch_win'
  | 'clutch_fail'
  | 'end_early'
  | 'saved_stream'
  | 'fight_hater'
  | 'viral'
  | 'goal_hit'
  | 'goal_fail'
  | 'battle_win'
  | 'battle_lose'
  | 'charity'
  | 'drama'

const MEMORY_LINES: Record<MemoryId, string[]> = {
  clutch_win: ['помню тот клатч, легенда', 'повтори клатч как в прошлый раз!'],
  clutch_fail: ['только не как в прошлый раз с клатчем 😅'],
  end_early: ['в прошлый раз ты просто вырубил эфир 😤', 'сегодня досидишь до конца?'],
  saved_stream: ['помню, как ты чуть не выключил стрим, но вытащил!'],
  fight_hater: ['опять будешь хейтеров разносить? 🍿'],
  viral: ['тот вирал до сих пор пересматриваю'],
  goal_hit: ['в прошлый раз цель закрыли! повторим?'],
  goal_fail: ['в этот раз цель точно соберём 💪'],
  battle_win: ['после победы над {rival} я в тебя верю'],
  battle_lose: ['{rival} в тот раз просто повезло'],
  charity: ['тот благотворительный стрим 💜 горжусь'],
  drama: ['после той драмы ты стал только сильнее'],
}

const GENERIC_FAN_LINES = [
  'суперфан на месте ✋',
  'я тут с первых эфиров',
  'всем привет, я снова тут',
  'кто со мной с прошлого эфира?',
]

export function activeFans(state: GameState): Fan[] {
  return (state.fans ?? []).filter((f) => !f.gone)
}

export function addMemory(state: GameState, id: MemoryId): GameState {
  const memories = [...(state.memories ?? []).filter((m) => m !== id), id].slice(-6)
  return { ...state, memories }
}

/** Who of the album shows up today: happier fans come more often. */
export function pickRegulars(state: GameState): string[] {
  return activeFans(state)
    .filter((f) => Math.random() < 0.45 + (f.mood ?? 70) / 250)
    .slice(0, MAX_REGULARS)
    .map((f) => f.nick)
}

function memoryLine(state: GameState): string | null {
  const mems = (state.memories ?? []) as MemoryId[]
  if (!mems.length) return null
  const id = mems[Math.floor(Math.random() * mems.length)]!
  const pool = MEMORY_LINES[id]
  if (!pool) return null
  const rival = getRival(state, state.nemesisId)?.name ?? 'соперник'
  return pool[Math.floor(Math.random() * pool.length)]!.replace('{rival}', rival)
}

function regularLine(state: GameState, nick: string, first: boolean): string {
  const fan = state.fans.find((f) => f.nick === nick)
  const s = state.stream
  if (first) {
    if (state.daysWithoutStream >= 2) return `где пропадал? ${state.daysWithoutStream} дн. без эфира 😢`
    const plays = state.gamePlayCounts[state.selectedGameId] ?? 0
    if (s.contentType === 'letsplay' && plays >= 5 && Math.random() < 0.5) {
      return `О, опять ${getGame(state.selectedGameId).name} 😴`
    }
    if (fan?.streams && fan.streams >= 3) return `уже ${fan.streams + 1}-й эфир вместе!`
  }
  if ((fan?.mood ?? 70) < 40) return 'чат меня совсем не замечает…'
  const mem = Math.random() < 0.55 ? memoryLine(state) : null
  return mem ?? GENERIC_FAN_LINES[Math.floor(Math.random() * GENERIC_FAN_LINES.length)]!
}

/** Superfans speak up every so often with lines that remember past streams. */
export function tickRegulars(state: GameState, dt: number): GameState {
  const s = state.stream
  if (!s.regulars?.length) return state
  const cooldown = s.regularCooldown - dt
  if (cooldown > 0) return { ...state, stream: { ...s, regularCooldown: cooldown } }
  const spoken = s.chat.filter((m) => m.kind === 'fan').map((m) => m.user)
  const fresh = s.regulars.filter((n) => !spoken.includes(n))
  const pool = fresh.length ? fresh : s.regulars
  const nick = pool[Math.floor(Math.random() * pool.length)]!
  const text = regularLine(state, nick, fresh.includes(nick))
  const chat = [
    ...s.chat,
    { id: `fan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, user: `★ ${nick}`, text, kind: 'fan' as const },
  ].slice(-CHAT_LIMIT)
  return { ...state, stream: { ...s, chat, regularCooldown: 6 + Math.random() * 6 } }
}

/** Warm answers please the regulars in chat; ignoring the chat upsets them. */
export function shiftRegularMood(state: GameState, delta: number): GameState {
  const present = new Set(state.stream.regulars ?? [])
  if (!present.size) return state
  return {
    ...state,
    fans: state.fans.map((f) =>
      present.has(f.nick) && !f.gone ? { ...f, mood: clamp((f.mood ?? 70) + delta, 0, 100) } : f,
    ),
  }
}

/** End of stream: attendance counts, upset fans leave the album. */
export function settleRegulars(state: GameState): GameState {
  const present = new Set(state.stream.regulars ?? [])
  const left: string[] = []
  const fans = state.fans.map((f) => {
    if (f.gone) return f
    const next = present.has(f.nick)
      ? { ...f, streams: (f.streams ?? 0) + 1, mood: clamp((f.mood ?? 70) + 2, 0, 100) }
      : f
    if ((next.mood ?? 70) < FAN_LEAVE_MOOD) {
      left.push(f.nick)
      return { ...next, gone: true }
    }
    return next
  })
  return { ...state, fans, stream: { ...state.stream, fansLeft: left } }
}

/** A day without a stream makes every fan miss you a bit. */
export function decayFanMood(state: GameState): GameState {
  return {
    ...state,
    fans: (state.fans ?? []).map((f) => (f.gone ? f : { ...f, mood: clamp((f.mood ?? 70) - 8, 0, 100) })),
  }
}
