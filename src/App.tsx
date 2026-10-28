import { useGame } from './game/GameContext'
import { GamesScreen } from './ui/GamesScreen'
import { GoingLive } from './ui/GoingLive'
import { HubScreen } from './ui/HubScreen'
import { Overlays } from './ui/Overlays'
import { QuestsScreen } from './ui/QuestsScreen'
import { RatingScreen } from './ui/RatingScreen'
import { RotateGate } from './ui/RotateGate'
import { SocialScreen } from './ui/SocialScreen'
import { StreamScreen } from './ui/StreamScreen'
import { StoryScreen } from './ui/StoryScreen'
import { TeamScreen } from './ui/TeamScreen'
import { UpgradeScreen } from './ui/UpgradeScreen'

export default function App() {
  const { ready, screen, state, goingLive, goingLiveCount } = useGame()

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-card">
          <p className="eyebrow">Стример: путь наверх</p>
          <h1>Загрузка студии…</h1>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-shell theme-${state.themeId}`}>
      <RotateGate />
      {goingLive && <GoingLive count={goingLiveCount} />}
      {screen === 'hub' && <HubScreen />}
      {screen === 'stream' && <StreamScreen />}
      {screen === 'upgrades' && <UpgradeScreen />}
      {screen === 'story' && <StoryScreen />}
      {screen === 'team' && <TeamScreen />}
      {screen === 'quests' && <QuestsScreen />}
      {screen === 'games' && <GamesScreen />}
      {screen === 'social' && <SocialScreen />}
      {screen === 'rating' && <RatingScreen />}
      <Overlays />
    </div>
  )
}
