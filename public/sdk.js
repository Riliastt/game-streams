/**
 * Local mock of Yandex Games SDK for development.
 * On the real platform this file is replaced by the host /sdk.js.
 */
(function () {
  if (typeof window === 'undefined') return
  if (window.YaGames) return

  const storeKey = 'gs_yandex_mock_cloud'

  function delay(ms, value) {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms))
  }

  const mockPlayer = {
    getUniqueID() {
      return 'local-dev-player'
    },
    getName() {
      return 'Local Player'
    },
    getPhoto() {
      return ''
    },
    getMode() {
      return 'lite'
    },
    async getData(keys) {
      const raw = localStorage.getItem(storeKey)
      const data = raw ? JSON.parse(raw) : {}
      if (!keys) return data
      const out = {}
      for (const k of keys) out[k] = data[k]
      return out
    },
    async setData(data, _flush) {
      const raw = localStorage.getItem(storeKey)
      const prev = raw ? JSON.parse(raw) : {}
      localStorage.setItem(storeKey, JSON.stringify({ ...prev, ...data }))
    },
  }

  window.YaGames = {
    async init() {
      await delay(50)
      return {
        environment: {
          i18n: { lang: 'ru' },
          payload: null,
        },
        features: {
          LoadingAPI: {
            ready() {
              console.info('[YaGames mock] LoadingAPI.ready()')
            },
          },
          GameplayAPI: {
            start() {
              console.info('[YaGames mock] GameplayAPI.start()')
            },
            stop() {
              console.info('[YaGames mock] GameplayAPI.stop()')
            },
          },
        },
        async getPlayer() {
          return mockPlayer
        },
        adv: {
          showFullscreenAdv({ callbacks } = {}) {
            console.info('[YaGames mock] showFullscreenAdv')
            callbacks?.onOpen?.()
            setTimeout(() => callbacks?.onClose?.(true), 400)
          },
          showRewardedVideo({ callbacks } = {}) {
            console.info('[YaGames mock] showRewardedVideo')
            callbacks?.onOpen?.()
            setTimeout(() => {
              callbacks?.onRewarded?.()
              callbacks?.onClose?.(true)
            }, 500)
          },
        },
        on() {},
        off() {},
      }
    },
  }
})()
