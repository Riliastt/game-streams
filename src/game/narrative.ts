import storyData from '../data/story.json'
import storyArc2 from '../data/story_arc2.json'
import type { GameState } from './state'
import { clamp } from './state'

export type StoryChoice = {
  id: string
  label: string
  effects: {
    flags?: string[]
    money?: number
    subscribers?: number
    reputation?: number
    hype?: number
    energy?: number
  }
  requires?: { anyFlags?: string[] }
}

export type StoryScene = {
  id: string
  trigger:
    | { type: 'start' }
    | { type: 'streams'; min: number }
    | { type: 'subscribers'; min: number }
    | { type: 'money'; min: number }
    | { type: 'flags'; all: string[] }
    | { type: 'custom'; id: string }
  portrait: string
  speaker: string
  text: string
  choices: StoryChoice[]
}

const SCENES = [...(storyData.scenes as StoryScene[]), ...(storyArc2.scenes as StoryScene[])]

function hasArc1Ending(state: GameState): boolean {
  return state.flags.some((f) => f.startsWith('ending_')) || Boolean(state.ending)
}

function triggerMet(state: GameState, scene: StoryScene): boolean {
  const t = scene.trigger
  switch (t.type) {
    case 'start':
      return true
    case 'streams':
      return state.streamsDone >= t.min
    case 'subscribers':
      return state.subscribers >= t.min
    case 'money':
      return state.money >= t.min
    case 'flags':
      return t.all.every((f) => state.flags.includes(f))
    case 'custom':
      if (t.id === 'low_energy_once') return state.energy <= 1 && state.streamsDone >= 2
      if (t.id === 'arc2_ready') return hasArc1Ending(state) && state.subscribers >= 300
      if (t.id === 'high_toxicity') return state.toxicity >= 55 && hasArc1Ending(state)
      if (t.id === 'high_burnout') return state.burnout >= 70 && hasArc1Ending(state)
      if (t.id === 'arc2_ended')
        return state.flags.some((f) =>
          ['ending_empire', 'ending_auteur', 'ending_stable', 'ending_arc2_continue'].includes(f),
        )
      return false
    default:
      return false
  }
}

function choiceAvailable(state: GameState, choice: StoryChoice): boolean {
  if (!choice.requires?.anyFlags?.length) return true
  return choice.requires.anyFlags.some((f) => state.flags.includes(f))
}

export function getScene(id: string): StoryScene | undefined {
  return SCENES.find((s) => s.id === id)
}

export function findNextScene(state: GameState): StoryScene | null {
  for (const scene of SCENES) {
    if (state.seenScenes.includes(scene.id)) continue
    if (!triggerMet(state, scene)) continue

    if (scene.id === 'ending_fallback' || scene.id === 'arc2_ending_fallback') {
      const betterId = scene.id === 'ending_fallback' ? 'ending_creator' : 'arc2_ending_main'
      const better = SCENES.find(
        (s) =>
          s.id === betterId &&
          !state.seenScenes.includes(s.id) &&
          triggerMet(state, s) &&
          s.choices.some((c) => choiceAvailable(state, c)),
      )
      if (better) continue
    }

    if (scene.id.startsWith('ending_') || scene.id.startsWith('arc2_ending')) {
      const available = scene.choices.filter((c) => choiceAvailable(state, c))
      if (available.length === 0 && scene.choices.some((c) => c.requires)) continue
    }

    return scene
  }
  return null
}

export function queueStoryIfNeeded(state: GameState): GameState {
  if (state.pendingSceneId || state.stream.active) return state
  const next = findNextScene(state)
  if (!next) return state
  return { ...state, pendingSceneId: next.id }
}

export function availableChoices(state: GameState, scene: StoryScene): StoryChoice[] {
  const choices = scene.choices.filter((c) => choiceAvailable(state, c))
  return choices.length > 0 ? choices : scene.choices.filter((c) => !c.requires)
}

export function applyStoryChoice(state: GameState, sceneId: string, choiceId: string): GameState {
  const scene = getScene(sceneId)
  if (!scene || state.pendingSceneId !== sceneId) return state
  const choice = availableChoices(state, scene).find((c) => c.id === choiceId)
  if (!choice) return state

  const effects = choice.effects
  const flags = new Set(state.flags)
  for (const f of effects.flags ?? []) flags.add(f)

  let ending = state.ending
  for (const f of effects.flags ?? []) {
    if (f.startsWith('ending_')) ending = f
  }

  let unlockedThemes = [...state.unlockedThemes]
  let themeId = state.themeId
  if (effects.flags?.includes('theme_volt_unlock') && !unlockedThemes.includes('volt')) {
    unlockedThemes = [...unlockedThemes, 'volt']
    themeId = 'volt'
  }

  let burnout = state.burnout
  let toxicity = state.toxicity
  if (effects.flags?.includes('arc2_rest') || effects.flags?.includes('rested')) {
    burnout = clamp(burnout - 35, 0, 100)
  }
  if (effects.flags?.includes('arc2_apology')) {
    toxicity = clamp(toxicity - 25, 0, 100)
  }
  if (effects.flags?.includes('arc2_grind') || effects.flags?.includes('grind')) {
    burnout = clamp(burnout + 20, 0, 100)
  }

  let next: GameState = {
    ...state,
    money: state.money + (effects.money ?? 0),
    subscribers: Math.max(0, state.subscribers + (effects.subscribers ?? 0)),
    reputation: clamp(state.reputation + (effects.reputation ?? 0), -20, 100),
    hype: clamp(state.hype + (effects.hype ?? 0), 0, 9999),
    energy: clamp(state.energy + (effects.energy ?? 0), 0, state.maxEnergy),
    flags: [...flags],
    seenScenes: state.seenScenes.includes(sceneId)
      ? state.seenScenes
      : [...state.seenScenes, sceneId],
    pendingSceneId: null,
    ending,
    unlockedThemes,
    themeId,
    burnout,
    toxicity,
  }

  next = queueStoryIfNeeded(next)
  return next
}
