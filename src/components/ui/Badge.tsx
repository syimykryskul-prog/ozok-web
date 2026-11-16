import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { statusInfo } from '../../lib/status'
import type { StatusKind } from '../../lib/status'
import type { Tone } from '../../lib/status'
import { useT } from '../../i18n'
import { cls } from '../../lib/format'

export function Badge({
  tone = 'neutral', icon: Icon, children, small,
}: { tone?: Tone; icon?: LucideIcon; children: ReactNode; small?: boolean }) {
  return (
    <span className={cls('chip', `chip--${tone}`, small && 'chip--sm')}>
      {Icon && <Icon size={14} strokeWidth={2.2} aria-hidden />}
      {children}
    </span>
  )
}

export function StatusChip({ kind, status, small }: { kind: StatusKind; status: string; small?: boolean }) {
  const s = statusInfo(kind, status)
  if (!s) return <Badge small={small}>{status}</Badge>
  return <Badge tone={s.tone} icon={s.icon} small={small}>{s.label}</Badge>
}

export function ActiveChip({ active }: { active: boolean }) {
  const t = useT()
  return active ? <Badge tone="success" small>{t('ui.active')}</Badge> : <Badge tone="neutral" small>{t('ui.disabled')}</Badge>
}
