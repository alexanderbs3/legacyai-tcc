import { Link } from 'react-router-dom'
import { Icon } from './Icon'

export type BreadcrumbItem = {
  label: string
  to?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Trilha de navegação">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              {item.to && !isLast
                ? <Link to={item.to}>{item.label}</Link>
                : <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>}
              {!isLast && <Icon name="chevron_right" className="breadcrumb-separator" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
