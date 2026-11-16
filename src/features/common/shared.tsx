import { useState } from 'react'
import { useList, useOne } from '../../api/hooks'
import type { AuditEntry } from '../../api/types'
import { Badge, Card, DataTable, ErrorAlert, FormModal, Textarea } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { AUDIT_ACTIONS } from '../../lib/status'
import { useT } from '../../i18n'

/** Диалог с обязательной причиной (отмена, закрытие, переназначение, отклонение…). */
export function ReasonModal({
  title, label, hint, submitLabel, required = true, onSubmit, onClose, extra,
}: {
  title: string; label?: string; hint?: string; submitLabel?: string; required?: boolean
  onSubmit: (reason: string) => Promise<unknown> | unknown; onClose: () => void; extra?: React.ReactNode
}) {
  const t = useT()
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (required && !reason.trim()) return setErr(t('shared.reasonRequired'))
    setBusy(true)
    try {
      const r = await onSubmit(reason.trim())
      if (r !== undefined && r !== false) onClose()
    } finally { setBusy(false) }
  }
  return (
    <FormModal title={title} onClose={onClose} onSubmit={submit} saving={busy} submitLabel={submitLabel ?? t('common.confirm')}>
      {extra}
      <Textarea label={label ?? t('common.reason')} hint={hint} value={reason} error={err} onChange={(e) => { setReason(e.target.value); setErr('') }} />
    </FormModal>
  )
}

/** Значение защищённого поля: для остальных ролей приходит *** */
export function Masked({ value }: { value?: string | null }) {
  const t = useT()
  if (!value) return <>—</>
  if (/^\*+$/.test(value)) return <span className="muted" title={t('shared.maskedTitle')}>••••••••</span>
  return <>{value}</>
}

function changesText(c: AuditEntry['changes']): string {
  if (!c || typeof c !== 'object') return ''
  return Object.entries(c).map(([k, v]) => {
    if (Array.isArray(v) && v.length === 2) return `${k}: ${String(v[0] ?? '∅')} → ${String(v[1] ?? '∅')}`
    return `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`
  }).join('; ')
}

export function AuditTable({ params, showEntity }: { params: Record<string, string | number | undefined>; showEntity?: boolean }) {
  const t = useT()
  const [page, setPage] = useState(1)
  const { rows, data, isLoading, error } = useList<AuditEntry>('audit-log/', { page, page_size: 20, ordering: '-created_at', ...params })
  return (
    <>
      <ErrorAlert error={error} />
      <DataTable
        loading={isLoading} rows={rows} rowKey={(r) => r.id} page={page} total={data?.count} onPage={setPage}
        emptyTitle={t('shared.auditEmptyTitle')} emptyText={t('shared.auditEmptyText')}
        columns={[
          { key: 'd', header: t('shared.colWhen'), render: (r) => formatDateTime(r.created_at) },
          { key: 'u', header: t('shared.colWho'), render: (r) => r.user_name ?? (r as AuditEntry & { user_email?: string }).user_email ?? '—' },
          { key: 'a', header: t('shared.action'), render: (r) => <Badge small tone={r.action === 'cancel' || r.action === 'login_failed' ? 'error' : 'info'}>{AUDIT_ACTIONS[r.action] ?? r.action}</Badge> },
          ...(showEntity ? [{ key: 'e', header: t('shared.colObject'), render: (r: AuditEntry) => `${r.entity} #${r.entity_id}` }] : []),
          { key: 'c', header: t('shared.colChanges'), render: (r) => <span style={{ fontSize: 13 }}>{changesText(r.changes) || '—'}</span> },
          { key: 'r', header: t('common.reason'), render: (r) => r.reason || '—' },
        ]}
      />
    </>
  )
}

/** Вкладка «История изменений» объекта: audit-log/?entity=&entity_id= */
export function HistoryTab({ entity, id }: { entity: string; id: number | string }) {
  return <Card white flush><AuditTable params={{ entity, entity_id: id }} /></Card>
}


/** Имя по id (запрашивается лениво; при отсутствии доступа показывает №). */
export function NameOf({ path, id, field = 'name' }: { path: string; id?: number | null; field?: string }) {
  const t = useT()
  const q = useOne<Record<string, unknown>>(`${path}${id}/`, undefined, { skip: !id })
  if (!id) return <>—</>
  const v = q.data?.[field] ?? q.data?.full_name ?? q.data?.business_name
  return <>{typeof v === 'string' && v ? v : t('shared.numberSign', { id })}</>
}
