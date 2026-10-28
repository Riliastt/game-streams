import { useGame } from '../game/GameContext'
import { availableChoices, getScene } from '../game/narrative'

const PORTRAIT_LABEL: Record<string, string> = {
  you: 'Вы',
  viewer: 'Зритель',
  friend: 'Друг',
  brand: 'Бренд',
  hater: 'Хейт',
  collab: 'Коллаб',
  news: 'Треды',
  luch: 'Луч',
  marina: 'Марина',
  volt: 'Volt',
  nexus: 'Nexus',
}

export function StoryScreen() {
  const { state, chooseStory } = useGame()
  const scene = state.pendingSceneId ? getScene(state.pendingSceneId) : undefined

  if (!scene) {
    return (
      <div className="screen story-screen landscape">
        <p>Сцена не найдена.</p>
      </div>
    )
  }

  const choices = availableChoices(state, scene)
  const showCam = scene.portrait === 'you'

  return (
    <div className="screen story-screen landscape">
      <div className="story-landscape">
        <div className={`portrait portrait-${scene.portrait}`} aria-hidden>
          {showCam ? (
            <img
              src="./art/streamer_cam.jpg"
              alt=""
              className="upgrade-thumb"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              draggable={false}
            />
          ) : (
            PORTRAIT_LABEL[scene.portrait] ?? scene.portrait
          )}
        </div>
        <div className="story-bubble">
          <p className="speaker">{scene.speaker}</p>
          <p className="story-text">{scene.text}</p>
        </div>
        <div className="story-choices">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="btn primary big"
              onClick={() => chooseStory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
