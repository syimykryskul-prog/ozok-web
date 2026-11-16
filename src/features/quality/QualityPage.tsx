import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Audit, AuditItem, Ticket } from '../../api/types'
import {
  Badge, Button, Card, Checkbox, DataTable, ErrorAlert, FormModal, Input, Modal, PageHeader, SearchInput, Select, StatusChip, Tabs, Textarea,
} from '../../components/ui'
import { formatDate, formatDateTime, toISODate } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { PRIORITIES, dictOptions, statusLabel, statusOptions } from '../../lib/status'
import { Bar, ratingTone } from '../../components/ui'
import { ClientSelect, FranchiseeSelect, toId } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useUser } from '../../app/hooks'
import { t, useT } from '../../i18n'

const NEXT: Record<string, string[]> = { open: ['in_progress', 'resolved'], in_progress: ['resolved'], resolved: ['closed', 'in_progress'], closed: [] }

function SlaBadge({ tk }: { tk: Ticket }) {
  const t = useT()
  if (tk.sla_breached) return <Badge tone="error" small>{t('quality.slaBreached')}{tk.sla_hours ? ` · ${t('quality.hours', { n: tk.sla_hours })}` : ''}</Badge>
  return <Badge tone="neutral" small>SLA{tk.sla_hours ? ` ${t('quality.hours', { n: tk.sla_hours })}` : ''}</Badge>
}

function TicketForm({ onClose, client }: { onClose: () => void; client?: number }) {
  const t = useT()
  const user = useUser()
  const isClient = false
  const { act, busy } = useAct()
  const f = useForm({ client: client ? String(client) : '', subject: '', description: '', priority: 'normal' })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!isClient && !f.v.client) e.client = [t('quality.selectClient')]
    if (!f.v.subject.trim()) e.subject = [t('quality.enterSubject')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act('tickets/', { client: isClient ? undefined : toId(f.v.client), subject: f.v.subject.trim(), description: f.v.description, priority: f.v.priority }, t('quality.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('quality.newTicket')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      {!isClient && <ClientSelect value={f.v.client} onChange={(v) => f.set('client', v)} error={f.errors.client} disabled={!!client} franchisee={user?.franchisee?.id} />}
      <Input label={t('quality.subject')} value={f.v.subject} onChange={(e) => f.set('subject', e.target.value)} error={f.errors.subject} />
      <Textarea label={t('common.description')} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} />
      {!isClient && <Select label={t('quality.priority')} options={dictOptions(PRIORITIES)} value={f.v.priority} onChange={(e) => f.set('priority', e.target.value)} />}
    </FormModal>
  )
}

