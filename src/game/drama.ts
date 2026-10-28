import { getRival } from './battle'
import { shiftPersona } from './persona'
import { addMemory } from './regulars'
import type { DramaState, GameState } from './state'
import { clamp } from './state'

export const DRAMA_UNLOCK_STREAMS = 6
export const DRAMA_STEPS = 3

type Effects = {
  rep?: number
  hype?: number
  money?: number
  /** Share of current subscribers gained */
  subsPct?: number
  kind?: number
  bold?: number
  burnout?: number
  score: number
}

export type DramaChoice = {
  id: string
  label: string
  effects: Effects
  /** Risky: success chance, `fail` applies otherwise */
  chance?: number
  fail?: Effects
}

type DramaStep = { calm: string; hot: string; choices: DramaChoice[] }

type DramaDef = { id: string; title: string; steps: DramaStep[] }

const DRAMAS: DramaDef[] = [
  {
    id: 'old_post',
    title: 'Старый пост',
    steps: [
      {
        calm: 'В сеть всплыл твой пост пятилетней давности. В комментариях спорят, что ты имел в виду.',
        hot: 'В сеть всплыл твой пост пятилетней давности. В комментариях спорят, что ты имел в виду.',
        choices: [
          { id: 'op_sorry', label: 'Извиниться публично', effects: { rep: 2, hype: -10, kind: 5, score: 1 } },
          { id: 'op_quiet', label: 'Промолчать', effects: { hype: -5, bold: -2, score: 0 } },
          {
            id: 'op_snap',
            label: 'Огрызнуться в ответ',
            effects: { rep: -2, hype: 25, subsPct: 0.02, kind: -6, bold: 3, score: -1 },
          },
        ],
      },
      {
        calm: 'Многие приняли твою позицию, но обозреватель Тред-ТВ выпустил разбор ситуации.',
        hot: 'Обозреватели выпускают ролики про твой ответ — хейт растёт, как и просмотры.',
        choices: [
          { id: 'op_video', label: 'Записать честное видео', effects: { money: -40, rep: 2, kind: 3, score: 1 } },
          {
            id: 'op_invite',
            label: 'Позвать обозревателя на стрим',
            chance: 0.6,
            effects: { subsPct: 0.03, hype: 15, rep: 1, bold: 4, score: 1 },
            fail: { rep: -2, hype: 10, bold: 4, score: -1 },
          },
          { id: 'op_meme', label: 'Сделать мем из ситуации', effects: { hype: 20, subsPct: 0.015, bold: 2, kind: -2, score: -1 } },
        ],
      },
      {
        calm: 'Буря стихает. Последний шаг — как закрыть историю?',
        hot: 'Финал скандала: все ждут твоего последнего слова.',
        choices: [
          { id: 'op_charity', label: 'Благотворительный стрим', effects: { money: -80, rep: 3, kind: 6, score: 1 } },
          { id: 'op_merch', label: 'Выпустить мерч с мемом', effects: { money: 120, hype: 20, bold: 3, kind: -2, score: -1 } },
          { id: 'op_pause', label: 'Взять паузу и выдохнуть', effects: { burnout: -30, hype: -15, bold: -3, score: 0 } },
        ],
      },
    ],
  },
  {
    id: 'stolen_idea',
    title: 'Украденная идея',
    steps: [
      {
        calm: '{rival} заявил, что ты украл у него идею рубрики. Его чат уже в твоих комментариях.',
        hot: '{rival} заявил, что ты украл у него идею рубрики. Его чат уже в твоих комментариях.',
        choices: [
          {
            id: 'si_proof',
            label: 'Показать черновики с датами',
            chance: 0.65,
            effects: { rep: 2, bold: -1, score: 1 },
            fail: { rep: -1, bold: -1, score: 0 },
          },
          { id: 'si_collab', label: 'Предложить совместный стрим', effects: { kind: 4, hype: 5, score: 1 } },
          { id: 'si_envy', label: 'Назвать его завистником', effects: { kind: -5, bold: 3, hype: 25, rep: -1, score: -1 } },
        ],
      },
      {
        calm: '{rival} притих, но зрители требуют продолжения.',
        hot: 'Срач между каналами в трендах площадки!',
        choices: [
          { id: 'si_peace', label: 'Помириться в прямом эфире', effects: { kind: 4, rep: 2, subsPct: 0.02, score: 1 } },
          { id: 'si_tease', label: 'Подогреть интригу постом', effects: { hype: 20, subsPct: 0.02, bold: 2, score: -1 } },
          { id: 'si_ignore', label: 'Не реагировать', effects: { hype: -5, score: 0 } },
        ],
      },
      {
        calm: 'Площадка предлагает вам с {rival} шоу-матч, чтобы закрыть тему.',
        hot: 'Площадка предлагает вам с {rival} шоу-матч, чтобы закрыть тему.',
        choices: [
          { id: 'si_friendly', label: 'Дружеский матч', effects: { kind: 3, rep: 2, subsPct: 0.03, score: 1 } },
          {
            id: 'si_crush',
            label: 'Разгромить его в шоу',
            chance: 0.55,
            effects: { subsPct: 0.05, hype: 30, bold: 4, score: -1 },
            fail: { rep: -2, hype: 10, bold: 4, score: -1 },
          },
          { id: 'si_decline', label: 'Отказаться', effects: { bold: -3, score: 0 } },
        ],
      },
    ],
  },
  {
    id: 'fake_donate',
    title: 'Фейковый донат',
    steps: [
      {
        calm: 'Огромный донат оказался мошенническим — банк требует вернуть деньги, чат в панике.',
        hot: 'Огромный донат оказался мошенническим — банк требует вернуть деньги, чат в панике.',
        choices: [
          { id: 'fd_return', label: 'Вернуть из своих', effects: { money: -60, rep: 2, kind: 2, score: 1 } },
          { id: 'fd_tell', label: 'Рассказать чату всё как есть', effects: { hype: 10, bold: 1, score: 0 } },
          { id: 'fd_blame', label: 'Обвинить донатера в эфире', effects: { hype: 20, kind: -4, rep: -1, score: -1 } },
        ],
      },
      {
        calm: 'Зрители сочувствуют: многие предлагают скинуться на возврат.',
        hot: 'В сети ищут донатера — ситуация выходит из-под контроля.',
        choices: [
          { id: 'fd_refuse', label: 'Отказаться от помощи', effects: { kind: 3, rep: 2, score: 1 } },
          { id: 'fd_accept', label: 'Принять помощь чата', effects: { money: 80, kind: 1, score: 0 } },
          { id: 'fd_probe', label: 'Расследование на стриме', effects: { hype: 25, subsPct: 0.02, bold: 3, score: -1 } },
        ],
      },
      {
        calm: 'Банк закрыл дело. Чем закончишь историю?',
        hot: 'Банк закрыл дело. Чем закончишь историю?',
        choices: [
          { id: 'fd_guide', label: 'Гайд по безопасным донатам', effects: { rep: 2, subsPct: 0.02, kind: 2, score: 1 } },
          { id: 'fd_show', label: 'Шоу-разоблачение', effects: { hype: 30, subsPct: 0.03, bold: 3, kind: -2, score: -1 } },
          { id: 'fd_forget', label: 'Просто забыть', effects: { burnout: -15, score: 0 } },
        ],
      },
    ],
  },
]

