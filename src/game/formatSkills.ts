import type { ContentType, GameState } from './state'

export const FORMAT_IDS: ContentType[] = [
  'letsplay',
  'reacts',
  'irl',
  'collab',
  'vlog',
  'shorts',
]

export const FORMAT_SKILL_MAX = 100
/** Days without this format before decay starts */
export const FORMAT_DECAY_AFTER_DAYS = 2
/** Skill lost per idle day after the grace period */
export const FORMAT_DECAY_PER_DAY = 7
/** Base skill gain after finishing a stream in that format */
export const FORMAT_GAIN_BASE = 10

export function emptyFormatSkills(): Record<ContentType, number> {
  return {
    letsplay: 0,
    reacts: 0,
    irl: 0,
    collab: 0,
    vlog: 0,
    shorts: 0,
  }
}

export function emptyFormatLastDay(): Record<ContentType, number> {
  return {
    letsplay: 0,
    reacts: 0,
    irl: 0,
    collab: 0,
    vlog: 0,
    shorts: 0,
  }
}

export function formatSkill(state: GameState, type: ContentType): number {
  return Math.max(0, Math.min(FORMAT_SKILL_MAX, state.formatSkills?.[type] ?? 0))
}

/** 1.0 … ~1.45 viewers from format mastery */
export function formatViewersMult(state: GameState, type?: ContentType): number {
  const t = type ?? (state.stream.active ? state.stream.contentType : state.contentType)
  const skill = formatSkill(state, t)
  return 1 + (skill / FORMAT_SKILL_MAX) * 0.45
}

/** 1.0 … ~1.55 subs conversion from format mastery */
export function formatSubsMult(state: GameState, type?: ContentType): number {
  const t = type ?? (state.stream.active ? state.stream.contentType : state.contentType)
  const skill = formatSkill(state, t)
  return 1 + (skill / FORMAT_SKILL_MAX) * 0.55
}

export function formatSkillLabel(skill: number): string {
  if (skill >= 80) return 'Мастер'
  if (skill >= 55) return 'Про'
  if (skill >= 30) return 'Средне'
  if (skill >= 10) return 'Новичок'
  return '—'
}

/** Call after a finished stream of `type`. */
export function gainFormatSkill(state: GameState, type: ContentType, performance = 0.5): GameState {
  const cur = formatSkill(state, type)
  const gain = Math.round(FORMAT_GAIN_BASE * (0.7 + performance * 0.6))
  const nextSkills = {
    ...(state.formatSkills ?? emptyFormatSkills()),
    [type]: Math.min(FORMAT_SKILL_MAX, cur + gain),
  }
  const nextLast = {
    ...(state.formatLastDay ?? emptyFormatLastDay()),
    [type]: state.day,
  }
  return {
    ...state,
    formatSkills: nextSkills,
    formatLastDay: nextLast,
  }
}

/** Call on day end (restDay): decay unused formats. */
export function decayFormatSkills(state: GameState): GameState {
  const skills = { ...(state.formatSkills ?? emptyFormatSkills()) }
  const last = { ...(state.formatLastDay ?? emptyFormatLastDay()) }
  let changed = false

  for (const id of FORMAT_IDS) {
    const lastDay = last[id] || 0
    if (skills[id] <= 0) continue
    // After restDay, `day` is already tomorrow. Idle = how many days since last use.
    const idle = lastDay > 0 ? state.day - lastDay : FORMAT_DECAY_AFTER_DAYS
    if (idle < FORMAT_DECAY_AFTER_DAYS) continue
    const dayLoss = Math.min(skills[id], FORMAT_DECAY_PER_DAY)
    if (dayLoss <= 0) continue
    skills[id] = Math.max(0, skills[id] - dayLoss)
    changed = true
  }

  if (!changed) return state
  return { ...state, formatSkills: skills, formatLastDay: last }
}