export function TicketsList({ client, franchisee, embedded }: { client?: number; franchisee?: number; embedded?: boolean }) {
  const t = useT()
  const canWrite = useCan('ticketsWrite')
  const isClient = false
  const hq = useIsHq()
  const { act } = useAct()
  const [creating, setCreating] = useState(false)
  const ls = useListState({ status: '', priority: '', sla_breached: '' }, '-opened_at')
  const { rows, data, isLoading, error } = useList<Ticket>('tickets/', { ...ls.params, client, franchisee })
  const rate = (t: Ticket) => ['resolved', 'closed'].includes(t.status) && canWrite

  return (
    <div className="stack">
      {!embedded && (
        <PageHeader eyebrow={isClient ? t('quality.help') : t('quality.service')} title={isClient ? t('quality.support') : t('quality.tickets')}
          actions={canWrite && <Button icon={Plus} onClick={() => setCreating(true)}>{t('quality.newTicket')}</Button>} />
      )}
      {embedded && canWrite && <div className="row"><Button size="sm" icon={Plus} onClick={() => setCreating(true)}>{t('quality.newTicket')}</Button></div>}
      <div className="filters">
        {!isClient && <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('quality.subjectOrClient')} />}
        <Select label={t('common.status')} options={statusOptions('ticket')} placeholder={t('common.all')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        {!isClient && <Select label={t('quality.priority')} options={statusOptions('priority')} placeholder={t('common.all')} value={ls.filters.priority} onChange={(e) => ls.setFilter('priority', e.target.value)} />}
        {!isClient && <Select label={t('quality.sla')} options={[{ value: 'true', label: t('quality.breached') }]} placeholder={t('common.all')} value={ls.filters.sla_breached} onChange={(e) => ls.setFilter('sla_breached', e.target.value)} />}
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id}
          ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('quality.noTickets')} emptyText={t('quality.noTicketsText')}
          columns={[
            { key: 's', header: t('quality.subject'), render: (r) => <div><strong>{r.subject}</strong>{!isClient && <div className="muted" style={{ fontSize: 12 }}>{r.client_name}{hq && !franchisee ? ` · ${r.franchisee_name}` : ''}</div>}</div> },
            { key: 'p', header: t('quality.priority'), render: (r) => <StatusChip kind="priority" status={r.priority} small /> },
            { key: 'st', header: t('common.status'), render: (r) => <StatusChip kind="ticket" status={r.status} small /> },
            { key: 'sla', header: t('quality.sla'), render: (r) => <SlaBadge tk={r} /> },
            { key: 'o', header: t('quality.opened'), sortKey: 'opened_at', render: (r) => formatDateTime(r.opened_at) },
            { key: 'as', header: t('quality.assignee'), render: (r) => r.assignee_name ?? '—' },
            {
              key: 'r', header: t('quality.rating'), render: (r) => rate(r) ? (
                <Select aria-label={t('quality.rating')} className="select--sm" placeholder="—" value={r.rating ?? ''}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} ★` }))}
                  onChange={(e) => e.target.value && act(`tickets/${r.id}/rate/`, { rating: Number(e.target.value) }, t('quality.ratingSaved'))} />
              ) : (r.rating ? `${r.rating} ★` : '—'),
            },
            ...(!isClient && canWrite ? [{
              key: 'a', header: t('quality.changeStatus'), render: (r: Ticket) => (
                <Select aria-label={t('quality.changeStatus')} className="select--sm" disabled={!NEXT[r.status]?.length} options={[r.status, ...(NEXT[r.status] ?? [])].map((s) => ({ value: s, label: statusLabel('ticket', s) }))} value={r.status}
                  onChange={(e) => act(`tickets/${r.id}/status/`, { status: e.target.value }, t('quality.statusChanged'))} />
              ),
            }] : []),
          ]}
        />
      </Card>
      {creating && <TicketForm client={client} onClose={() => setCreating(false)} />}
    </div>
  )
}

const defaultChecklist = () => [
  t('quality.cl.1'), t('quality.cl.2'), t('quality.cl.3'), t('quality.cl.4'), t('quality.cl.5'), t('quality.cl.6'),
]

const calcScore = (items: AuditItem[]) => (items.length ? Math.round((100 * items.filter((i) => i.ok).length) / items.length) : 0)

function AuditModal({ audit, franchisee, onClose }: { audit?: Audit; franchisee?: number; onClose: () => void }) {
  const t = useT()
  const canWrite = useCan('audits')
  const { act, busy } = useAct()
  const f = useForm({
    franchisee: String(audit?.franchisee ?? franchisee ?? ''), date: audit?.date ?? toISODate(new Date()), summary: audit?.summary ?? '',
    items: (audit?.items ?? defaultChecklist().map((c) => ({ criterion: c, ok: false, comment: '' }))) as AuditItem[],
  })
  const setItem = (i: number, patch: Partial<AuditItem>) => f.set('items', f.v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const score = calcScore(f.v.items)
  const submit = async () => {
    if (!f.v.franchisee) return f.fail({ data: { franchisee: [t('quality.selectFr')] } })
    const body = { franchisee: Number(f.v.franchisee), date: f.v.date, summary: f.v.summary, items: f.v.items.filter((i) => i.criterion.trim()) }
    const r = audit ? await act(`audits/${audit.id}/`, body, t('quality.auditSaved'), 'PATCH') : await act('audits/', body, t('quality.auditCreated'))
    if (r) onClose()
  }
  if (!canWrite) {
    return (
      <Modal open title={t('quality.auditTitle', { date: formatDate(audit?.date) })} onClose={onClose} wide>
        <div className="stack">
          <div className="row"><strong>{t('quality.resultColon')}</strong> <Badge tone={ratingTone(audit?.score)}>{audit?.score ?? 0}%</Badge></div>
          {(audit?.items ?? []).map((it, i) => (
            <div className="check-row" key={i}><span><Badge tone={it.ok ? 'success' : 'error'} small>{it.ok ? t('quality.done') : t('quality.notDone')}</Badge> {it.criterion}</span>{it.comment && <span className="muted">{it.comment}</span>}</div>
          ))}
          {audit?.summary && <p className="msg">{audit.summary}</p>}
        </div>
      </Modal>
    )
  }
  return (
    <FormModal wide title={audit ? t('quality.audit') : t('quality.newAudit')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <FranchiseeSelect value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} error={f.errors.franchisee} disabled={!!audit || !!franchisee} />
        <Input label={t('common.date')} type="date" value={f.v.date} onChange={(e) => f.set('date', e.target.value)} />
      </div>
      <div>
        <div className="row row--between"><strong>{t('quality.checklist')}</strong><Badge tone={ratingTone(score)}>{t('quality.total', { n: score })}</Badge></div>
        <Bar value={score / 100} tone={ratingTone(score)} />
        {f.v.items.map((it, i) => (
          <div className="check-row" key={i}>
            <div className="row">
              <Checkbox label="" checked={it.ok} aria-label={t('quality.doneAria', { criterion: it.criterion })} onChange={(e) => setItem(i, { ok: e.target.checked })} />
              <input className="input input--sm" style={{ flex: 1, minWidth: 200 }} aria-label={t('quality.criterion')} value={it.criterion} onChange={(e) => setItem(i, { criterion: e.target.value })} />
              <button type="button" className="icon-btn icon-btn--sm" aria-label={t('quality.deleteCriterion')} onClick={() => f.set('items', f.v.items.filter((_, j) => j !== i))}><Trash2 size={18} /></button>
            </div>
            <input className="input input--sm" placeholder={t('common.comment')} aria-label={t('common.comment')} value={it.comment} onChange={(e) => setItem(i, { comment: e.target.value })} />
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={() => f.set('items', [...f.v.items, { criterion: '', ok: false, comment: '' }])}>{t('quality.addCriterion')}</Button>
      </div>
      <Textarea label={t('quality.auditSummary')} value={f.v.summary} onChange={(e) => f.set('summary', e.target.value)} />
    </FormModal>
  )
}

export function AuditsList({ franchisee, embedded }: { franchisee?: number; embedded?: boolean }) {
  const t = useT()
  const canWrite = useCan('audits')
  const hq = useIsHq()
  const [open, setOpen] = useState<Audit | 'new' | null>(null)
  const ls = useListState({}, '-date')
  const { rows, data, isLoading, error } = useList<Audit>('audits/', { ...ls.params, franchisee })
  return (
    <div className="stack">
      {canWrite && <div className="row"><Button size="sm" icon={Plus} onClick={() => setOpen('new')}>{t('quality.newAudit')}</Button></div>}
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r)}
          page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('quality.noAudits')} emptyText={t('quality.noAuditsText')}
          columns={[
            { key: 'd', header: t('common.date'), render: (r) => formatDate(r.date) },
            ...(hq && !franchisee ? [{ key: 'f', header: t('quality.franchisee'), render: (r: Audit) => <strong>{r.franchisee_name}</strong> }] : []),
            { key: 'i', header: t('quality.inspector'), render: (r) => r.inspector_name ?? '—' },
            { key: 'sc', header: t('quality.result'), render: (r) => <div style={{ minWidth: 140 }}><Badge tone={ratingTone(r.score)} small>{r.score ?? 0}%</Badge><Bar value={(r.score ?? 0) / 100} tone={ratingTone(r.score)} /></div> },
            { key: 'su', header: t('quality.summary'), render: (r) => <span className="muted">{r.summary || '—'}</span> },
          ]}
        />
      </Card>
      {open && <AuditModal audit={open === 'new' ? undefined : open} franchisee={franchisee} onClose={() => setOpen(null)} />}
      {embedded && null}
    </div>
  )
}

export default function QualityPage() {
  const t = useT()
  const isHq = useIsHq()
  const [tab, setTab] = useState<'tickets' | 'audits'>('tickets')
  return (
    <div className="page">
      <PageHeader eyebrow={t('quality.eyebrow')} title={isHq ? t('quality.titleHq') : t('quality.titleFr')} />
      <Tabs tabs={[{ value: 'tickets', label: t('quality.tickets') }, { value: 'audits', label: t('quality.audits') }]} value={tab} onChange={setTab} />
      {tab === 'tickets' ? <TicketsList embedded /> : <AuditsList />}
    </div>
  )
}
