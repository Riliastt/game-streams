import { upgradeCost, upgradeLevel } from '../game/economy'
import { formatSkill, formatSkillLabel, FORMAT_SKILL_MAX } from '../game/formatSkills'
import { visualTier } from '../game/gear'
import { artTier } from '../game/studioArt'
import { useGame } from '../game/GameContext'
import { canAfford, canUseContentType, listContentTypes, listUpgrades } from '../game/management'
import { sumStaffEffect } from '../game/staff'
import { RANKS, rankId } from '../game/ranks'
import { canMoveStudio, getStudio, nextStudio } from '../game/studio'
import { StatsBar } from './StatsBar'

function gearPreview(id: string, level: number) {
  const t = artTier(level)
  const vt = visualTier(level)
  if (id === 'cam') {
    if (level <= 0)
      return (
        <div className="upgrade-thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 10 }}>
          NO CAM
        </div>
      )
    return (
      <img
        src={`./art/studio/prop_cam_${t}.png`}
        alt=""
        className="upgrade-thumb"
        draggable={false}
      />
    )
  }
  if (id === 'mic') {
    if (level <= 0)
      return (
        <div className="upgrade-thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 10, color: '#c44' }}>
          NO MIC
        </div>
      )
    return (
      <img
        src={`./art/studio/prop_mic_${t}.png`}
        alt=""
        className="upgrade-thumb"
        draggable={false}
      />
    )
  }
  if (id === 'pc') {
    return (
      <img
        src={`./art/studio/prop_laptop_${t}.png`}
        alt=""
        className="upgrade-thumb"
        draggable={false}
      />
    )
  }
  if (id === 'lights') {
    if (level <= 0)
      return (
        <div className="upgrade-thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 10 }}>
          DARK
        </div>
      )
    return (
      <img
        src={vt >= 3 ? './art/studio/prop_light_3.png' : './art/studio/prop_light_1.png'}
        alt=""
        className="upgrade-thumb"
        draggable={false}
      />
    )
  }
  if (id === 'room') {
    return (
      <img
        src={`./art/studio/prop_desk_${t}.png`}
        alt=""
        className="upgrade-thumb"
        draggable={false}
      />
    )
  }
  return <div className="upgrade-thumb" />
}

export function UpgradeScreen() {
  const { state, buy, changeContent, setScreen, moveToNextStudio } = useGame()
  const studio = getStudio(state)
  const nextS = nextStudio(state)
  const upgrades = listUpgrades()
  const contents = listContentTypes()
  const discount = Math.min(0.35, sumStaffEffect(state, 'upgradeDiscount'))

  return (
    <div className="screen upgrade-screen landscape">
      <StatsBar />
      <div className="section-head">
        <button type="button" className="btn ghost" onClick={() => setScreen('hub')}>
          ← Студия
        </button>
        <h2>Менеджмент</h2>
      </div>

      <div className="panel-split">
        <section className="block">
          <h3>Формат стрима</h3>
          <div className="chip-grid">
            {contents.map((c) => {
              const locked = !canUseContentType(state, c.id)
              const skill = formatSkill(state, c.id)
              const pct = Math.round((skill / FORMAT_SKILL_MAX) * 100)
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`chip ${state.contentType === c.id ? 'active' : ''}`}
                  disabled={locked}
                  onClick={() => changeContent(c.id)}
                >
                  <strong>{c.name}</strong>
                  <span>{locked ? 'Нужно 100 подп. или коллаб' : c.description}</span>
                  {!locked && (
                    <div className="format-skill" title="Скилл формата: стримь чаще — растёт, пауза 2+ дня — падает">
                      <div className="format-skill-meta">
                        <em>Скилл</em>
                        <em>
                          {formatSkillLabel(skill)} · {pct}%
                        </em>
                      </div>
                      <div className="format-skill-bar">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <h3>Студия · {studio.name}</h3>
          <p className="muted">
            {studio.blurb} · аренда {studio.rent}₽/день
            {studio.viewers > 1 && ` · +${Math.round((studio.viewers - 1) * 100)}% зрителей`}
          </p>
          {nextS ? (
            <div className="upgrade-row studio-move">
              <div style={{ flex: 1 }}>
                <strong>Переезд: {nextS.name}</strong>
                <p>
                  {nextS.blurb}. +{Math.round((nextS.viewers - 1) * 100)}% зрителей, +
                  {Math.round((nextS.hype - 1) * 100)}% хайпа · аренда {nextS.rent}₽/день
                  {rankId(state) < nextS.minRank && ` · нужен ранг «${RANKS[nextS.minRank]!.name}»`}
                </p>
              </div>
              <button
                type="button"
                className="btn primary"
                disabled={!canMoveStudio(state)}
                onClick={moveToNextStudio}
              >
                {nextS.cost.toLocaleString('ru-RU')}₽
              </button>
            </div>
          ) : (
            <p className="muted">Это вершина — дальше только расти аудиторией.</p>
          )}
        </section>

        <section className="block grow">
          <h3>Апгрейды {discount > 0 ? `(−${Math.round(discount * 100)}%)` : ''}</h3>
          <div className="upgrade-list">
            {upgrades.map((u) => {
              const level = upgradeLevel(state, u.id)
              const maxed = level >= u.maxLevel
              const cost = maxed ? 0 : Math.round(upgradeCost(u, level) * (1 - discount))
              const affordable = canAfford(state, u.id)
              return (
                <div key={u.id} className="upgrade-row">
                  {gearPreview(u.id, level)}
                  <div style={{ flex: 1 }}>
                    <strong>
                      {u.name}{' '}
                      <span className="muted">
                        {level}/{u.maxLevel}
                      </span>
                    </strong>
                    <p>{u.description}</p>
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={maxed || !affordable}
                    onClick={() => buy(u.id)}
                  >
                    {maxed ? 'MAX' : `${cost}₽`}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