function getDef(id: string): DramaDef {
  return DRAMAS.find((d) => d.id === id) ?? DRAMAS[0]!
}

function moneyScale(state: GameState): number {
  return Math.min(20, 1 + state.subscribers / 400)
}

function rivalName(state: GameState): string {
  return getRival(state, state.nemesisId)?.name ?? state.rivals[0]?.name ?? 'Соперник'
}

export function dramaTitle(drama: DramaState): string {
  return getDef(drama.id).title
}

/** Pending step to show today, or null */
export function dramaStep(state: GameState): { text: string; choices: DramaChoice[]; step: number } | null {
  const d = state.drama
  if (!d || d.step >= DRAMA_STEPS || d.lastDay >= state.day) return null
  const step = getDef(d.id).steps[d.step]!
  const text = (d.score < 0 ? step.hot : step.calm).replace(/\{rival\}/g, rivalName(state))
  const scale = moneyScale(state)
  const choices = step.choices.map((c) => ({
    ...c,
    label: c.label.replace(/\{rival\}/g, rivalName(state)),
    effects: { ...c.effects, money: c.effects.money ? Math.round(c.effects.money * scale) : undefined },
  }))
  return { text, choices, step: d.step }
}

export function dramaFinished(state: GameState): boolean {
  return Boolean(state.drama && state.drama.step >= DRAMA_STEPS)
}

