import { streamMods } from './economy'
import type { ChatMessage, ContentType, GameState } from './state'
import { CHAT_LIMIT } from './state'

const NICKS = [
  'lucha_fan',
  'mira_ttv',
  'kekov',
  'donat_king',
  'nocturne',
  'pixie',
  'bytefox',
  'salty',
  'neoncat',
  'ggwp',
  'stream_mom',
  'raidlord',
  'chillguy',
  'hyper',
  'mod_marina',
  'volt_bot',
  'nexus_lurk',
  'tea_time',
  'fps_potato',
  'softcore',
  'lurk_queen',
  'clip_it',
  'baka_pls',
  'ramen_god',
  'voidwalker',
  'sunny_tt',
  'lagspike',
  'emote_spam',
  'coach_dan',
  'anya_irl',
  'shorts_kid',
  'vlog_dad',
  'react_lord',
  'collab_bee',
  'nightowl',
  'pixel_mom',
  'gift_sub',
  'tier3_fan',
  'chat_cop',
  'first_time',
  'backseat',
  'pog_machine',
  'quiet_one',
  'hype_train',
  'mod_alex',
  'snack_break',
  'wifi_warrior',
  'desk_setup',
  'cam_check',
  'lol_only',
]

const LINES_BY_FORMAT: Record<ContentType, string[]> = {
  letsplay: [
    'что за билд?',
    'го хардкор',
    'LUL',
    'сейвпоинт был?',
    'скилл issue',
    'имба персонаж',
    'вайб зашёл',
  ],
  reacts: [
    'лицо стримера топ',
    'реакция огонь',
    'не смотри спойлеры!',
    'POG',
    'это уже смотрел',
    'кринж но смешно',
  ],
  irl: [
    'где это?',
    'на улице шумно',
    'привет из чата!',
    'покажи вокруг',
    'IRL forever',
    'осторожнее на дороге',
  ],
  collab: [
    'химхимия топ',
    'гость огонь',
    'когда ещё коллаб?',
    'оба в кадре!',
    'рейд после?',
  ],
  vlog: [
    'день из жизни топ',
    'монтаж кайф',
    'подписался',
    'покажи сетап',
    'вайб уютный',
  ],
  shorts: [
    'в рилсы это!',
    'коротко и ясно',
    'алгоритм заберёт',
    'ещё шортс!',
    'тикток вайб',
  ],
}

const GENERIC_LINES = [
  'первый раз тут, огонь',
  'звук топ',
  'держись, стример',
  'мем в чат',
  'уже в подписке',
  'можно вопрос?',
  'с днём стрима',
  'чат живой',
]

const HATE_LINES = ['скучно', 'удали', 'продажный', 'нулевой контент', 'офф']
const DONATE_LINES = ['на пиццу!', 'ты топ', 'за вайб', 'держи', 'на апгрейд']
const SUB_LINES = ['только что подписался!', 'вернулся с рейда', 'с телефона зашёл']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9999)}`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Active chat nicknames ≈ viewer count (soft capped for realism). */
export function targetChatterCount(viewers: number): number {
  const v = Math.max(1, Math.floor(viewers))
  // ~85% of viewers chat; rest lurk — still roughly matches the viewer counter
  return Math.max(1, Math.min(NICKS.length, Math.round(v * 0.85)))
}

export function syncChatters(state: GameState): GameState {
  const target = targetChatterCount(state.stream.viewers)
  let chatters = [...(state.stream.chatters ?? [])]
  if (chatters.length === target) return state

  if (chatters.length < target) {
    const unused = shuffle(NICKS.filter((n) => !chatters.includes(n)))
    chatters = [...chatters, ...unused.slice(0, target - chatters.length)]
  } else {
    chatters = shuffle(chatters).slice(0, target)
  }

  return { ...state, stream: { ...state.stream, chatters } }
}

export function pushChat(state: GameState, msg: Omit<ChatMessage, 'id'>): GameState {
  const chat = [...state.stream.chat, { ...msg, id: uid('c') }].slice(-CHAT_LIMIT)
  return { ...state, stream: { ...state.stream, chat } }
}

/** A hot combo makes the chat generous: 2.5% idle → 7.5% at x12+. */
export function donateChance(state: GameState): number {
  const heat = Math.min(1, state.stream.combo / 12)
  return 0.025 + 0.05 * heat
}

export function generateChatMessage(state: GameState): ChatMessage {
  const pool = state.stream.chatters?.length ? state.stream.chatters : NICKS
  const user = pick(pool)
  const format = state.stream.contentType
  const formatLines = LINES_BY_FORMAT[format] ?? GENERIC_LINES
  const roll = Math.random()
  if (roll < 0.08) {
    return { id: uid('c'), user, text: pick(SUB_LINES), kind: 'sub' }
  }
  if (roll < 0.12 + state.toxicity * 0.001) {
    return { id: uid('c'), user, text: pick(HATE_LINES), kind: 'hate' }
  }
  if (roll < 0.12 + state.toxicity * 0.001 + donateChance(state)) {
    const audience = 1 + Math.min(3, state.stream.viewers / 90)
    const amount = Math.max(
      3,
      Math.round((6 + Math.floor(Math.random() * 24)) * audience * streamMods(state).donate),
    )
    return {
      id: uid('c'),
      user,
      text: `${amount}₽ — ${pick(DONATE_LINES)}`,
      kind: 'donate',
    }
  }
  const text = Math.random() < 0.55 ? pick(formatLines) : pick(GENERIC_LINES)
  return { id: uid('c'), user, text, kind: 'chat' }
}

export function tickChat(state: GameState, dt: number): GameState {
  if (!state.stream.active) return state
  let next = syncChatters(state)
  let cooldown = next.stream.chatCooldown - dt
  const chatters = Math.max(1, next.stream.chatters?.length ?? 1)
  // More chatters → faster messages, roughly proportional to audience
  const rate = 0.4 + Math.min(2.2, chatters / 18)
  if (cooldown <= 0) {
    const burst = chatters >= 25 ? (Math.random() < 0.45 ? 3 : 2) : Math.random() < 0.35 ? 2 : 1
    let chat = [...next.stream.chat]
    let donateAdd = 0
    for (let i = 0; i < burst; i++) {
      const msg = generateChatMessage(next)
      chat.push(msg)
      if (msg.kind === 'donate') {
        const m = msg.text.match(/^(\d+)₽/)
        if (m) donateAdd += Number(m[1])
      }
    }
    chat = chat.slice(-CHAT_LIMIT)
    next = {
      ...next,
      stream: {
        ...next.stream,
        chat,
        donations: next.stream.donations + donateAdd,
        lastDonateAmount: donateAdd > 0 ? donateAdd : next.stream.lastDonateAmount,
        chatCooldown: 0.35 + Math.random() * (1.0 / rate),
      },
    }
  } else {
    next = { ...next, stream: { ...next.stream, chatCooldown: cooldown } }
  }
  return next
}

export function systemChat(state: GameState, text: string): GameState {
  return pushChat(state, { user: 'system', text, kind: 'system' })
}

export function formatGoLiveLine(channel: string, contentType: ContentType, gameName: string): string {
  switch (contentType) {
    case 'letsplay':
      return `${channel} играет в ${gameName}`
    case 'reacts':
      return `${channel} запускает реакт-стрим`
    case 'irl':
      return `${channel} выходит в ИРЛ`
    case 'collab':
      return `${channel} начинает коллаб`
    case 'vlog':
      return `${channel} снимает влог в эфире`
    case 'shorts':
      return `${channel} крутит Shorts/Reels лайв`
    default:
      return `${channel} в эфире`
  }
}
