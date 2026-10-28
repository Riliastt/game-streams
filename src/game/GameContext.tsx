import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { playSfx, setAudioMuted as setSfxMuted, startBed, stopBed } from './audio'
import {
  applyArcadeOutcome,
  canStartStream as canStartStreamCheck,
  clearStream,
  resolveStreamEvent,
  startStream,
  streamClick,
  tickStream,
} from './clicker'
import {
  boostClipViews,
  canStartContent,
  generateClipOffers,
  publishClip,
  tickClipFeed,
  type ClipOffer,
  type MontageId,
} from './clips'
import { applyRewards, calcStreamRewards, type StreamRewards } from './economy'
import { isGameLocked } from './endings'
import { rankId } from './ranks'
import {
  applyOffline,
  claimLoginGift,
  computeOffline,
  consumeX2,
  pendingLoginGift,
  x2Left,
  type LoginGift,
  type OfflineReport,
} from './retention'
import { daysLeftInWeek, weeklyBoard } from './rivals'
import { moveStudio } from './studio'
import { acceptBattle, declineBattle } from './battle'
import { answerDrama, closeDrama } from './drama'
import {
  buyTheme,
  buyUpgrade,
  canBonusStream,
  dailyUpkeep,
  grantBonusStream,
  rebrand,
  runPromo,
  openMembership,
  refillEnergy,
  renameChannel,
  restDay,
  setContentType,
  setTheme,
  skipToManage,
} from './management'
import { buyGame, dismissCamTip, selectGame } from './games'
import { applyStoryChoice, queueStoryIfNeeded } from './narrative'
import { tickProjects, startProject } from './projects'
import {
  bumpQuestMetric,
  claimQuest,
  ensureDailyQuests,
  syncQuestProgress,
  unlockAchievements,
} from './quests'
import { loadBestSave, persistAll, resetSave } from './save'
import { hireStaff } from './staff'
import {
  createInitialState,
  type ContentType,
  type GameState,
  type Project,
  type ScreenId,
  type StreamStyleId,
} from './state'
import { acceptSponsor, declineSponsor, randomStreamTitle } from './streamPlan'
import { showFullscreenAd, showRewardedAd } from '../yandex/ads'
import {
  gameplayStart,
  gameplayStop,
  initYandexSDK,
  onPlatformPause,
  onPlatformResume,
  signalGameReady,
  submitLeaderboardScore,
} from '../yandex/sdk'
import { initPlayer } from '../yandex/player'

type GameContextValue = {
  ready: boolean
  screen: ScreenId
  setScreen: (s: ScreenId) => void
  state: GameState
  lastRewards: StreamRewards | null
  clipOffers: ClipOffer[] | null
  montageDraft: ClipOffer | null
  startStreaming: () => void
  clickStream: () => void
  chooseStreamEvent: (choiceId: string) => void
  collectRewards: (double: boolean) => Promise<void>
  selectClipIdea: (clipId: string) => void
  publishClipMontage: (elements: MontageId[]) => void
  skipClip: () => void
  boostClip: (clipId: string) => Promise<void>
  buy: (upgradeId: string) => void
  changeContent: (type: ContentType) => void
  sleep: () => void
  chooseStory: (choiceId: string) => void
  watchEnergyAd: () => Promise<void>
  toggleSound: () => void
  newGame: () => void
  audioMuted: boolean
  hire: (staffId: string) => void
  startProj: (type: Project['type']) => void
  claimDaily: (questId: string) => void
  setChannelName: (name: string) => void
  selectTheme: (themeId: string) => void
  purchaseTheme: (themeId: string, cost: number) => void
  goingLive: boolean
  goingLiveCount: number
  selectCatalogGame: (gameId: string) => void
  purchaseGame: (gameId: string) => void
  dismissCamTipFlag: () => void
  openPaidMembership: () => void
  startContentIdeas: (medium: 'video' | 'reel') => void
  goToManage: () => void
  arcadeHit: (hit: boolean) => void
  chooseStreamStyle: (style: StreamStyleId) => void
  setStreamTitle: (title: string) => void
  rollStreamTitle: () => void
  acceptSponsorOffer: () => void
  declineSponsorOffer: () => void
  watchBonusStreamAd: () => Promise<void>
  daySummary: DaySummary | null
  dismissDaySummary: () => void
  offlineReport: OfflineReport | null
  claimOffline: (double: boolean) => Promise<void>
  loginGift: LoginGift | null
  claimLogin: () => void
  ackRank: () => void
  moveToNextStudio: () => void
  rebrandChannel: () => void
  buyPromo: () => void
  chooseGoalTier: (tier: number) => void
  acceptBattleOffer: () => void
  declineBattleOffer: () => void
  chooseDrama: (choiceId: string) => void
  closeDramaCard: () => void
  dramaNote: string
}

