type EmptyStateProps = {
  title: string
  subtitle: string
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">◌</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  )
}
