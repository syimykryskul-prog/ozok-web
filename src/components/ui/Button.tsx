import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cls } from '../../lib/format'

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Common {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  children?: ReactNode
}

function classes(variant: Variant, size: Size, extra?: string) {
  return cls('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, extra)
}

export function Button({
  variant = 'primary', size = 'md', icon: Icon, loading, children, className, disabled, type = 'button', ...rest
}: Common & { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <span className="btn__spinner" aria-hidden /> : Icon ? <Icon size={18} strokeWidth={2} aria-hidden /> : null}
      {children}
    </button>
  )
}

export function ButtonLink({
  to, variant = 'primary', size = 'md', icon: Icon, children, className,
}: Common & { to: string; className?: string }) {
  return (
    <Link to={to} className={classes(variant, size, className)}>
      {Icon && <Icon size={18} strokeWidth={2} aria-hidden />}
      {children}
    </Link>
  )
}