/** Day rollover: start a new arc every 2–3 weeks. */
export function maybeStartDrama(state: GameState): GameState {
  if (state.drama || state.streamsDone < DRAMA_UNLOCK_STREAMS || state.day < state.dramaNextDay) return state
  const done = state.dramasDone ?? []
  const pool = DRAMAS.filter((d) => !done.includes(d.id))
  const list = pool.length ? pool : DRAMAS
  const def = list[Math.floor(Math.random() * list.length)]!
  return {
    ...state,
    drama: { id: def.id, step: 0, lastDay: state.day - 1, score: 0, subs: 0, outcome: '' },
    dramasDone: pool.length ? done : [],
  }
}

function applyEffects(state: GameState, e: Effects): { state: GameState; subs: number } {
  const subs = e.subsPct ? Math.max(1, Math.round(state.subscribers * e.subsPct + 3)) : 0
  let next: GameState = {
    ...state,
    reputation: clamp(state.reputation + (e.rep ?? 0), -20, 100),
    hype: clamp(state.hype + (e.hype ?? 0), 0, 9999),
    money: state.money + (e.money ?? 0),
    subscribers: state.subscribers + subs,
    burnout: clamp(state.burnout + (e.burnout ?? 0), 0, 100),
  }
  next = shiftPersona(next, { kind: e.kind ?? 0, bold: e.bold ?? 0 })
  return { state: next, subs }
}

export function answerDrama(state: GameState, choiceId: string): { state: GameState; failed: boolean } {
  const view = dramaStep(state)
  const d = state.drama
  if (!view || !d) return { state, failed: false }
  const choice = view.choices.find((c) => c.id === choiceId)
  if (!choice) return { state, failed: false }
  const failed = choice.chance !== undefined && Math.random() > choice.chance
  const effects = failed && choice.fail ? choice.fail : choice.effects
  const applied = applyEffects(state, effects)
  let next = applied.state
  const score = d.score + effects.score
  let subs = d.subs + applied.subs
  const step = d.step + 1
  let outcome = ''
  if (step >= DRAMA_STEPS) {
    // Any ending brings attention; the clean path keeps reputation, the scandal path buys reach
    const pct = score >= 2 ? 0.04 : score <= -2 ? 0.07 : 0.02
    const bonus = Math.round(next.subscribers * pct + 5)
    subs += bonus
    next = {
      ...next,
      subscribers: next.subscribers + bonus,
      reputation: clamp(next.reputation + (score >= 2 ? 3 : score <= -2 ? -3 : 0), -20, 100),
      hype: clamp(next.hype + (score <= -2 ? 40 : 10), 0, 9999),
    }
    outcome =
      score >= 2
        ? 'Буря улеглась: зрители оценили честность, репутация выросла.'
        : score <= -2
          ? 'Скандал сделал тебя знаменитым: хайп огромный, но репутация просела.'
          : 'История затихла. Кто-то ушёл, но новых зрителей пришло больше.'
    next = addMemory(next, 'drama')
    if (choiceId === 'op_charity') next = addMemory(next, 'charity')
  }
  next = { ...next, drama: { ...d, step, lastDay: state.day, score, subs, outcome } }
  return { state: next, failed }
}

export function closeDrama(state: GameState): GameState {
  const d = state.drama
  if (!d || d.step < DRAMA_STEPS) return state
  return {
    ...state,
    drama: null,
    dramasDone: [...(state.dramasDone ?? []), d.id],
    dramaNextDay: state.day + 14 + Math.floor(Math.random() * 8),
  }
}
