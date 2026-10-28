type Props = { count: number }

export function GoingLive({ count }: Props) {
  return (
    <div className="going-live" role="status">
      <div className="going-live-card">
        <p className="eyebrow">Going Live</p>
        <div className="going-count">{count}</div>
        <p>Подключаем захват и чат…</p>
      </div>
    </div>
  )
}
