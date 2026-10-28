let sdk: YaGamesSDK | null = null
let gameplayActive = false

export async function initYandexSDK(): Promise<YaGamesSDK> {
  if (sdk) return sdk

  if (!window.YaGames) {
    throw new Error('YaGames SDK script is not loaded')
  }

  sdk = await window.YaGames.init()
  return sdk
}

export function getSDK(): YaGamesSDK | null {
  return sdk
}

export function signalGameReady(): void {
  sdk?.features.LoadingAPI?.ready()
}

export function gameplayStart(): void {
  if (gameplayActive) return
  gameplayActive = true
  sdk?.features.GameplayAPI?.start()
}

export function gameplayStop(): void {
  if (!gameplayActive) return
  gameplayActive = false
  sdk?.features.GameplayAPI?.stop()
}

export const LEADERBOARD_NAME = 'subscribers'
let lastScore = -1
let lastScoreAt = 0

/** Throttled: Yandex allows ~1 setScore per second; we send at most every 5s. */
export function submitLeaderboardScore(score: number): void {
  if (!sdk?.leaderboards || score === lastScore || Date.now() - lastScoreAt < 5000) return
  lastScore = score
  lastScoreAt = Date.now()
  sdk.leaderboards.setScore(LEADERBOARD_NAME, Math.floor(score)).catch(() => {
    /* leaderboard not configured in the console or player not authorized */
  })
}

export function onPlatformPause(handler: () => void): () => void {
  if (!sdk) return () => {}
  sdk.on('game_api_pause', handler)
  return () => sdk?.off('game_api_pause', handler)
}

export function onPlatformResume(handler: () => void): () => void {
  if (!sdk) return () => {}
  sdk.on('game_api_resume', handler)
  return () => sdk?.off('game_api_resume', handler)
}
