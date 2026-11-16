import { useMemo, useState } from 'react'
import { useOne } from '../../api/hooks'
import type { Setting } from '../../api/types'
import { Button, Card, CardTitle, Checkbox, ErrorAlert, Input, Textarea, useToast } from '../../components/ui'
import { t } from '../../i18n'
import { errorMessage } from '../../lib/errors'
import { useSend } from '../../api/hooks'

/** settings/ может вернуть массив, {results} или словарь ключ -> значение. */
export function normSettings(d: unknown): Setting[] {
  if (!d) return []
  if (Array.isArray(d)) return d as Setting[]
  const o = d as { results?: Setting[] } & Record<string, unknown>
  if (Array.isArray(o.results)) return o.results
  return Object.entries(o).map(([key, value]) => (
    value && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as object)
      ? { key, ...(value as object) } as Setting
      : { key, value }))
}

export function useSettings() {
  const q = useOne<unknown>('settings/', { page_size: 500 })
  const list = useMemo(() => normSettings(q.data), [q.data])
  return { ...q, list }
}

export const GROUP_ALIASES: Record<string, string[]> = {
  sla: ['terms', 'sla'],
  growth: ['growth', 'rating'],
  approvals: ['approvals', 'pricing'],
  notifications: ['notifications', 'notify', 'channels'],
  franchise: ['franchise'],
  commissions: ['commissions'],
}

export function matchGroup(s: Setting, group: string): boolean {
  const al = GROUP_ALIASES[group] ?? [group]
  const g = (s.group ?? '').toLowerCase()
  if (g) return al.includes(g)
  const k = s.key.toLowerCase()
  return al.some((a) => k.startsWith(`${a}.`) || k.startsWith(`${a}_`))
}

function kindOf(s: Setting): 'bool' | 'number' | 'json' | 'text' | 'long' {
  const t = (s.type ?? '').toLowerCase()
  if (t === 'bool' || t === 'boolean' || typeof s.value === 'boolean') return 'bool'
  if (['int', 'integer', 'decimal', 'float', 'number'].includes(t) || typeof s.value === 'number') return 'number'
  if (t === 'json' || (s.value && typeof s.value === 'object')) return 'json'
  if (s.key.includes('template') || (typeof s.value === 'string' && s.value.length > 80)) return 'long'
  return 'text'
}

const toDraft = (s: Setting): string => {
  const k = kindOf(s)
  if (k === 'json') return JSON.stringify(s.value ?? null, null, 2)
  return s.value == null ? '' : String(s.value)
}

function fromDraft(s: Setting, d: string): unknown {
  const k = kindOf(s)
  if (k === 'bool') return d === 'true'
  if (k === 'number') {
    const n = Number(d.replace(',', '.'))
    if (Number.isNaN(n)) throw new Error(t('settings.err.number', { name: s.label ?? s.key }))
    return (s.type ?? '').toLowerCase() === 'decimal' || !Number.isInteger(n) ? String(n) : n
  }
  if (k === 'json') {
    try { return JSON.parse(d) } catch { throw new Error(t('settings.err.json', { name: s.label ?? s.key })) }
  }
  return d
}

/** Редактор набора настроек: сохраняет изменённые ключи по одному (PATCH settings/{key}/). */
export function SettingsEditor({ title, items, readOnly, hint }: { title: string; items: Setting[]; readOnly?: boolean; hint?: string }) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [send] = useSend()
  const toast = useToast()
  const val = (s: Setting) => draft[s.key] ?? toDraft(s)
  const dirty = items.filter((s) => draft[s.key] !== undefined && draft[s.key] !== toDraft(s))

  const save = async () => {
    setBusy(true); setErr(null)
    try {
      for (const s of dirty) await send(`settings/${s.key}/`, { value: fromDraft(s, draft[s.key]), reason: reason.trim() || undefined }, 'PATCH')
      toast.success(t('settings.saved'))
      setDraft({}); setReason('')
    } catch (e) {
      setErr(e instanceof Error && !('status' in e) ? { data: { detail: e.message } } : { data: { detail: errorMessage(e) } })
    } finally { setBusy(false) }
  }

  return (
    <Card white>
      <CardTitle>{title}</CardTitle>
      {hint && <p className="muted">{hint}</p>}
      {items.length === 0 && <p className="muted">{t('settings.no_params')}</p>}
      <div className="form-grid">
        {items.map((s) => {
          const k = kindOf(s)
          const label = s.label ?? s.key
          if (k === 'bool') return <div key={s.key} className="span-2"><Checkbox label={label} disabled={readOnly} checked={val(s) === 'true'} onChange={(e) => setDraft({ ...draft, [s.key]: String(e.target.checked) })} /></div>
          if (k === 'json' || k === 'long') return <div key={s.key} className="span-2"><Textarea label={label} rows={k === 'json' ? 5 : 3} disabled={readOnly} hint={s.help ?? s.key} value={val(s)} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} /></div>
          return <Input key={s.key} label={label} hint={s.help ?? s.key} disabled={readOnly} inputMode={k === 'number' ? 'decimal' : undefined} value={val(s)} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} />
        })}
      </div>
      <ErrorAlert error={err} />
      {!readOnly && items.length > 0 && (
        <div className="row" style={{ marginTop: 16, alignItems: 'flex-end' }}>
          <div className="grow"><Input label={t('settings.audit_reason')} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <Button loading={busy} disabled={dirty.length === 0} onClick={save}>{t('common.save')}{dirty.length ? ` (${dirty.length})` : ''}</Button>
        </div>
      )}
    </Card>
  )
}

export function SettingsGroupPanel({ group, title, readOnly, hint }: { group: string; title: string; readOnly?: boolean; hint?: string }) {
  const { list, isLoading, error } = useSettings()
  return (
    <div className="stack">
      <ErrorAlert error={error} />
      {isLoading ? <span className="skeleton" style={{ height: 120 }} /> : <SettingsEditor title={title} hint={hint} readOnly={readOnly} items={list.filter((s) => matchGroup(s, group))} />}
    </div>
  )
}