export type DaySummary = {
  day: number
  subsGain: number
  moneyGain: number
  upkeep: number
  streak: number
  streakLost: boolean
  newSponsor: string
  weekChanged: boolean
  boardPlace: number
  daysLeftInWeek: number
}

const GameContext = createContext<GameContextValue | null>(null)

function postProcess(state: GameState): GameState {
  return unlockAchievements(syncQuestProgress(ensureDailyQuests(state)))
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [screen, setScreen] = useState<ScreenId>('hub')
  const [state, setState] = useState<GameState>(() => createInitialState())
  const [lastRewards, setLastRewards] = useState<StreamRewards | null>(null)
  const [clipOffers, setClipOffers] = useState<ClipOffer[] | null>(null)
  const [montageDraft, setMontageDraft] = useState<ClipOffer | null>(null)
  const clipSourceRef = useRef<GameState | null>(null)
  const [audioMuted, setAudioMuted] = useState(false)
  const [goingLive, setGoingLive] = useState(false)
  const [goingLiveCount, setGoingLiveCount] = useState(3)
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null)
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null)
  const [loginGift, setLoginGift] = useState<LoginGift | null>(null)
  const [dramaNote, setDramaNote] = useState('')
  const stateRef = useRef(state)
  stateRef.current = state
  const goingLiveTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const commit = useCallback((next: GameState) => {
    const processed = postProcess({ ...next, updatedAt: Date.now() })
    stateRef.current = processed
    persistAll(processed)
    setState(processed)
    submitLeaderboardScore(processed.subscribers)
    return processed
  }, [])

  const patch = useCallback(
    (updater: (s: GameState) => GameState) => {
      commit(updater(stateRef.current))
    },
    [commit],
  )

  useEffect(() => {
    const muted = audioMuted || !state.soundEnabled
    setSfxMuted(muted)
  }, [audioMuted, state.soundEnabled])

  useEffect(() => {
    let cancelled = false
    let offPause = () => {}
    let offResume = () => {}

    ;(async () => {
      try {
        await initYandexSDK()
        await initPlayer()
      } catch (e) {
        console.warn('SDK init issue', e)
      }

      const loaded = await loadBestSave()
      if (cancelled) return

      // Read time away before commit() refreshes updatedAt
      setOfflineReport(computeOffline(loaded))
      setLoginGift(pendingLoginGift(loaded))

      const withStory = queueStoryIfNeeded(postProcess(loaded))
      commit(withStory)

      if (withStory.pendingSceneId) {
        setScreen('story')
        playSfx('story')
      } else setScreen('hub')

      signalGameReady()
      gameplayStart()
      startBed()
      setReady(true)

      offPause = onPlatformPause(() => {
        setAudioMuted(true)
        setState((s) => ({ ...s, paused: true }))
      })
      offResume = onPlatformResume(() => {
        setAudioMuted(false)
        setState((s) => ({ ...s, paused: false }))
      })
    })()

    const onBlur = () => {
      setAudioMuted(true)
      setState((s) => ({ ...s, paused: true }))
    }
    const onFocus = () => {
      setAudioMuted(false)
      setState((s) => ({ ...s, paused: false }))
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      offPause()
      offResume()
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      gameplayStop()
      stopBed()
      if (goingLiveTimer.current) clearInterval(goingLiveTimer.current)
    }
  }, [commit])

  // Stream + projects tick
  useEffect(() => {
    if (!ready) return
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      let cur = stateRef.current

      if (!cur.paused) {
        const clipTick = tickClipFeed(cur, dt)
        cur = clipTick.state
        stateRef.current = cur
        if (clipTick.dirty) setState(cur)

        const afterProjects = tickProjects(cur)
        if (afterProjects !== cur && afterProjects.projects.length !== cur.projects.length) {
          playSfx('level')
          cur = postProcess(afterProjects)
          stateRef.current = cur
          persistAll(cur)
          setState(cur)
        } else if (afterProjects.projects !== cur.projects) {
          cur = afterProjects
          stateRef.current = cur
          setState(cur)
        }
      }

      if (cur.stream.active && !cur.paused) {
        const next = tickStream(cur, dt)
        if (next !== cur) {
          if (!next.stream.active && cur.stream.active) {
            let finished = bumpQuestMetric(next, 'streams', 1)
            finished = bumpQuestMetric(finished, 'clicks', next.stream.clicks)
            finished = bumpQuestMetric(finished, 'donations', Math.floor(next.stream.donations))
            finished = bumpQuestMetric(finished, 'combo', next.stream.peakCombo)
            finished = postProcess(finished)
            const rewards = calcStreamRewards(finished)
            clipSourceRef.current = finished
            setLastRewards(rewards)
            commit(finished)
            setScreen('hub')
            playSfx('level')
          } else {
            stateRef.current = next
            setState(next)
          }
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ready, commit])

  useEffect(() => {
    if (lastRewards || clipOffers || montageDraft) return
    if (state.pendingSceneId && screen !== 'story' && !state.stream.active) {
      setScreen('story')
      playSfx('story')
    }
  }, [state.pendingSceneId, screen, state.stream.active, lastRewards, clipOffers, montageDraft])

  const startStreaming = useCallback(() => {
    if (goingLive) return
    if (isGameLocked(stateRef.current)) return
    if (!canStartStreamCheck(stateRef.current)) return
    setGoingLive(true)
    setGoingLiveCount(3)
    playSfx('ui')
    let n = 3
    if (goingLiveTimer.current) clearInterval(goingLiveTimer.current)
    goingLiveTimer.current = setInterval(() => {
      n -= 1
      setGoingLiveCount(n)
      if (n <= 0) {
        if (goingLiveTimer.current) clearInterval(goingLiveTimer.current)
        goingLiveTimer.current = null
        setGoingLive(false)
        const started = startStream(stateRef.current)
        if (!started.stream.active) return
        commit(started)
        setScreen('stream')
        setLastRewards(null)
        playSfx('level')
      }
    }, 900)
  }, [commit, goingLive])

  const clickStream = useCallback(() => {
    if (isGameLocked(stateRef.current)) return
    const result = streamClick(stateRef.current)
    if (result.state === stateRef.current) return
    stateRef.current = result.state
    setState(result.state)
    playSfx(result.donateGain > 0 ? 'donate' : result.comboHit ? 'combo' : 'click')
  }, [])

  const arcadeHit = useCallback((hit: boolean) => {
    if (isGameLocked(stateRef.current)) return
    const next = applyArcadeOutcome(stateRef.current, hit)
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
  }, [])

  const chooseStreamEvent = useCallback(
    (choiceId: string) => {
      if (isGameLocked(stateRef.current)) return
      const prev = stateRef.current
      const next = resolveStreamEvent(prev, choiceId)
      // Early end (e.g. «Закончить сейчас») finishes outside the tick loop —
      // must mirror tickStream end: rewards + hub, or UI freezes on dead stream.
      if (prev.stream.active && !next.stream.active) {
        let finished = bumpQuestMetric(next, 'streams', 1)
        finished = bumpQuestMetric(finished, 'clicks', next.stream.clicks)
        finished = bumpQuestMetric(finished, 'donations', Math.floor(next.stream.donations))
        finished = bumpQuestMetric(finished, 'combo', next.stream.peakCombo)
        finished = postProcess(finished)
        const rewards = calcStreamRewards(finished)
        clipSourceRef.current = finished
        setLastRewards(rewards)
        commit(finished)
        setScreen('hub')
        playSfx('level')
        return
      }
      stateRef.current = next
      setState(next)
      playSfx('ui')
    },
    [commit],
  )

  const collectRewards = useCallback(
    async (double: boolean) => {
      const rewards = lastRewards
      if (!rewards) return

      setAudioMuted(true)
      setState((s) => ({ ...s, paused: true }))

      let doubleMoney = false
      let showedInterstitial = false

      if (double && x2Left(stateRef.current) > 0) {
        doubleMoney = await showRewardedAd({
          onOpen: () => setAudioMuted(true),
          onClose: () => setAudioMuted(false),
        })
      } else {
        // No interstitials during the first streams; then at most every 3 minutes
        const shouldAd =
          stateRef.current.streamsDone >= 3 && Date.now() - stateRef.current.lastInterstitialAt > 180_000
        if (shouldAd) {
          showedInterstitial = await showFullscreenAd({
            onOpen: () => setAudioMuted(true),
            onClose: () => setAudioMuted(false),
          })
        }
      }

      // Snapshot stream stats before ads/clear so clip rolls stay meaningful
      const source = clipSourceRef.current ?? stateRef.current
      const offers = generateClipOffers(source, 'clip')

      let next = applyRewards(stateRef.current, rewards, doubleMoney)
      if (doubleMoney) next = consumeX2(next)
      next = clearStream(next)
      next = {
        ...next,
        paused: false,
        lastInterstitialAt: showedInterstitial ? Date.now() : next.lastInterstitialAt,
      }
      next = commit(next)
      setLastRewards(null)
      setClipOffers(offers)
      setAudioMuted(false)
      setScreen('hub')
      playSfx('ui')
    },
    [lastRewards, commit],
  )

  const selectClipIdea = useCallback(
    (clipId: string) => {
      const offers = clipOffers
      if (!offers) return
      const clip = offers.find((c) => c.id === clipId)
      if (!clip) return
      setMontageDraft(clip)
      setClipOffers(null)
      playSfx('ui')
    },
    [clipOffers],
  )

  const publishClipMontage = useCallback(
    (elements: MontageId[]) => {
      const draft = montageDraft
      if (!draft) return
      let next = publishClip(stateRef.current, draft, elements)
      next = queueStoryIfNeeded(next)
      next = commit(next)
      setMontageDraft(null)
      setClipOffers(null)
      clipSourceRef.current = null
      setScreen('hub')
      playSfx('level')
    },
    [montageDraft, commit],
  )

  const skipClip = useCallback(() => {
    setClipOffers(null)
    setMontageDraft(null)
    clipSourceRef.current = null
    const next = queueStoryIfNeeded(stateRef.current)
    commit(next)
    setScreen(next.pendingSceneId ? 'story' : 'hub')
    playSfx('ui')
  }, [commit])

  const boostClip = useCallback(
    async (clipId: string) => {
      const clip = stateRef.current.clipFeed.find((c) => c.id === clipId)
      if (!clip || clip.boostUsed) return
      setAudioMuted(true)
      const ok = await showRewardedAd({
        onOpen: () => setAudioMuted(true),
        onClose: () => setAudioMuted(false),
      })
      setAudioMuted(false)
      if (!ok) return
      commit(boostClipViews(stateRef.current, clipId))
      playSfx('donate')
    },
    [commit],
  )

  const buy = useCallback(
    (upgradeId: string) => {
      if (isGameLocked(stateRef.current)) return
      patch((s) => buyUpgrade(s, upgradeId))
      playSfx('level')
    },
    [patch],
  )

  const changeContent = useCallback(
    (type: ContentType) => {
      patch((s) => setContentType(s, type))
      playSfx('ui')
    },
    [patch],
  )

  const sleep = useCallback(() => {

    if (isGameLocked(stateRef.current)) return

    const before = stateRef.current
    const after = commit(queueStoryIfNeeded(restDay(before)))
    if (after.day !== before.day) {
      const board = weeklyBoard(after)
      setDaySummary({
        day: before.day,
        subsGain: Math.max(0, before.subscribers - before.dayStartSubs),
        moneyGain: before.money - before.dayStartMoney,
        upkeep: dailyUpkeep(before),
        streak: after.streamStreak,
        streakLost: before.streamStreak > 0 && after.streamStreak === 0,
        newSponsor: !before.sponsorOffer && after.sponsorOffer ? after.sponsorOffer.brand : '',
        weekChanged: before.weekGameId !== after.weekGameId,
        boardPlace: board.findIndex((r) => r.isPlayer) + 1,
        daysLeftInWeek: daysLeftInWeek(after),
      })
    }

    playSfx('ui')

  }, [commit])



  const goToManage = useCallback(() => {

    if (isGameLocked(stateRef.current)) return

    patch((s) => skipToManage(s))

    playSfx('ui')

  }, [patch])



  const chooseStory = useCallback(
    (choiceId: string) => {
      const sceneId = stateRef.current.pendingSceneId
      if (!sceneId) return
      const next = commit(applyStoryChoice(stateRef.current, sceneId, choiceId))
      setScreen(next.pendingSceneId ? 'story' : 'hub')
      playSfx('ui')
    },
    [commit],
  )

  const watchBonusStreamAd = useCallback(async () => {
    if (!canBonusStream(stateRef.current)) return
    setAudioMuted(true)
    patch((s) => ({ ...s, paused: true }))
    const ok = await showRewardedAd({
      onOpen: () => setAudioMuted(true),
      onClose: () => setAudioMuted(false),
    })
    patch((s) => ({ ...(ok ? grantBonusStream(s) : s), paused: false }))
    setAudioMuted(false)
    if (ok) playSfx('level')
  }, [patch])

  const dismissDaySummary = useCallback(() => setDaySummary(null), [])

  const claimOffline = useCallback(
    async (double: boolean) => {
      const report = offlineReport
      if (!report) return
      let doubled = false
      if (double) {
        setAudioMuted(true)
        doubled = await showRewardedAd({
          onOpen: () => setAudioMuted(true),
          onClose: () => setAudioMuted(false),
        })
        setAudioMuted(false)
      }
      setOfflineReport(null)
      patch((s) => applyOffline(s, report, doubled))
      playSfx('donate')
    },
    [offlineReport, patch],
  )

  const claimLogin = useCallback(() => {
    const gift = loginGift
    if (!gift) return
    setLoginGift(null)
    patch((s) => claimLoginGift(s, gift))
    playSfx('donate')
  }, [loginGift, patch])

  const ackRank = useCallback(() => {
    patch((s) => ({ ...s, lastRankSeen: rankId(s) }))
    playSfx('ui')
  }, [patch])

  const buyPromo = useCallback(() => {
    patch((s) => runPromo(s))
    playSfx('level')
  }, [patch])

  const chooseGoalTier = useCallback(
    (tier: number) => {
      patch((s) => (s.stream.active ? s : { ...s, goalTier: tier }))
      playSfx('ui')
    },
    [patch],
  )

  const acceptBattleOffer = useCallback(() => {
    patch((s) => acceptBattle(s))
    playSfx('level')
  }, [patch])

  const declineBattleOffer = useCallback(() => {
    patch((s) => declineBattle(s))
    playSfx('ui')
  }, [patch])

  const chooseDrama = useCallback(
    (choiceId: string) => {
      const result = answerDrama(stateRef.current, choiceId)
      commit(result.state)
      setDramaNote(result.failed ? 'Не вышло — пошло не по плану…' : '')
      playSfx(result.failed ? 'ui' : 'level')
    },
    [commit],
  )

  const closeDramaCard = useCallback(() => {
    patch((s) => closeDrama(s))
    setDramaNote('')
    playSfx('ui')
  }, [patch])

  const moveToNextStudio = useCallback(() => {
    patch((s) => moveStudio(s))
    playSfx('level')
  }, [patch])

  const rebrandChannel = useCallback(() => {
    const next = commit(rebrand(stateRef.current))
    setLastRewards(null)
    setClipOffers(null)
    setMontageDraft(null)
    setDaySummary(null)
    setScreen(next.pendingSceneId ? 'story' : 'hub')
    playSfx('level')
  }, [commit])

  const watchEnergyAd = useCallback(async () => {
    setAudioMuted(true)
    const ok = await showRewardedAd({
      onOpen: () => setAudioMuted(true),
      onClose: () => setAudioMuted(false),
    })
    if (ok) patch((s) => ({ ...refillEnergy(s, 2), paused: false }))
    else patch((s) => ({ ...s, paused: false }))
    setAudioMuted(false)
  }, [patch])

  const toggleSound = useCallback(() => {
    patch((s) => ({ ...s, soundEnabled: !s.soundEnabled }))
  }, [patch])

  const chooseStreamStyle = useCallback(
    (style: StreamStyleId) => {
      patch((s) => (s.stream.active ? s : { ...s, streamStyle: style }))
      playSfx('ui')
    },
    [patch],
  )

  const setStreamTitle = useCallback(
    (title: string) => {
      patch((s) => ({ ...s, streamTitle: title.slice(0, 50) }))
    },
    [patch],
  )

  const rollStreamTitle = useCallback(() => {
    patch((s) => ({ ...s, streamTitle: randomStreamTitle(s) }))
    playSfx('ui')
  }, [patch])

  const acceptSponsorOffer = useCallback(() => {
    patch((s) => acceptSponsor(s))
    playSfx('level')
  }, [patch])

  const declineSponsorOffer = useCallback(() => {
    patch((s) => declineSponsor(s))
    playSfx('ui')
  }, [patch])

  const newGame = useCallback(() => {
    const fresh = queueStoryIfNeeded(postProcess(resetSave()))
    commit(fresh)
    setLastRewards(null)
    setClipOffers(null)
    setMontageDraft(null)
    clipSourceRef.current = null
    setScreen(fresh.pendingSceneId ? 'story' : 'hub')
  }, [commit])

  const hire = useCallback(
    (staffId: string) => {
      if (isGameLocked(stateRef.current)) return
      patch((s) => hireStaff(s, staffId))
      playSfx('level')
    },
    [patch],
  )

  const startProj = useCallback(
    (type: Project['type']) => {
      if (isGameLocked(stateRef.current)) return
      patch((s) => startProject(s, type))
      playSfx('ui')
    },
    [patch],
  )

  const claimDaily = useCallback(
    (questId: string) => {
      patch((s) => claimQuest(s, questId))
      playSfx('donate')
    },
    [patch],
  )

  const setChannelName = useCallback(
    (name: string) => {
      patch((s) => renameChannel(s, name))
      playSfx('level')
    },
    [patch],
  )

  const selectTheme = useCallback(
    (themeId: string) => {
      patch((s) => setTheme(s, themeId))
      playSfx('ui')
    },
    [patch],
  )

  const purchaseTheme = useCallback(
    (themeId: string, cost: number) => {
      patch((s) => buyTheme(s, themeId, cost))
      playSfx('level')
    },
    [patch],
  )

  const selectCatalogGame = useCallback(
    (gameId: string) => {
      if (isGameLocked(stateRef.current)) return
      patch((s) => selectGame(s, gameId))
      playSfx('ui')
    },
    [patch],
  )

  const purchaseGame = useCallback(
    (gameId: string) => {
      if (isGameLocked(stateRef.current)) return
      patch((s) => buyGame(s, gameId))
      playSfx('level')
    },
    [patch],
  )

  const dismissCamTipFlag = useCallback(() => {
    patch((s) => dismissCamTip(s))
  }, [patch])

  const openPaidMembership = useCallback(() => {
    if (isGameLocked(stateRef.current)) return
    patch((s) => openMembership(s))
    playSfx('level')
  }, [patch])

  const startContentIdeas = useCallback((medium: 'video' | 'reel') => {
    if (isGameLocked(stateRef.current)) return
    if (!canStartContent(stateRef.current, medium)) return
    if (lastRewards || clipOffers || montageDraft) return
    setClipOffers(generateClipOffers(stateRef.current, medium))
    playSfx('ui')
  }, [lastRewards, clipOffers, montageDraft])

  const value = useMemo<GameContextValue>(
    () => ({
      ready,
      screen,
      setScreen: (s) => {
        if (isGameLocked(stateRef.current) && s !== 'hub') return
        setScreen(s)
      },
      state,
      lastRewards,
      clipOffers,
      montageDraft,
      startStreaming,
      clickStream,
      chooseStreamEvent,
      collectRewards,
      selectClipIdea,
      publishClipMontage,
      skipClip,
      boostClip,
      buy,
      changeContent,
      sleep,
      chooseStory,
      watchEnergyAd,
      toggleSound,
      newGame,
      audioMuted: audioMuted || !state.soundEnabled,
      hire,
      startProj,
      claimDaily,
      setChannelName,
      selectTheme,
      purchaseTheme,
      goingLive,
      goingLiveCount,
      selectCatalogGame,
      purchaseGame,
      dismissCamTipFlag,
      openPaidMembership,
      startContentIdeas,
      goToManage,
      arcadeHit,
      chooseStreamStyle,
      setStreamTitle,
      rollStreamTitle,
      acceptSponsorOffer,
      declineSponsorOffer,
      watchBonusStreamAd,
      daySummary,
      dismissDaySummary,
      offlineReport,
      claimOffline,
      loginGift,
      claimLogin,
      ackRank,
      moveToNextStudio,
      rebrandChannel,
      buyPromo,
      chooseGoalTier,
      acceptBattleOffer,
      declineBattleOffer,
      chooseDrama,
      closeDramaCard,
      dramaNote,
    }),
    [
      chooseGoalTier,
      acceptBattleOffer,
      declineBattleOffer,
      chooseDrama,
      closeDramaCard,
      dramaNote,
      buyPromo,
      watchBonusStreamAd,
      daySummary,
      dismissDaySummary,
      offlineReport,
      claimOffline,
      loginGift,
      claimLogin,
      ackRank,
      moveToNextStudio,
      rebrandChannel,
      ready,
      screen,
      state,
      lastRewards,
      clipOffers,
      montageDraft,
      collectRewards,
      selectClipIdea,
      publishClipMontage,
      skipClip,
      boostClip,
      startStreaming,
      clickStream,
      chooseStreamEvent,
      buy,
      changeContent,
      sleep,
      chooseStory,
      watchEnergyAd,
      toggleSound,
      newGame,
      audioMuted,
      hire,
      startProj,
      claimDaily,
      setChannelName,
      selectTheme,
      purchaseTheme,
      goingLive,
      goingLiveCount,
      selectCatalogGame,
      purchaseGame,
      dismissCamTipFlag,
      openPaidMembership,
      startContentIdeas,
      goToManage,
      arcadeHit,
      chooseStreamStyle,
      setStreamTitle,
      rollStreamTitle,
      acceptSponsorOffer,
      declineSponsorOffer,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
