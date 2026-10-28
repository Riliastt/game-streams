import { formatGoLiveLine, syncChatters, systemChat, tickChat } from './chat'
import { baseViewers, clickPower, streamMods, sumEffect } from './economy'
import { gainFormatSkill } from './formatSkills'
import { checkFailEndings, isGameLocked } from './endings'
import { bumpGamePlay, getGame } from './games'
import { sumStaffEffect } from './staff'
import type { GameState, StreamAlert, StreamEvent, StreamEventKind } from './state'
import {
  clamp,
  EVENT_TTL,
  idleStream,
  isWeekend,
  MAX_EVENTS_PER_STREAM,
  STREAM_DURATION,
  TUTORIAL_DURATION,
  WEEKEND_DURATION,
} from './state'
import { forecastStream, settleSponsorAfterStream } from './streamPlan'
import { tryRecruitFan } from './fans'
import { randomRivalName } from './rivals'
import { gearLevel } from './gear'
import { createBattle, getRival, settleBattle, tickBattle } from './battle'
import { goalName, goalsUnlocked, goalTarget } from './goal'
import { applyChoicePersona, personaChatLine, personaTraits } from './persona'
import { addMemory, pickRegulars, settleRegulars, shiftRegularMood, tickRegulars, type MemoryId } from './regulars'
import { BATTLE_DURATION, CHAT_LIMIT } from './state'

