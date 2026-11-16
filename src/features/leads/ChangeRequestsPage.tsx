import { useState } from 'react'
import { useT } from '../../i18n'
import { useList } from '../../api/hooks'
import type { ChangeRequest } from '../../api/types'
import { Button, Card, DataTable, ErrorAlert, PageHeader, Select, StatusChip } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { CR_FIELDS, LEAD_SOURCES, statusOptions } from '../../lib/status'
import { NameOf, ReasonModal } from '../common/shared'
import { useAct, useCan } from '../common/useAct'

export function crValue(r: ChangeRequest, v: unknown): string {
  if (r.field === 'source' && typeof v === 'string') return LEAD_SOURCES[v] ?? v
  if (v == null || v === '') return '—'
  if (r.field === 'franchisee' || r.field === 'implementer') return `№ ${String(v)}`
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

export default function ChangeRequestsPage() {
  const t = useT()
  const canDecide = useCan('changeRequestDecide')
  const { act } = useAct()
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [dlg, setDlg] = useState<{ r: ChangeRequest; kind: 'approve' | 'reject' } | null>(null)
  const { rows, data, isLoading, error } = useList<ChangeRequest>('change-requests/', { status, page, page_size: 20, ordering: '-created_at' })
  return (
    <div className="page">
      <PageHeader eyebrow={t('leads.cr.eyebrow')} title={t('leads.cr.title')} />
      <div className="filters">
        <Select label={t('common.status')} placeholder={t('common.all')} options={statusOptions('changeRequest')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} page={page} total={data?.count} onPage={setPage}
          emptyTitle={t('leads.cr.empty')} emptyText={t('leads.cr.emptyText')}
          columns={[
            { key: 'd', header: t('leads.created'), render: (r) => formatDateTime(r.created_at) },
            { key: 'l', header: t('leads.cr.colLead'), render: (r) => `${r.entity === 'leads.Lead' ? t('leads.lead') : r.entity ?? ''} #${r.entity_id ?? ''}` },
            { key: 'p', header: t('leads.cr.colPartner'), render: (r) => <div>{r.franchisee ? <NameOf path="franchisees/" id={r.franchisee} /> : '—'}<div className="muted" style={{ fontSize: 12 }}>{r.requested_by_name}</div></div> },
            { key: 'f', header: t('leads.cr.colChange'), render: (r) => <div><strong>{CR_FIELDS[r.field] ?? r.field}</strong><div style={{ fontSize: 13 }}>{crValue(r, r.old_value)} → <strong>{crValue(r, r.new_value)}</strong></div></div> },
            { key: 'r', header: t('common.reason'), render: (r) => r.reason || '—' },
            { key: 's', header: t('common.status'), render: (r) => <div><StatusChip kind="changeRequest" status={r.status} small />{r.decision_comment && <div className="muted" style={{ fontSize: 12 }}>{r.decision_comment}</div>}</div> },
            ...(canDecide ? [{
              key: 'a', header: '', render: (r: ChangeRequest) => r.status === 'pending' ? (
                <div className="kcard__actions">
                  <Button size="sm" onClick={() => setDlg({ r, kind: 'approve' })}>{t('leads.cr.approve')}</Button>
                  <Button size="sm" variant="danger" onClick={() => setDlg({ r, kind: 'reject' })}>{t('leads.cr.reject')}</Button>
                </div>) : null,
            }] : []),
          ]}
        />
      </Card>
      {dlg && (
        <ReasonModal
          title={dlg.kind === 'approve' ? t('leads.cr.approveTitle') : t('leads.cr.rejectTitle')} label={t('common.comment')} required={dlg.kind === 'reject'}
          submitLabel={dlg.kind === 'approve' ? t('leads.cr.approve') : t('leads.cr.reject')} onClose={() => setDlg(null)}
          onSubmit={(comment) => act(`change-requests/${dlg.r.id}/${dlg.kind}/`, { comment }, dlg.kind === 'approve' ? t('leads.cr.approved') : t('leads.cr.rejected'))}
        />
      )}
    </div>
  )
}
