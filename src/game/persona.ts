import type { GameState, Persona } from './state'
import { clamp } from './state'

export const PERSONA_THRESHOLD = 25

/** How each event decision shifts the streamer's image */
const CHOICE_SHIFT: Record<string, Partial<Persona>> = {
  q_nice: { kind: 3 },
  q_short: { kind: -1 },
  h_mod: { kind: 1, bold: -1 },
  h_fight: { kind: -6, bold: 2 },
  d_thanks: { kind: 2 },
  y_ride: { bold: 3 },
  y_calm: { bold: -2 },
  r_welcome: { kind: 2, bold: 1 },
  r_shy: { bold: -2 },
  t_fix: { bold: 2 },
  t_ignore: { bold: 1 },
  s_hype: { bold: 3 },
  s_read: { bold: -1 },
  s_skip: { kind: -2 },
  m_yes: { kind: 1, bold: -1 },
  m_no: { kind: -3 },
  cl_risk: { bold: 5 },
  cl_safe: { bold: -3 },
  v_clip: { bold: 3 },
  v_play: { bold: -2 },
  cw_peace: { kind: 4 },
  cw_fuel: { kind: -6, bold: 3 },
  sf_thanks: { kind: 3 },
  sf_quick: { kind: -1 },
  ab_ride: { bold: 2 },
  ab_ignore: { bold: -2 },
  et_fix: { bold: 3 },
  et_end: { bold: -3 },
  ch_all: { kind: 6 },
  ch_part: { kind: 2 },
  ch_skip: { kind: -4 },
  db_show: { kind: -5, bold: 3 },
  db_cool: { kind: 2, bold: -1 },
  st_do: { bold: 6 },
  st_no: { bold: -3 },
  cz_talk: { kind: 2, bold: -3 },
  cz_skip: { bold: 2 },
  hr_joke: { kind: 3, bold: 2 },
  hr_ban: { bold: -2 },
  hr_fight: { kind: -6, bold: 3 },
}

export function shiftPersona(state: GameState, delta: Partial<Persona>): GameState {
  const p = state.persona ?? { kind: 0, bold: 0 }
  return {
    ...state,
    persona: {
      kind: clamp(p.kind + (delta.kind ?? 0), -100, 100),
      bold: clamp(p.bold + (delta.bold ?? 0), -100, 100),
    },
  }
}

export function applyChoicePersona(state: GameState, choiceId: string): GameState {
  const d = CHOICE_SHIFT[choiceId]
  return d ? shiftPersona(state, d) : state
}

export type PersonaTraits = {
  kind: boolean
  toxic: boolean
  bold: boolean
  careful: boolean
}

export function personaTraits(state: GameState): PersonaTraits {
  const p = state.persona ?? { kind: 0, bold: 0 }
  return {
    kind: p.kind >= PERSONA_THRESHOLD,
    toxic: p.kind <= -PERSONA_THRESHOLD,
    bold: p.bold >= PERSONA_THRESHOLD,
    careful: p.bold <= -PERSONA_THRESHOLD,
  }
}

export function personaTitle(state: GameState): string {
  const t = personaTraits(state)
  if (t.kind && t.bold) return 'Добрый сорвиголова'
  if (t.kind && t.careful) return 'Уютный добряк'
  if (t.toxic && t.bold) return 'Скандалист'
  if (t.toxic && t.careful) return 'Язвительный тихоня'
  if (t.kind) return 'Добряк'
  if (t.toxic) return 'Токсик'
  if (t.bold) return 'Безбашенный'
  if (t.careful) return 'Осторожный'
  return 'Пока без образа'
}

/** Perks and costs of the current image */
export function personaPerks(state: GameState): string[] {
  const t = personaTraits(state)
  const out: string[] = []
  if (t.kind) out.push('+8% подписчиков, меньше хейта, щедрые спонсоры')
  if (t.toxic) out.push('+12% донатов за шоу, но больше хейта и меньше спонсоров')
  if (t.bold) out.push('+10% хайпа и рискованные челленджи, но +5% усталости')
  if (t.careful) out.push('−10% усталости и уютные разговоры, но −5% хайпа')
  if (!out.length) out.push('Решения в событиях постепенно формируют образ')
  return out
}

export function personaMods(state: GameState) {
  const t = personaTraits(state)
  return {
    subs: t.kind ? 1.08 : 1,
    donate: t.toxic ? 1.12 : 1,
    hype: (t.bold ? 1.1 : 1) * (t.careful ? 0.95 : 1),
    fatigue: (t.bold ? 1.05 : 1) * (t.careful ? 0.9 : 1),
    sponsorReward: t.kind ? 1.2 : 1,
    sponsorChance: t.toxic ? 0.6 : 1,
  }
}

const LINES = {
  kind: ['ты самый добрый стример 💜', 'уютно тут', 'обнимаю чат', 'за такой вайб и подписался'],
  toxic: ['опять кого-то разнесёт KEKW', 'жду срач', 'вот за это и смотрю', 'жёстко, но честно'],
  bold: ['го безумие!', 'рискни!', 'ВА-БАНК', 'он реально сделает это?'],
  careful: ['спокойный вайб', 'без спешки, кайф', 'тихий вечер', 'ламповый эфир'],
}

/** A persona-flavored chat line, or null when the image is neutral */
export function personaChatLine(state: GameState): string | null {
  const t = personaTraits(state)
  const pools: string[][] = []
  if (t.kind) pools.push(LINES.kind)
  if (t.toxic) pools.push(LINES.toxic)
  if (t.bold) pools.push(LINES.bold)
  if (t.careful) pools.push(LINES.careful)
  if (!pools.length) return null
  const pool = pools[Math.floor(Math.random() * pools.length)]!
  return pool[Math.floor(Math.random() * pool.length)]!
}
