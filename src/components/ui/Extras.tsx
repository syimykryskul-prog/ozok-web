import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { errorMessage } from '../../lib/errors'
import { cls } from '../../lib/format'
import type { Tone } from '../../lib/status'

export function Tabs<T extends string>({
  tabs, value, onChange,
}: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" className="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function ErrorAlert({ error }: { error: unknown }) {
  if (!error) return null
  return <div className="alert alert--error" role="alert"><TriangleAlert size={18} aria-hidden />{errorMessage(error)}</div>
}

export function Bar({ value, tone = 'success' }: { value: number; tone?: Tone }) {
  const p = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className="bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={cls('bar__fill', `bar__fill--${tone}`)} style={{ width: `${p}%` }} />
    </div>
  )
}

export function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="dl">
      {items.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v ?? '—'}</dd></Fragment>))}
    </dl>
  )
}

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)
export const planTone = (v: number | null | undefined): Tone => (v == null ? 'neutral' : v >= 0.9 ? 'success' : v >= 0.6 ? 'warning' : 'error')
export const ratingTone = (v: number | null | undefined): Tone => (v == null ? 'neutral' : v >= 75 ? 'success' : v >= 50 ? 'warning' : 'error')
