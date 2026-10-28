import type { FeedMedium, GameState, PublishedClip } from './state'

export type SocialPlatformId = 'instagrim' | 'twitchly' | 'facelook' | 'ticktock'

export type SocialPlatform = {
  id: SocialPlatformId
  name: string
  handle: string
  tagline: string
  accent: string
  followers: number
  following: number
  posts: number
  likes: number
  views: number
  engagement: number
  rankLabel: string
  tip: string
}

function sumViews(feed: PublishedClip[], medium?: FeedMedium): number {
  return feed
    .filter((c) => (medium ? c.medium === medium : true))
    .reduce((a, c) => a + c.views, 0)
}

function sumEarned(feed: PublishedClip[], medium?: FeedMedium): number {
  return feed
    .filter((c) => (medium ? c.medium === medium : true))
    .reduce((a, c) => a + c.earned, 0)
}

function countPosts(feed: PublishedClip[], medium?: FeedMedium): number {
  return feed.filter((c) => (medium ? c.medium === medium : true)).length
}

function nicheRank(score: number): string {
  if (score < 20) return 'Ноунейм'
  if (score < 60) return 'Микроблогер'
  if (score < 150) return 'Нишевый'
  if (score < 400) return 'На слуху'
  if (score < 1000) return 'Виральный'
  return 'Алгоритм любит'
}

export function computeSocialStats(state: GameState): SocialPlatform[] {
  const feed = state.clipFeed
  const nick = state.channelName.replace(/\s+/g, '_').slice(0, 18) || 'streamer'
  const hype = state.hype
  const subs = state.subscribers
  const rep = Math.max(0, state.reputation)

  const reelViews = sumViews(feed, 'reel')
  const videoViews = sumViews(feed, 'video')
  const clipViews = sumViews(feed, 'clip')
  const allViews = reelViews + videoViews + clipViews

  const instaFollowers = Math.max(
    0,
    Math.floor(subs * 0.55 + reelViews * 0.08 + hype * 0.35 + countPosts(feed, 'reel') * 4),
  )
  const twitchFollowers = Math.max(
    0,
    Math.floor(subs * 1.05 + state.streamsDone * 3 + hype * 0.25 + clipViews * 0.04),
  )
  const faceFollowers = Math.max(
    0,
    Math.floor(subs * 0.35 + videoViews * 0.06 + rep * 1.2 + countPosts(feed, 'video') * 2),
  )
  const tickFollowers = Math.max(
    0,
    Math.floor(subs * 0.4 + reelViews * 0.12 + clipViews * 0.05 + hype * 0.5),
  )

  return [
    {
      id: 'instagrim',
      name: 'ИнстаГрим',
      handle: `@${nick.toLowerCase()}`,
      tagline: 'Фоточки, рилсы и «сторис, которые исчезают через 24ч… почти»',
      accent: '#E1306C',
      followers: instaFollowers,
      following: 40 + Math.floor(state.day * 1.5) + Math.min(200, countPosts(feed) * 3),
      posts: countPosts(feed, 'reel') + Math.floor(state.day / 2),
      likes: Math.floor(instaFollowers * 0.12 + reelViews * 0.2 + hype * 2),
      views: Math.floor(reelViews * 1.1 + allViews * 0.15),
      engagement: Math.min(28, Math.round(4 + hype * 0.02 + (reelViews > 0 ? 3 : 0))),
      rankLabel: nicheRank(instaFollowers),
      tip:
        reelViews > videoViews
          ? 'Рилсы тянут охват. Ещё один мемный монтаж — и сторис сами себя напишут.'
          : 'Мало рилсов: ИнстаГрим кормит вертикаль, не получасовые летсплеи.',
    },
    {
      id: 'twitchly',
      name: 'ТвичЛайв',
      handle: nick,
      tagline: '«Just chatting», донаты и внезапный рейд от бота с ником xX_Pro_Xx',
      accent: '#9146FF',
      followers: twitchFollowers,
      following: 12 + Math.min(80, state.streamsDone),
      posts: state.streamsDone,
      likes: Math.floor(twitchFollowers * 0.08 + state.bestCombo * 5),
      views: Math.floor(clipViews * 1.4 + state.streamsDone * 40 + subs * 2),
      engagement: Math.min(35, Math.round(6 + state.streamsDone * 0.3 + (subs > 50 ? 4 : 0))),
      rankLabel: nicheRank(twitchFollowers),
      tip:
        state.streamsDone < 3
          ? 'Мало эфиров — алгоритм ТвичЛайва думает, что ты AFK в меню.'
          : 'Клипы с эфира кормят рекомендации. Не забывай монтировать после стрима.',
    },
    {
      id: 'facelook',
      name: 'ФейсБук',
      handle: `${nick} Gaming`,
      tagline: 'Дяди в ленте, длинные видео и кнопки «мне нрав» цвета ностальгии',
      accent: '#1877F2',
      followers: faceFollowers,
      following: 25 + Math.floor(rep * 0.8),
      posts: countPosts(feed, 'video') + Math.floor(state.day / 3),
      likes: Math.floor(faceFollowers * 0.09 + videoViews * 0.15 + sumEarned(feed, 'video') * 2),
      views: Math.floor(videoViews * 1.25 + allViews * 0.1),
      engagement: Math.min(22, Math.round(3 + rep * 0.08 + (videoViews > 0 ? 4 : 0))),
      rankLabel: nicheRank(faceFollowers),
      tip:
        videoViews < 30
          ? 'ФейсБук любит «серьёзные» ролики. Выложи нормальное видео, не только рилсы.'
          : 'Видео заходят тёплой аудитории. Репутация тут важнее мемов.',
    },
    {
      id: 'ticktock',
      name: 'ТикТак',
      handle: `@${nick.toLowerCase()}.gg`,
      tagline: '15 секунд славы, звук из 2019 и танец, который ты не просил',
      accent: '#25F4EE',
      followers: tickFollowers,
      following: 60 + Math.min(300, countPosts(feed, 'reel') * 8),
      posts: countPosts(feed, 'reel') + countPosts(feed, 'clip'),
      likes: Math.floor(tickFollowers * 0.25 + reelViews * 0.35 + clipViews * 0.1),
      views: Math.floor(reelViews * 1.6 + clipViews * 0.9),
      engagement: Math.min(42, Math.round(8 + hype * 0.03 + (reelViews > 80 ? 6 : 0))),
      rankLabel: nicheRank(tickFollowers),
      tip:
        state.day % 2 === 0
          ? 'ТикТак награждает хук в первые 1.5с. Без мема в монтаже — в бездну «Для вас».'
          : 'Иногда один рилс выстреливает. Иногда — 11 просмотров от мамы.',
    },
  ]
}

export function socialTotals(platforms: SocialPlatform[]) {
  return {
    followers: platforms.reduce((a, p) => a + p.followers, 0),
    views: platforms.reduce((a, p) => a + p.views, 0),
    likes: platforms.reduce((a, p) => a + p.likes, 0),
  }
}