const EVENT_TEXTS: Record<StreamEventKind, string[]> = {
  question: [
    'Зритель: «Какая у тебя мечта?»',
    'Зритель: «Советуешь начинающим?»',
    'Зритель: «Когда новый влог?»',
  ],
  hate: [
    'Хейтер: «Скучно, удали канал»',
    'Хейтер: «Ты продажный»',
    'Хейтер: «Контент нулевой»',
  ],
  donate: [
    'Донат 50₽: «На пиццу стримеру!»',
    'Донат 100₽: «Ты топ, держи»',
    'Донат 30₽: «За вайб»',
  ],
  hype: ['Клип залетел в чат!', 'Мем про вас разлетается!', 'Чатик взорвался!'],
  raid: ['Рейд от соседнего канала!', 'К вам пришла толпа с другого стрима!', 'Рейд-алерт!'],
  tech_fail: ['Микрофон заикается…', 'Кадры тормозят — тех. сбой!', 'Свет моргнул на всю комнату'],
  sponsor_read: ['Пора зачитать спонсора?', 'Интеграция в эфире — читать?', 'Бренд просит упоминание'],
  mod_help: ['Марина: «Забанить токсика?»', 'Модер: «Чистим чат?»', 'Модер предлагает тайм-аут'],
  clutch: ['Босс с одной жизнью! Как сыграешь?', 'Решающий момент партии — риск или сейф?', 'Клаutch-раунд!'],
  viral_moment: ['Чат орёт «КЛИПАЙ» — момент золотой!', 'Алгоритм уже смотрит… что сделаешь?', 'Момент для вирала!'],
  chat_war: ['В чате война двух лагерей!', 'Срач разгорается — вмешаться?', 'Моды пишут: чат кипит'],
  super_fan: ['Суперфан кидает жирный донат!', 'Подписчик года: «Держи на развитие»', 'Мега-донат врывается!'],
  algo_boost: ['Рекомендации подхватили эфир!', 'Пуш от площадки — лови волну?', 'Внезапный приток зрителей'],
  end_threat: ['Интернет моргает — стрим может оборваться!', 'Выгорание бьёт — закончить раньше?', 'ПК греется опасно…'],
  charity: [
    'Чат предлагает: часть донатов — в фонд помощи животным 🐾',
    'Зритель просит поддержать благотворительный сбор',
  ],
  drama_bait: ['Хейтер провоцирует на срач — чат хочет шоу 🍿', 'Чат скандирует: «РАЗНЕСИ ЕГО!»'],
  stunt: ['Чат предлагает челлендж: играть с закрытыми глазами!', 'Донатер: «Сделаешь безумный трюк — закину сотку»'],
  cozy: ['Чат просит просто поговорить по душам', 'Зрители: «давай спокойный разговор под музыку»'],
  hate_raid: ['Хейт-рейд — чат заполнили тролли!'],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function pushAlert(state: GameState, text: string, tone: StreamAlert['tone']): GameState {
  const alerts = [...state.stream.alerts, { id: uid('a'), text, tone, ttl: 2.4 }].slice(-4)
  return { ...state, stream: { ...state.stream, alerts } }
}

export function canStartStream(state: GameState): boolean {
  return (
    !isGameLocked(state) &&
    !state.stream.active &&
    state.dayPhase === 'stream' &&
    state.energy >= 1 &&
    !state.pendingSceneId &&
    state.burnout < 95
  )
}

export function startStream(state: GameState): GameState {
  if (!canStartStream(state)) return state
  const mods = streamMods(state)
  const viewers = Math.max(1, Math.floor(baseViewers(state) * mods.viewers))
  const game = getGame(state.selectedGameId)
  const isLetsplay = state.contentType === 'letsplay'
  const tutorial = state.streamsDone === 0
  const fc = forecastStream(state)
  const startHype = Math.floor(state.hype * 0.1)
  const battle = tutorial ? null : createBattle(state, fc.hype - state.hype * 0.1, startHype)
  const weekend = !tutorial && !battle && isWeekend()
  const goalTier = tutorial || !goalsUnlocked(state) ? 0 : state.goalTier
  const target = goalTarget(fc.donations * (battle ? 0.9 : 1), goalTier)
  let next: GameState = {
    ...state,
    energy: state.energy - 1,
    burnout: clamp(state.burnout + 4, 0, 100),
    toxicity: clamp(
      state.toxicity + (isLetsplay && game.toxicityRisk > 0 ? 2 : 0),
      0,
      100,
    ),
    stream: {
      ...idleStream(state.contentType),
      active: true,
      viewers,
      hype: startHype,
      duration: tutorial
        ? TUTORIAL_DURATION
        : battle
          ? BATTLE_DURATION
          : weekend
            ? WEEKEND_DURATION
            : STREAM_DURATION,
      sticker: null,
      style: state.streamStyle,
      title: state.streamTitle.trim(),
      tutorial,
      weekend,
      eventCooldown: tutorial ? 20 : 8,
      goalTarget: target,
      goalTier: target > 0 ? goalTier : 0,
      battle,
      regulars: tutorial ? [] : pickRegulars(state),
    },
    battleArmed: battle ? null : state.battleArmed,
  }
  next = syncChatters(next)
  const regulars = next.stream.regulars
  if (regulars.length) {
    const chatters = Array.from(new Set([...regulars, ...next.stream.chatters]))
    next = { ...next, stream: { ...next.stream, chatters } }
  }
  next = systemChat(next, formatGoLiveLine(state.channelName, state.contentType, game.name))
  if (battle) next = systemChat(next, `⚔ Баттл с ${battle.name}! Набери больше хайпа за ${BATTLE_DURATION}с`)
  if (target > 0) next = systemChat(next, `🎯 Цель доната: «${goalName(state)}» — ${target}₽`)
  return next
}

/** Arcade minigame outcome from GameplayLayer — ties visuals to rewards. */
export function applyArcadeOutcome(state: GameState, hit: boolean): GameState {
  if (!state.stream.active || state.paused) return state
  if (hit) {
    const bonusHype = 0.7 + state.stream.combo * 0.06
    const bonusDonate = Math.random() < 0.07 + state.stream.combo * 0.008 ? 1 + Math.floor(state.stream.combo / 4) : 0
    return {
      ...state,
      stream: {
        ...state.stream,
        hype: state.stream.hype + bonusHype,
        donations: state.stream.donations + bonusDonate,
        lastDonateAmount: bonusDonate > 0 ? bonusDonate : state.stream.lastDonateAmount,
        floats: [
          ...state.stream.floats,
          {
            id: uid('af'),
            text: bonusDonate > 0 ? `HIT +${bonusDonate}₽` : 'HIT!',
            x: 35 + Math.random() * 35,
            y: 35 + Math.random() * 25,
            ttl: 0.65,
          },
        ].slice(-12),
      },
    }
  }
  return {
    ...state,
    stream: {
      ...state.stream,
      fatigue: clamp(state.stream.fatigue + 3, 0, 100),
      combo: 0,
      comboTimer: 0,
      floats: [
        ...state.stream.floats,
        {
          id: uid('am'),
          text: 'MISS',
          x: 40 + Math.random() * 30,
          y: 45 + Math.random() * 20,
          ttl: 0.55,
        },
      ].slice(-12),
    },
  }
}

function pushSticker(state: GameState, text: string): GameState {
  return {
    ...state,
    stream: {
      ...state.stream,
      sticker: { id: uid('st'), text, ttl: 0.85 },
    },
  }
}

export type ClickResult = { state: GameState; donateGain: number; hypeGain: number; comboHit: boolean }

export function streamClick(state: GameState): ClickResult {
  if (!state.stream.active || state.paused) {
    return { state, donateGain: 0, hypeGain: 0, comboHit: false }
  }

  const power = clickPower(state)
  const fatigueMult = Math.max(0.35, 1 - sumEffect(state, 'fatigueReduce'))
  const mods = streamMods(state)
  const comboWindow = 1.2 + sumEffect(state, 'comboBonus')
  const nextCombo = state.stream.comboTimer > 0 ? state.stream.combo + 1 : 1
  const comboMult = (1 + Math.min(2, nextCombo * 0.05)) * mods.combo
  const burnoutPenalty = state.burnout > 70 ? 0.75 : 1

  const gainViewers = Math.random() < 0.1 ? 1 : 0
  const donateChance = 0.045 + state.stream.combo * 0.003
  const donateGain =
    Math.random() < donateChance ? Math.round((1 + power * 0.7) * mods.donate * burnoutPenalty) : 0
  const hypeGain =
    (0.55 + power * 0.18) *
    comboMult *
    mods.hype *
    (1 + (sumEffect(state, 'hypeMult') + sumStaffEffect(state, 'hypeMult')) * 0.7) *
    burnoutPenalty

  let next: GameState = {
    ...state,
    bestCombo: Math.max(state.bestCombo, nextCombo),
    stream: {
      ...state.stream,
      clicks: state.stream.clicks + 1,
      combo: nextCombo,
      comboTimer: comboWindow,
      peakCombo: Math.max(state.stream.peakCombo, nextCombo),
      viewers: state.stream.viewers + gainViewers,
      donations: state.stream.donations + donateGain,
      hype: state.stream.hype + hypeGain,
      // Fatigue comes from time and misses; skilled clicking is not punished
      fatigue: clamp(state.stream.fatigue + 0.15 * fatigueMult * mods.fatigue, 0, 100),
      lastDonateAmount: donateGain,
      floats: [
        ...state.stream.floats,
        {
          id: uid('f'),
          text: donateGain > 0 ? `+${donateGain}₽` : `+${hypeGain.toFixed(0)} hype`,
          x: 40 + Math.random() * 40,
          y: 40 + Math.random() * 30,
          ttl: 0.7,
        },
      ].slice(-12),
    },
  }

  let comboHit = false
  if (nextCombo === 5 || nextCombo === 10 || nextCombo === 15) {
    comboHit = true
    next = pushAlert(next, `Комбо x${nextCombo}!`, 'combo')
    next = pushSticker(next, nextCombo >= 15 ? 'POG' : 'LOL')
  }
  if (donateGain > 0) {
    next = pushAlert(next, `Донат +${donateGain}₽`, 'donate')
    next = pushSticker(next, '$$')
  }

  return { state: next, donateGain, hypeGain, comboHit }
}

export function tickStream(state: GameState, dt: number): GameState {
  if (!state.stream.active || state.paused) return state

  let next = tickChat(state, dt)

  let stream = {
    ...next.stream,
    elapsed: next.stream.elapsed + dt,
    comboTimer: Math.max(0, next.stream.comboTimer - dt),
    alerts: next.stream.alerts
      .map((a) => ({ ...a, ttl: a.ttl - dt }))
      .filter((a) => a.ttl > 0),
    floats: next.stream.floats
      .map((f) => ({ ...f, ttl: f.ttl - dt }))
      .filter((f) => f.ttl > 0),
    sticker:
      next.stream.sticker && next.stream.sticker.ttl - dt > 0
        ? { ...next.stream.sticker, ttl: next.stream.sticker.ttl - dt }
        : null,
  }

  if (stream.comboTimer <= 0) {
    stream = { ...stream, combo: 0 }
  }

  const mods = streamMods(next)
  const fatigueMult = Math.max(0.35, 1 - sumEffect(next, 'fatigueReduce'))
  // Weekend subathon: every donation adds time to the clock
  const donated = stream.donations > state.stream.donations
  stream = {
    ...stream,
    viewers: stream.viewers + (Math.random() < 0.05 * dt ? 1 : 0),
    donations: stream.donations + (Math.random() < 0.025 * dt ? 1 : 0),
    hype: stream.hype + 0.07 * dt * mods.hype,
    fatigue: clamp(stream.fatigue + 0.85 * dt * mods.fatigue * fatigueMult, 0, 100),
    duration:
      stream.weekend && donated ? Math.min(WEEKEND_DURATION + 30, stream.duration + 1.5) : stream.duration,
  }

  next = { ...next, stream }
  next = runTutorialScript(next)
  next = tickRegulars(next, dt)
  next = tickBattle(next, dt)
  if (next.stream.goalTarget > 0 && !next.stream.goalHit && next.stream.donations >= next.stream.goalTarget) {
    next = {
      ...next,
      stream: { ...next.stream, goalHit: true, hype: next.stream.hype + 8, fateBonus: next.stream.fateBonus + 6 },
    }
    next = systemChat(next, '🎉 Цель доната собрана! Чат празднует')
    next = pushAlert(next, 'Цель собрана!', 'combo')
    next = pushSticker(next, 'POG')
  }
  if (Math.random() < 0.06 * dt) {
    const line = personaChatLine(next)
    const chatters = next.stream.chatters
    if (line && chatters.length) {
      const user = chatters[Math.floor(Math.random() * chatters.length)]!
      next = {
        ...next,
        stream: {
          ...next.stream,
          chat: [...next.stream.chat, { id: uid('pc'), user, text: line, kind: 'chat' as const }].slice(-CHAT_LIMIT),
        },
      }
    }
  }

  if (next.stream.event) {
    const ttl = next.stream.eventTtl - dt
    if (ttl <= 0) return autoResolveEvent(next)
    next = { ...next, stream: { ...next.stream, eventTtl: ttl } }
  } else {
    const cooldown = next.stream.eventCooldown - dt
    const cap = next.stream.tutorial ? 1 : MAX_EVENTS_PER_STREAM
    const remaining = next.stream.duration - next.stream.elapsed
    if (cooldown <= 0 && next.stream.eventsSeen < cap && remaining > EVENT_TTL + 1 && Math.random() < 0.3 * dt) {
      next = {
        ...next,
        stream: {
          ...next.stream,
          event: next.stream.tutorial ? createTutorialEvent() : createStreamEvent(next),
          eventsSeen: next.stream.eventsSeen + 1,
          eventTtl: EVENT_TTL,
          eventCooldown: 0,
        },
      }
    } else {
      next = { ...next, stream: { ...next.stream, eventCooldown: Math.max(0, cooldown) } }
    }
  }

  if (next.stream.elapsed >= next.stream.duration || next.stream.fatigue >= 100) {
    return finishStream(next)
  }

  return next
}

const SCRIPT_DONATE = 1
const SCRIPT_RAID = 2

/** First stream: guaranteed donation and raid so the newcomer feels the fantasy fast. */
function runTutorialScript(state: GameState): GameState {
  const s = state.stream
  if (!s.tutorial) return state
  let next = state
  if (!(s.script & SCRIPT_DONATE) && s.elapsed >= 10) {
    next = {
      ...next,
      stream: { ...next.stream, donations: next.stream.donations + 50, script: next.stream.script | SCRIPT_DONATE },
    }
    next = systemChat(next, 'mira_ttv задонатила 50₽: «Удачи с каналом!»')
    next = pushAlert(next, 'Первый донат! +50₽', 'donate')
    next = pushSticker(next, '$$')
  }
  if (!(next.stream.script & SCRIPT_RAID) && next.stream.elapsed >= 17) {
    next = {
      ...next,
      stream: {
        ...next.stream,
        viewers: next.stream.viewers + 8,
        hype: next.stream.hype + 6,
        script: next.stream.script | SCRIPT_RAID,
      },
    }
    next = syncChatters(next)
    next = pushAlert(next, 'Рейд! +8 зрителей', 'raid')
  }
  return next
}

function createTutorialEvent(): StreamEvent {
  return {
    id: uid('ev'),
    kind: 'question',
    text: 'Зритель: «Это твой первый стрим? Расскажи о себе!»',
    choices: [
      { id: 'q_nice', label: 'Ответить тепло', effect: 'good' },
      { id: 'q_short', label: 'Коротко и дальше', effect: 'neutral' },
    ],
  }
}

/** Timer ran out: neutral choice if present, otherwise the chat just moves on. */
function autoResolveEvent(state: GameState): GameState {
  const event = state.stream.event
  if (!event) return state
  const neutral = event.choices.find((c) => c.effect === 'neutral')
  const ignored = shiftRegularMood(state, -6)
  if (neutral) {
    const resolved = resolveStreamEvent(ignored, neutral.id)
    return pushAlert(resolved, 'Чат не дождался — выбран спокойный вариант', 'info')
  }
  const strain = event.kind === 'tech_fail' || event.kind === 'end_threat' ? 6 : 0
  const next: GameState = {
    ...ignored,
    stream: {
      ...state.stream,
      event: null,
      eventTtl: 0,
      eventCooldown: 9,
      fatigue: clamp(state.stream.fatigue + strain, 0, 100),
    },
  }
  return pushAlert(next, 'Момент упущен', 'info')
}

function weightedKind(state: GameState): StreamEventKind {
  const tox = state.toxicity
  const hasMod = sumStaffEffect(state, 'hateResist') + sumEffect(state, 'hateResist') > 0
  const p = personaTraits(state)
  const hasNemesis = Boolean(getRival(state, state.nemesisId))
  const weights: { k: StreamEventKind; w: number }[] = [
    { k: 'question', w: 14 },
    { k: 'hate', w: (10 + tox * 0.15) * (p.kind ? 0.5 : p.toxic ? 1.5 : 1) },
    { k: 'charity', w: p.kind ? 8 : 0 },
    { k: 'drama_bait', w: p.toxic ? 9 : 0 },
    { k: 'stunt', w: p.bold ? 9 : 0 },
    { k: 'cozy', w: p.careful ? 8 : 0 },
    { k: 'hate_raid', w: hasNemesis ? 6 : 0 },
    { k: 'donate', w: 14 },
    { k: 'hype', w: 10 },
    { k: 'raid', w: 8 },
    { k: 'tech_fail', w: 7 },
    { k: 'sponsor_read', w: state.flags.includes('brand_deal') || state.flags.includes('brand_soft') ? 8 : 2 },
    { k: 'mod_help', w: hasMod ? 10 : 2 },
    { k: 'clutch', w: 11 },
    { k: 'viral_moment', w: 10 },
    { k: 'chat_war', w: 8 + tox * 0.1 },
    { k: 'super_fan', w: 9 },
    { k: 'algo_boost', w: 8 },
    { k: 'end_threat', w: state.stream.fatigue > 50 || state.burnout > 40 ? 12 : 5 },
  ]
  const total = weights.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * total
  for (const item of weights) {
    r -= item.w
    if (r <= 0) return item.k
  }
  return 'question'
}

function chance(v: number): number {
  return Math.round(clamp(v, 0.2, 0.9) * 100) / 100
}

function createStreamEvent(state: GameState): StreamEvent {
  const kind = weightedKind(state)
  const style = state.stream.style
  const pc = gearLevel(state, 'pc')
  const base: StreamEvent = {
    id: uid('ev'),
    kind,
    text:
      kind === 'raid'
        ? `${randomRivalName(state)} рейдит к тебе со своим чатом!`
        : kind === 'hate_raid'
          ? `Заклятый соперник ${getRival(state, state.nemesisId)?.name ?? ''} прислал хейт-рейд!`
          : pick(EVENT_TEXTS[kind]),
    choices: [],
  }
  const persona = state.persona ?? { kind: 0, bold: 0 }

  switch (kind) {
    case 'question':
      base.choices = [
        { id: 'q_nice', label: 'Ответить тепло', effect: 'good' },
        { id: 'q_short', label: 'Коротко и дальше', effect: 'neutral' },
      ]
      break
    case 'hate': {
      const resist = sumEffect(state, 'hateResist') + sumStaffEffect(state, 'hateResist') > 0
      base.choices = [
        { id: 'h_mod', label: resist ? 'Модерация' : 'Игнор', effect: 'good' },
        { id: 'h_fight', label: 'Ответить жёстко', effect: 'bad' },
      ]
      break
    }
    case 'donate':
      base.choices = [
        { id: 'd_thanks', label: 'Сказать спасибо', effect: 'good' },
        { id: 'd_read', label: 'Зачитать донат', effect: 'neutral' },
      ]
      break
    case 'hype':
      base.choices = [
        { id: 'y_ride', label: 'Поймать волну', effect: 'good' },
        { id: 'y_calm', label: 'Держать темп', effect: 'neutral' },
      ]
      break
    case 'raid':
      base.choices = [
        { id: 'r_welcome', label: 'Привет рейду!', effect: 'good' },
        { id: 'r_shy', label: 'Смутиться', effect: 'neutral' },
      ]
      break
    case 'tech_fail':
      base.choices = [
        { id: 't_fix', label: 'Починить на коленке', effect: 'good', chance: chance(0.55 + pc * 0.04) },
        { id: 't_ignore', label: 'Игнор и продолжать', effect: 'bad' },
      ]
      break
    case 'sponsor_read':
      base.choices = [
        { id: 's_read', label: 'Зачитать честно', effect: 'neutral' },
        { id: 's_hype', label: 'Зачитать с хайпом', effect: 'good', chance: chance(style === 'energy' ? 0.8 : 0.6) },
        { id: 's_skip', label: 'Пропустить', effect: 'bad' },
      ]
      break
    case 'mod_help':
      base.choices = [
        { id: 'm_yes', label: 'Да, чистим', effect: 'good' },
        { id: 'm_no', label: 'Пусть спорят', effect: 'bad' },
      ]
      break
    case 'clutch':
      base.choices = [
        {
          id: 'cl_risk',
          label: 'Идти ва-банк',
          effect: 'good',
          chance: chance(0.5 + (style === 'pro' ? 0.2 : 0) + pc * 0.02),
        },
        { id: 'cl_safe', label: 'Сыграть сейф', effect: 'neutral' },
      ]
      break
    case 'viral_moment':
      base.choices = [
        { id: 'v_clip', label: 'Клипаем и пушим', effect: 'good', chance: chance(style === 'energy' ? 0.8 : 0.65) },
        { id: 'v_play', label: 'Играем дальше', effect: 'neutral' },
      ]
      break
    case 'chat_war':
      base.choices = [
        { id: 'cw_peace', label: 'Примирить чат', effect: 'good' },
        { id: 'cw_fuel', label: 'Подкинуть масла', effect: 'bad' },
      ]
      break
    case 'super_fan':
      base.choices = [
        { id: 'sf_thanks', label: 'Зачитать и обнять', effect: 'good' },
        { id: 'sf_quick', label: 'Короткое спасибо', effect: 'neutral' },
      ]
      break
    case 'algo_boost':
      base.choices = [
        { id: 'ab_ride', label: 'Ловим волну', effect: 'good', chance: chance(style === 'chat' ? 0.85 : 0.7) },
        { id: 'ab_ignore', label: 'Не замечаем', effect: 'neutral' },
      ]
      break
    case 'end_threat':
      base.choices = [
        {
          id: 'et_fix',
          label: 'Спасти эфир',
          effect: 'good',
          chance: chance(0.6 + sumEffect(state, 'fatigueReduce') + pc * 0.02),
        },
        { id: 'et_end', label: 'Закончить сейчас', effect: 'bad' },
      ]
      break
    case 'charity':
      base.choices = [
        { id: 'ch_all', label: 'Отдать треть донатов', effect: 'good' },
        { id: 'ch_part', label: 'Закинуть немного', effect: 'neutral' },
        { id: 'ch_skip', label: 'Не сейчас', effect: 'bad' },
      ]
      break
    case 'drama_bait':
      base.choices = [
        { id: 'db_show', label: 'Устроить шоу', effect: 'good', chance: chance(0.7) },
        { id: 'db_cool', label: 'Остыть', effect: 'neutral' },
      ]
      break
    case 'stunt':
      base.choices = [
        { id: 'st_do', label: 'Принять вызов', effect: 'good', chance: chance(0.55 + persona.bold / 400) },
        { id: 'st_no', label: 'Отказаться', effect: 'neutral' },
      ]
      break
    case 'cozy':
      base.choices = [
        { id: 'cz_talk', label: 'Поболтать по душам', effect: 'good' },
        { id: 'cz_skip', label: 'Вернуться к игре', effect: 'neutral' },
      ]
      break
    case 'hate_raid':
      base.choices = [
        { id: 'hr_joke', label: 'Встретить с юмором', effect: 'good', chance: chance(0.5 + persona.kind / 250) },
        { id: 'hr_ban', label: 'Бан-волна', effect: 'neutral' },
        { id: 'hr_fight', label: 'Ответить жёстко', effect: 'bad' },
      ]
      break
  }

  return base
}

export function resolveStreamEvent(state: GameState, choiceId: string): GameState {
  const event = state.stream.event
  if (!event) return state
  const picked = event.choices.find((c) => c.id === choiceId)
  if (!picked) return state
  const failed = picked.chance !== undefined && Math.random() > picked.chance
  const choice = failed ? { ...picked, effect: 'bad' as const } : picked

  let { viewers, donations, hype, fatigue, fateBonus, endedEarly } = state.stream
  let toxicity = state.toxicity
  let reputation = state.reputation

  if (choice.effect === 'good') {
    viewers += event.kind === 'raid' || event.kind === 'algo_boost' ? 5 : 1
    hype += event.kind === 'viral_moment' || event.kind === 'clutch' ? 10 : 3
    if (event.kind === 'donate') donations += 5
    if (event.kind === 'super_fan') {
      donations += 40
      fateBonus += 14
    }
    if (event.kind === 'clutch') {
      donations += 12
      fateBonus += 16
      hype += 5
    }
    if (event.kind === 'viral_moment') {
      viewers += 7
      fateBonus += 22
    }
    if (event.kind === 'algo_boost') {
      viewers += 8
      fateBonus += 12
    }
    if (event.kind === 'chat_war') {
      toxicity = clamp(toxicity - 5, 0, 100)
      reputation += 1
    }
    if (event.kind === 'mod_help' || (event.kind === 'hate' && choice.id === 'h_mod')) {
      toxicity = clamp(toxicity - 3 - sumStaffEffect(state, 'toxicityReduce') * 10, 0, 100)
    }
    if (event.kind === 'tech_fail' || event.kind === 'end_threat') {
      fatigue = Math.max(0, fatigue - 8)
      fateBonus += 10
    }
    if (event.kind === 'charity') {
      donations = Math.round(donations * 0.67)
      reputation += 2
      viewers += 4
      fateBonus += 18
    }
    if (event.kind === 'drama_bait') {
      hype += 9
      donations += 20
      fateBonus += 10
      toxicity = clamp(toxicity + 6, 0, 100)
    }
    if (event.kind === 'stunt') {
      hype += 9
      donations += 25
      fateBonus += 18
    }
    if (event.kind === 'cozy') {
      fatigue = Math.max(0, fatigue - 15)
      fateBonus += 6
    }
    if (event.kind === 'hate_raid') {
      viewers += 6
      hype += 5
      fateBonus += 12
    }
  } else if (choice.effect === 'bad') {
    hype += 8
    fatigue += 10
    viewers = Math.max(1, viewers - 2)
    if (event.kind === 'charity') reputation -= 1
    if (event.kind === 'stunt' || event.kind === 'drama_bait') fateBonus -= 8
    if (
      event.kind === 'hate' ||
      event.kind === 'mod_help' ||
      event.kind === 'chat_war' ||
      event.kind === 'hate_raid'
    ) {
      toxicity = clamp(toxicity + 10, 0, 100)
      reputation -= 1
      fateBonus -= 15
    }
    if (event.kind === 'tech_fail') fatigue += 6
    if (event.kind === 'clutch') {
      hype -= 5
      fateBonus -= 20
      fatigue += 12
    }
    if (event.kind === 'end_threat' && (choice.id === 'et_end' || failed)) {
      endedEarly = true
      fateBonus -= 10
      fatigue = 100
    }
    if (event.kind === 'sponsor_read' && failed) reputation -= 1
  } else {
    // Safe options trade hype for breathing room
    hype += 2
    fatigue = Math.max(0, fatigue - 5)
    donations += event.kind === 'donate' ? 4 : 0
    if (event.kind === 'sponsor_read') donations += 10
    if (event.kind === 'super_fan') donations += 40
    if (event.kind === 'clutch') fateBonus += 5
    if (event.kind === 'charity') {
      donations = Math.round(donations * 0.9)
      reputation += 1
    }
    if (event.kind === 'hate_raid') toxicity = clamp(toxicity - 3, 0, 100)
  }

  let next: GameState = {
    ...state,
    toxicity,
    reputation: clamp(reputation, -20, 100),
    stream: {
      ...state.stream,
      viewers,
      donations,
      hype: Math.max(0, hype),
      fatigue: clamp(fatigue, 0, 100),
      fateBonus,
      endedEarly,
      event: null,
      eventTtl: 0,
      eventCooldown: 9,
      lastDonateAmount:
        event.kind === 'super_fan' || event.kind === 'donate' ? donations - state.stream.donations : state.stream.lastDonateAmount,
    },
  }

  next = applyChoicePersona(next, picked.id)
  const warmKinds: StreamEventKind[] = ['question', 'donate', 'super_fan', 'raid', 'charity', 'cozy', 'hate_raid']
  if (choice.effect === 'good' && warmKinds.includes(event.kind)) next = shiftRegularMood(next, 4)
  if (picked.id === 'q_short' || picked.id === 'sf_quick' || picked.id === 'ch_skip') next = shiftRegularMood(next, -4)
  const memory: MemoryId | null =
    event.kind === 'clutch' && picked.id === 'cl_risk'
      ? failed
        ? 'clutch_fail'
        : 'clutch_win'
      : event.kind === 'end_threat'
        ? endedEarly
          ? 'end_early'
          : 'saved_stream'
        : picked.id === 'h_fight' || picked.id === 'hr_fight' || picked.id === 'db_show'
          ? 'fight_hater'
          : event.kind === 'viral_moment' && choice.effect === 'good'
            ? 'viral'
            : picked.id === 'ch_all'
              ? 'charity'
              : null
  if (memory) next = addMemory(next, memory)

  if (failed) {
    next = pushAlert(next, `Не вышло (${Math.round((picked.chance ?? 0) * 100)}%)…`, 'info')
  }
  if (event.kind === 'raid' && choice.effect === 'good') {
    next = pushAlert(next, 'Рейд принят!', 'raid')
  }
  if (choice.effect === 'good' && (event.kind === 'super_fan' || event.kind === 'raid' || event.kind === 'question')) {
    const before = next.stream.newFan
    next = tryRecruitFan(next, event.kind === 'super_fan' ? 0.45 : 0.2)
    if (next.stream.newFan && next.stream.newFan !== before) {
      next = pushAlert(next, `${next.stream.newFan} стал суперфаном!`, 'hype')
    }
  }
  if (event.kind === 'donate' || event.kind === 'super_fan') {
    next = pushAlert(next, `В бюджет +${Math.round(next.stream.donations - state.stream.donations)}₽`, 'donate')
    next = pushSticker(next, '$$')
  }
  if (event.kind === 'viral_moment' && choice.effect === 'good') {
    next = pushAlert(next, 'Вирал! Судьба эфира взлетела', 'combo')
    next = pushSticker(next, 'POG')
  }
  if (event.kind === 'clutch' && choice.effect === 'good') {
    next = pushAlert(next, 'CLUTCH! Чат в экстазе', 'combo')
  }
  if (endedEarly) {
    next = pushAlert(next, 'Эфир оборван решением', 'info')
  }

  if (next.stream.fatigue >= 100 || next.stream.endedEarly) {
    return finishStream(next)
  }

  return next
}

export function finishStream(state: GameState): GameState {
  const streamedType = state.stream.contentType
  const performance = Math.min(
    1,
    (state.stream.clicks / 40 + state.stream.hype / 50 + state.stream.viewers / 25) / 3,
  )
  const sponsor = settleSponsorAfterStream(state)
  state = {
    ...sponsor.state,
    stream: { ...sponsor.state.stream, sponsorPaid: sponsor.paid, sponsorBrand: sponsor.brand },
  }
  state = settleRegulars(settleBattle(state))
  if (state.stream.battle) state = addMemory(state, state.stream.battle.won ? 'battle_win' : 'battle_lose')
  if (state.stream.goalTarget > 0) {
    state = addMemory(state, state.stream.donations >= state.stream.goalTarget ? 'goal_hit' : 'goal_fail')
  }
  let next = bumpGamePlay({
    ...state,
    streamsDone: state.streamsDone + 1,
    dayPhase: 'produce' as const,
    dayFlags: { ...state.dayFlags, streamed: true },
    daysWithoutStream: 0,
    stream: {
      ...state.stream,
      active: false,
      event: null,
      sticker: null,
    },
  })
  next = gainFormatSkill(next, streamedType, performance)
  // Toxic collapse can cancel channel after bad streams
  if (next.toxicity >= 90 && next.stream.fateBonus < -20) {
    next = {
      ...next,
      subscribers: Math.max(0, next.subscribers - 25),
    }
  }
  return checkFailEndings(next)
}

export function clearStream(state: GameState): GameState {
  return {
    ...state,
    stream: idleStream(state.contentType),
  }
}
