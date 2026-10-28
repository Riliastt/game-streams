import { visualTier } from './gear'

const BASE = './art/studio'

/** Map upgrade level → art tier 1..4 (level 0 still shows base tier 1 for desk/laptop). */
export function artTier(level: number): 1 | 2 | 3 | 4 {
  if (level <= 0) return 1
  if (level === 1) return 1
  if (level === 2) return 2
  if (level <= 4) return 3
  return 4
}

/** Pick art path for each studio layer from upgrade levels (0–max). */
export function studioLayerArt(levels: {
  room: number
  pc: number
  lights: number
  cam: number
  mic: number
}) {
  const deskT = artTier(levels.room)
  const pcT = artTier(levels.pc)
  const lightT = visualTier(levels.lights)
  const camT = artTier(Math.max(0, levels.cam))
  const micT = artTier(Math.max(0, levels.mic))
  const roomT = visualTier(levels.room)

  return {
    room: roomT >= 2 ? `${BASE}/studio_room_2.jpg` : `${BASE}/studio_room_0.jpg`,
    desk: `${BASE}/prop_desk_${deskT}.png`,
    deskTier: deskT,
    laptop: `${BASE}/prop_laptop_${pcT}.png`,
    pc: `${BASE}/prop_laptop_${pcT}.png`,
    pcTier: pcT,
    light: lightT >= 3 ? `${BASE}/prop_light_3.png` : lightT >= 1 ? `${BASE}/prop_light_1.png` : null,
    lightTier: lightT,
    // Only clip-on webcams for laptop mount (cam_3/4 are full tripod rigs)
    cam: levels.cam > 0 ? `${BASE}/prop_cam_${camT >= 2 ? 2 : 1}.png` : null,
    camTier: levels.cam > 0 ? camT : 0,
    mic: levels.mic > 0 ? `${BASE}/prop_mic_${micT}.png` : null,
    micTier: levels.mic > 0 ? micT : 0,
    roomTier: roomT,
  }
}
