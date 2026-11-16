import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cls } from '../../lib/format'

export function Card({
  white, flush, className, children, ...rest
}: { white?: boolean; flush?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cls('card', white && 'card--white', flush && 'card--flush', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card__title">
      <h3>{children}</h3>
      {actions}
    </div>
  )
}

export function PageHeader({
  eyebrow, title, actions, children,
}: { eyebrow?: string; title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}

export function KpiCard({
  icon: Icon, label, value, sub,
}: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi__icon"><Icon size={22} strokeWidth={2} aria-hidden /></div>
      <div>
        <div className="kpi__label">{label}</div>
        <div className="kpi__value">{value}</div>
        {sub && <div className="kpi__sub">{sub}</div>}
      </div>
    </div>
  )
}
