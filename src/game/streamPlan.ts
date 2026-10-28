import { baseViewers, calcStreamRewards, clickPower, streamMods, sumEffect } from './economy'
import { CATALOG, getGame } from './games'
import { personaMods } from './persona'
import { sumStaffEffect } from './staff'
import type { GameState, SponsorContract } from './state'
import { idleStream, isWeekend, STREAM_DURATION, WEEKEND_DURATION } from './state'

export { STREAM_STYLES, getStyle } from './streamStyles'

const TITLE_IDEAS = [
  'Уютный вечер с чатом',
  'Проходим то, что откладывали',
  'Первый раз в {game}',
  'Ночной эфир без спешки',
  'Отвечаю на вопросы и просто живу',
  'Маленький эфир с большой душой',
  'Сегодня точно без рейджа',
  '{game}: до победного',
  'Чат решает, что делать',
  'Спокойный старт недели',
  'Кринж, клатчи и донаты',
  'Стрим до первой ошибки',
]

export function randomStreamTitle(state: GameState): string {
  const game = getGame(state.selectedGameId).name
  const pool = TITLE_IDEAS.filter((t) => t !== state.streamTitle)
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? TITLE_IDEAS[0]!
  return pick.replace('{game}', game)
}

export type StreamForecast = { viewers: number; subs: number; money: number; donations: number; hype: number }

const AVG_CLICKS = 40
const AVG_FATE = 12
const AVG_DONATE_CHANCE = 0.028

/**
 * Pre-stream estimate: synthesizes an average-effort stream and runs it
 * through the real reward formula, so the forecast tracks balance changes.
 */
export function forecastStream(state: GameState): StreamForecast {
  const mods = streamMods(state)
  const duration = isWeekend() && state.streamsDone > 0 ? WEEKEND_DURATION + 8 : STREAM_DURATION
  const startViewers = Math.max(1, Math.floor(baseViewers(state) * mods.viewers))
  const viewers = Math.round(startViewers + AVG_CLICKS * 0.1 + duration * 0.05)

  const chatters = Math.min(56, Math.round(viewers * 0.85))
  const chatRate = 0.4 + Math.min(2.2, chatters / 18)
  const msgsPerSec = (chatters >= 25 ? 2.45 : 1.35) / (0.35 + 0.5 / chatRate)
  const audience = 1 + Math.min(3, viewers / 90)
  const chatDonations = duration * msgsPerSec * AVG_DONATE_CHANCE * 17.5 * audience * mods.donate
  const clickDonations = AVG_CLICKS * 0.06 * (1 + clickPower(state) * 0.7) * mods.donate
  const eventDonations = 25 * mods.donate

  const hypePerClick =
    (0.55 + clickPower(state) * 0.18) *
    1.3 *
    mods.hype *
    (1 + (sumEffect(state, 'hypeMult') + sumStaffEffect(state, 'hypeMult')) * 0.7)
  const hype = state.hype * 0.1 + AVG_CLICKS * hypePerClick + 0.07 * duration * mods.hype + 6

  const synthetic: GameState = {
    ...state,
    stream: {
      ...idleStream(state.contentType),
      active: true,
      style: state.streamStyle,
      viewers,
      clicks: AVG_CLICKS,
      hype,
      fateBonus: AVG_FATE,
      donations: chatDonations + clickDonations + eventDonations,
    },
  }
  const r = calcStreamRewards(synthetic)
  return { viewers, subs: r.subscribers, money: r.donations + r.streamBonus, donations: r.donations, hype }
}

export const SPONSOR_UNLOCK_SUBS = 75

const SPONSOR_BRANDS = [
  'Нова-Кола',
  'Квант Аудио',
  'PixelForge',
  'Терра Кофе',
  'Lumen Wear',
  'Орбита Энерджи',
  'Mint Mobile',
  'ByteBite',
  'Астра Банк',
  'CloudNine VPN',
]

export function sponsorsUnlocked(state: GameState): boolean {
  return state.subscribers >= SPONSOR_UNLOCK_SUBS
}

function rollOffer(state: GameState): SponsorContract | null {
  const owned = CATALOG.filter((g) => state.unlockedGames.includes(g.id))
  if (!owned.length) return null
  const game = owned[Math.floor(Math.random() * owned.length)]!
  const used = new Set([state.sponsorOffer?.brand, state.sponsorActive?.brand])
  const brands = SPONSOR_BRANDS.filter((b) => !used.has(b))
  const brand = brands[Math.floor(Math.random() * brands.length)] ?? SPONSOR_BRANDS[0]!
  const f = forecastStream({ ...state, selectedGameId: game.id })
  const minViewers = Math.max(3, Math.round(f.viewers * (0.7 + Math.random() * 0.25)))
  const reward = Math.round((50 + f.viewers * 8) * (0.85 + Math.random() * 0.4) * personaMods(state).sponsorReward)
  return {
    id: `sp_${state.day}_${Math.random().toString(36).slice(2, 7)}`,
    brand,
    gameId: game.id,
    minViewers,
    reward,
    deadlineDay: state.day + 3 + Math.floor(Math.random() * 3),
  }
}

/** Day rollover: expire contracts, sometimes bring a fresh offer. */
export function rollSponsorsForNewDay(state: GameState): GameState {
  let next = state
  if (next.sponsorActive && next.day > next.sponsorActive.deadlineDay) {
    next = {
      ...next,
      sponsorActive: null,
      sponsorFails: next.sponsorFails + 1,
      reputation: Math.max(-20, next.reputation - 3),
    }
  }
  if (next.sponsorOffer && next.day > next.sponsorOffer.deadlineDay) {
    next = { ...next, sponsorOffer: null }
  }
  if (!sponsorsUnlocked(next) || next.sponsorActive || next.sponsorOffer) return next
  if (Math.random() > 0.55 * personaMods(next).sponsorChance) return next
  return { ...next, sponsorOffer: rollOffer(next) }
}

export function acceptSponsor(state: GameState): GameState {
  if (!state.sponsorOffer || state.sponsorActive) return state
  return { ...state, sponsorActive: state.sponsorOffer, sponsorOffer: null }
}

export function declineSponsor(state: GameState): GameState {
  if (!state.sponsorOffer) return state
  return { ...state, sponsorOffer: null }
}

/** Checked when a stream ends; returns payout (0 if not fulfilled). */
export function settleSponsorAfterStream(state: GameState): { state: GameState; paid: number; brand: string } {
  const c = state.sponsorActive
  if (!c) return { state, paid: 0, brand: '' }
  const ok = state.selectedGameId === c.gameId && state.stream.viewers >= c.minViewers && !state.stream.endedEarly
  if (!ok) return { state, paid: 0, brand: '' }
  return {
    state: {
      ...state,
      sponsorActive: null,
      sponsorsDone: state.sponsorsDone + 1,
      reputation: Math.min(100, state.reputation + 2),
    },
    paid: c.reward,
    brand: c.brand,
  }
}
