import { Icon } from './Icon'

type EmptyStateProps = {
  title: string
  subtitle: string
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon name="inbox" className="empty-state-icon" />
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  )
}
