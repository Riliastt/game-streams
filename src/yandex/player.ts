import { getSDK } from './sdk'

let player: YaGamesPlayer | null = null

export async function initPlayer(): Promise<YaGamesPlayer | null> {
  const sdk = getSDK()
  if (!sdk) return null
  try {
    player = await sdk.getPlayer()
    return player
  } catch {
    player = null
    return null
  }
}

export function getPlayer(): YaGamesPlayer | null {
  return player
}

export async function loadCloudSave(): Promise<Record<string, unknown> | null> {
  if (!player) return null
  try {
    const data = await player.getData(['save'])
    const save = data.save
    if (save && typeof save === 'object') {
      return save as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

export async function writeCloudSave(save: Record<string, unknown>): Promise<void> {
  if (!player) return
  try {
    await player.setData({ save }, true)
  } catch (error) {
    console.warn('Cloud save failed', error)
  }
}
