import type { GameState } from './state'
import { FAIL_ENDINGS } from './state'

export type FailEndingId = (typeof FAIL_ENDINGS)[number]

export function isFailEnding(ending: string | null): ending is FailEndingId {
  return Boolean(ending && (FAIL_ENDINGS as readonly string[]).includes(ending))
}

export function isGameLocked(state: GameState): boolean {
  return isFailEnding(state.ending)
}

export function failEndingCopy(ending: FailEndingId): { title: string; body: string } {
  switch (ending) {
    case 'ending_bankrupt':
      return {
        title: 'Банкротство',
        body: 'Счета пустые, аренда не оплачена. Студия закрыта — канал ушёл в архив.',
      }
    case 'ending_burnout':
      return {
        title: 'Выгорание',
        body: 'Сил больше нет. Эфиры сорваны, чат затих. Нужен долгий перерыв — игра окончена.',
      }
    case 'ending_cancelled':
      return {
        title: 'Отмена канала',
        body: 'Токсичность и хейт сожгли аудиторию. Площадка сняла канал с рекомендаций навсегда.',
      }
  }
}

/** Evaluate fail endings after sleep / stream settle. Story endings stay if already set. */
export function checkFailEndings(state: GameState): GameState {
  if (state.ending) return state

  if (state.money <= -80 || (state.money < 0 && state.debtDays >= 3)) {
    return {
      ...state,
      ending: 'ending_bankrupt',
      flags: state.flags.includes('ending_bankrupt')
        ? state.flags
        : [...state.flags, 'ending_bankrupt'],
    }
  }

  if (
    (state.burnout >= 100 && state.daysWithoutStream >= 2) ||
    (state.burnout >= 95 && state.energy <= 0 && state.daysWithoutStream >= 1)
  ) {
    return {
      ...state,
      ending: 'ending_burnout',
      flags: state.flags.includes('ending_burnout')
        ? state.flags
        : [...state.flags, 'ending_burnout'],
    }
  }

  if (
    (state.subscribers <= 0 && state.streamsDone >= 3) ||
    (state.toxicity >= 95 && state.subscribers < 15 && state.streamsDone >= 4)
  ) {
    return {
      ...state,
      ending: 'ending_cancelled',
      flags: state.flags.includes('ending_cancelled')
        ? state.flags
        : [...state.flags, 'ending_cancelled'],
      subscribers: Math.max(0, state.subscribers),
    }
  }

  return state
}
