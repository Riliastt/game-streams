/// <reference types="vite/client" />

interface YaGamesPlayer {
  getUniqueID(): string
  getName(): string
  getPhoto(size?: string): string
  getMode(): string
  getData(keys?: string[]): Promise<Record<string, unknown>>
  setData(data: Record<string, unknown>, flush?: boolean): Promise<void>
}

interface YaGamesSDK {
  environment: {
    i18n: { lang: string }
    payload: string | null
  }
  features: {
    LoadingAPI?: { ready: () => void }
    GameplayAPI?: { start: () => void; stop: () => void }
  }
  getPlayer(options?: { signed?: boolean }): Promise<YaGamesPlayer>
  adv: {
    showFullscreenAdv: (opts?: {
      callbacks?: {
        onOpen?: () => void
        onClose?: (wasShown: boolean) => void
        onError?: (error: unknown) => void
      }
    }) => void
    showRewardedVideo: (opts?: {
      callbacks?: {
        onOpen?: () => void
        onRewarded?: () => void
        onClose?: (wasShown: boolean) => void
        onError?: (error: unknown) => void
      }
    }) => void
  }
  leaderboards?: {
    setScore: (leaderboardName: string, score: number) => Promise<void>
  }
  on: (event: string, callback: () => void) => void
  off: (event: string, callback: () => void) => void
}

interface YaGamesStatic {
  init: () => Promise<YaGamesSDK>
}

interface Window {
  YaGames?: YaGamesStatic
}
