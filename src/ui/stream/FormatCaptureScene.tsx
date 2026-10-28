import type { ContentType } from '../../game/state'

type Props = {
  format: ContentType
  formatName: string
  clicks: number
  combo: number
  active: boolean
}

const ART: Partial<Record<ContentType, string>> = {
  reacts: './art/stream/reacts.jpg',
  irl: './art/stream/irl.jpg',
  collab: './art/stream/collab.jpg',
  vlog: './art/stream/vlog.jpg',
  shorts: './art/stream/shorts.jpg',
}

/** Non-letsplay formats: AI art backdrop + light motion overlays */
export function FormatCaptureScene({ format, formatName, clicks, combo, active }: Props) {
  const src = ART[format] ?? ART.reacts!

  return (
    <div
      className={`format-capture format-${format} ${active ? 'live' : ''} ${combo >= 5 ? 'hot' : ''} pulse-${clicks % 5}`}
      aria-hidden
    >
      <img src={src} alt="" className="fc-art" draggable={false} />
      <div className="fc-color-wash" />
      <div className="fc-vignette" />
      <div className="fc-scan" />
      <div className="fc-grain" />
      {active && <div className="fc-live-glow" />}
      <div className="fc-hud">
        <span className="fc-chip">{formatName}</span>
        {combo > 1 && <span className="fc-chip hot">x{combo}</span>}
      </div>
    </div>
  )
}

/** Formats where a separate OBS webcam picture-in-picture does not make sense */
export function formatNeedsWebcam(format: ContentType): boolean {
  // Letsplay: classic facecam beside game. Everything else is already face/environment content.
  return format === 'letsplay'
}
