import type { StreamStyleId } from './state'

export type StreamStyleDef = {
  id: StreamStyleId
  name: string
  hint: string
  mods: { viewers: number; donate: number; subs: number; fatigue: number; hype: number }
}

export const STREAM_STYLES: StreamStyleDef[] = [
  {
    id: 'calm',
    name: 'Спокойный',
    hint: 'Меньше усталости, зрители дольше остаются',
    mods: { viewers: 1.05, donate: 0.95, subs: 0.97, fatigue: 0.8, hype: 0.9 },
  },
  {
    id: 'energy',
    name: 'Энергичный',
    hint: 'Больше хайпа и донатов, но быстрее устаёшь',
    mods: { viewers: 0.97, donate: 1.12, subs: 1.1, fatigue: 1.2, hype: 1.18 },
  },
  {
    id: 'chat',
    name: 'Общение с чатом',
    hint: 'Активный чат: донаты и подписки',
    mods: { viewers: 1.02, donate: 1.15, subs: 1.05, fatigue: 1, hype: 1 },
  },
  {
    id: 'pro',
    name: 'Хардкор',
    hint: 'Скилл и клипы: хайп выше, донатов меньше',
    mods: { viewers: 1, donate: 0.88, subs: 1.04, fatigue: 1.08, hype: 1.15 },
  },
]

export function getStyle(id: StreamStyleId | undefined): StreamStyleDef {
  return STREAM_STYLES.find((s) => s.id === id) ?? STREAM_STYLES[0]!
}
