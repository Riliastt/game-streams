import type { Fan, GameState } from './state'

export const FAN_ALBUM_SIZE = 40

export const FAN_RARITY_LABEL: Record<Fan['rarity'], string> = {
  common: 'Обычный',
  rare: 'Редкий',
  epic: 'Эпический',
}

export const FAN_RARITY_BONUS: Record<Fan['rarity'], string> = {
  common: '+1% к донатам',
  rare: '+2% к донатам',
  epic: '+4% к донатам',
}

function rollRarity(): Fan['rarity'] {
  const r = Math.random()
  return r < 0.06 ? 'epic' : r < 0.3 ? 'rare' : 'common'
}

/** Chance-based: a chatter from this stream becomes a collectible superfan. */
export function tryRecruitFan(state: GameState, chance: number): GameState {
  const fans = state.fans ?? []
  if (state.stream.newFan || fans.length >= FAN_ALBUM_SIZE || Math.random() > chance) return state
  const owned = new Set(fans.map((f) => f.nick))
  const pool = (state.stream.chatters ?? []).filter((n) => !owned.has(n))
  if (!pool.length) return state
  const nick = pool[Math.floor(Math.random() * pool.length)]!
  const fan: Fan = { nick, rarity: rollRarity(), day: state.day, mood: 70, streams: 0 }
  return {
    ...state,
    fans: [...fans, fan],
    stream: { ...state.stream, newFan: nick },
  }
}
