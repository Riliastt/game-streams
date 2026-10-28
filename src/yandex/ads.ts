import { getSDK } from './sdk'

export type AdPauseHandlers = {
  onOpen?: () => void
  onClose?: () => void
}

export function showFullscreenAd(handlers: AdPauseHandlers = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const sdk = getSDK()
    if (!sdk) {
      resolve(false)
      return
    }

    sdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => handlers.onOpen?.(),
        onClose: (wasShown) => {
          handlers.onClose?.()
          resolve(Boolean(wasShown))
        },
        onError: () => {
          handlers.onClose?.()
          resolve(false)
        },
      },
    })
  })
}

export function showRewardedAd(handlers: AdPauseHandlers = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const sdk = getSDK()
    if (!sdk) {
      resolve(false)
      return
    }

    let rewarded = false
    sdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => handlers.onOpen?.(),
        onRewarded: () => {
          rewarded = true
        },
        onClose: () => {
          handlers.onClose?.()
          resolve(rewarded)
        },
        onError: () => {
          handlers.onClose?.()
          resolve(false)
        },
      },
    })
  })
}
