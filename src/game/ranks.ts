import type { GameState } from './state'

export type RankDef = {
  id: number
  name: string
  minSubs: number
  /** Shown on the rank-up screen */
  unlock: string
}

export const RANKS: RankDef[] = [
  { id: 0, name: 'Новичок', minSubs: 0, unlock: 'Первые шаги в эфире' },
  { id: 1, name: 'Микро', minSubs: 50, unlock: 'Клипмейкер в команде · спонсоры скоро' },
  { id: 2, name: 'Растущий', minSubs: 150, unlock: 'Менеджер и редактор Shorts · переезд в студию' },
  { id: 3, name: 'Средний', minSubs: 400, unlock: 'Больше рейдов и суперфанов' },
  { id: 4, name: 'Крупный', minSubs: 1000, unlock: 'Ребрендинг (престиж) · офис' },
  { id: 5, name: 'Звезда', minSubs: 2500, unlock: 'Соперники зовут на коллабы' },
  { id: 6, name: 'Партнёр', minSubs: 6000, unlock: 'Партнёрка площадки: +10% к донатам · медиахаус' },
  { id: 7, name: 'Медийный', minSubs: 15000, unlock: 'Тебя зовут на фестивали' },
  { id: 8, name: 'Легенда', minSubs: 50000, unlock: 'Тебя узнают на улице' },
  { id: 9, name: 'Серебряная кнопка', minSubs: 100000, unlock: '100 000 подписчиков!' },
  { id: 10, name: 'Золотая кнопка', minSubs: 1000000, unlock: 'Миллион. Ты дошёл до вершины' },
]

export function getRank(state: GameState): RankDef {
  let current = RANKS[0]!
  for (const r of RANKS) {
    if (state.subscribers >= r.minSubs) current = r
  }
  return current
}

export function rankId(state: GameState): number {
  return getRank(state).id
}

export function nextRank(state: GameState): RankDef | null {
  return RANKS[getRank(state).id + 1] ?? null
}

/** 0..1 progress from current rank threshold to the next */
export function rankProgress(state: GameState): number {
  const cur = getRank(state)
  const next = nextRank(state)
  if (!next) return 1
  return Math.min(1, (state.subscribers - cur.minSubs) / Math.max(1, next.minSubs - cur.minSubs))
}
