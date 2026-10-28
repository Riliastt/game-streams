import { isGameLocked } from './endings'
import { sumStaffEffect } from './staff'
import type { GameState, Project } from './state'
import { clamp } from './state'

const PROJECT_DEFS: Record<
  Project['type'],
  { label: string; cost: number; energy: number; durationMs: number; subs: number; hype: number; money: number }
> = {
  // legacy timer project — hub uses montage «рилс» instead
  clip: { label: 'Рилс (старый)', cost: 60, energy: 0, durationMs: 45_000, subs: 4, hype: 10, money: 0 },
  shorts: { label: 'Shorts-пачка', cost: 90, energy: 1, durationMs: 70_000, subs: 7, hype: 8, money: 6 },
  collab_pitch: { label: 'Заявка на коллаб', cost: 40, energy: 0, durationMs: 55_000, subs: 3, hype: 12, money: 0 },
}

export function listProjectTypes(): Project['type'][] {
  return ['shorts', 'collab_pitch']
}

export function projectInfo(type: Project['type']) {
  return PROJECT_DEFS[type]
}

export function canStartProject(state: GameState, type: Project['type']): boolean {
  if (isGameLocked(state)) return false
  if (state.dayPhase !== 'produce' && state.dayPhase !== 'manage') return false
  if (state.projects.length >= 2) return false
  const def = PROJECT_DEFS[type]
  if (state.money < def.cost || state.energy < def.energy) return false
  if (type === 'collab_pitch' && state.subscribers < 80) return false
  return true
}

export function startProject(state: GameState, type: Project['type']): GameState {
  if (!canStartProject(state, type)) return state
  const def = PROJECT_DEFS[type]
  const speed = 1 + sumStaffEffect(state, 'projectSpeed')
  const duration = def.durationMs / speed
  const project: Project = {
    id: `p_${Date.now()}`,
    type,
    finishesAt: Date.now() + duration,
    label: def.label,
  }
  const nextPhase = state.dayPhase === 'produce' ? 'manage' : state.dayPhase
  return {
    ...state,
    money: state.money - def.cost,
    energy: clamp(state.energy - def.energy, 0, state.maxEnergy),
    projects: [...state.projects, project],
    dayPhase: nextPhase,
    dayFlags:
      state.dayPhase === 'produce'
        ? { ...state.dayFlags, produced: true }
        : state.dayFlags,
  }
}

export function tickProjects(state: GameState): GameState {
  const now = Date.now()
  const done = state.projects.filter((p) => p.finishesAt <= now)
  if (!done.length) return state

  let next = {
    ...state,
    projects: state.projects.filter((p) => p.finishesAt > now),
  }

  for (const p of done) {
    const def = PROJECT_DEFS[p.type]
    const clipBonus = 1 + sumStaffEffect(next, 'clipBonus')
    next = {
      ...next,
      subscribers: next.subscribers + Math.round(def.subs * clipBonus),
      hype: next.hype + Math.round(def.hype * clipBonus),
      money: next.money + def.money,
      flags: next.flags.includes('clip_done') ? next.flags : [...next.flags, 'clip_done'],
    }
  }
  return next
}
