import { useState } from 'react'
import { useT } from '../../i18n'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlarmClock, LayoutGrid, Phone, Plus, Table2, UserRoundCog } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Lead } from '../../api/types'
import {
  Badge, Button, Card, DataTable, ErrorAlert, FormModal, Input, PageHeader, SearchInput, Select, StatusChip, Textarea, useToast,
} from '../../components/ui'
import { formatDate, formatDateTime, formatPhone, toISODate } from '../../lib/format'
import { LeadModal, OwnerBadge } from './LeadDetail'
import { UserSelect } from '../common/pickers'
import { useListState } from '../../lib/useListState'
import { useForm } from '../../lib/useForm'
import { BUSINESS_TYPES, LEAD_INTERESTS, LEAD_SOURCES, STATUS, dictOptions, statusOptions } from '../../lib/status'
import { FranchiseeSelect, toId, useProductLabel, useProductOptionsByCode } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'

function AssignModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ franchisee: lead.franchisee ? String(lead.franchisee) : '', reason: '' })
  const submit = async () => {
    if (!f.v.franchisee) return f.fail({ data: { franchisee: [t('leads.err.franchisee')] } })
    if (!f.v.reason.trim()) return f.fail({ data: { reason: [t('leads.err.reassign')] } })
    const r = await act(`leads/${lead.id}/assign/`, { franchisee: Number(f.v.franchisee), reason: f.v.reason.trim() }, t('leads.assigned'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('leads.assignTitle', { name: lead.name })} onClose={onClose} onSubmit={submit} saving={busy} submitLabel={t('leads.assignBtn')}>
      <FranchiseeSelect value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} error={f.errors.franchisee} onlyActive />
      <Textarea label={t('leads.reasonReq')} value={f.v.reason} error={f.errors.reason} onChange={(e) => f.set('reason', e.target.value)} />
      <p className="muted" style={{ fontSize: 13 }}>{t('leads.leadCity', { city: lead.city || '—' })}</p>
    </FormModal>
  )
}

function WinModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ business_name: lead.name, business_type: 'shop' })
  const submit = async () => {
    const r = await act(`leads/${lead.id}/win/`, { business_name: f.v.business_name.trim() || undefined, business_type: f.v.business_type }, t('leads.won'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('leads.winTitle')} onClose={onClose} onSubmit={submit} saving={busy} submitLabel={t('leads.createClient')}>
      <Input label={t('leads.businessName')} value={f.v.business_name} onChange={(e) => f.set('business_name', e.target.value)} />
      <Select label={t('leads.businessType')} options={dictOptions(BUSINESS_TYPES)} value={f.v.business_type} onChange={(e) => f.set('business_type', e.target.value)} />
    </FormModal>
  )
}

function LoseModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ lost_reason: '' })
  const submit = async () => {
    if (!f.v.lost_reason.trim()) return f.fail({ data: { lost_reason: [t('leads.err.lostReason')] } })
    const r = await act(`leads/${lead.id}/lose/`, { lost_reason: f.v.lost_reason.trim() }, t('leads.lost'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('leads.loseTitle')} onClose={onClose} onSubmit={submit} saving={busy} submitLabel={t('leads.loseBtn')}>
      <Textarea label={t('leads.lostReason')} value={f.v.lost_reason} onChange={(e) => f.set('lost_reason', e.target.value)} error={f.errors.lost_reason} />
    </FormModal>
  )
}

function LeadForm({ onClose, franchisee }: { onClose: () => void; franchisee?: number }) {
  const t = useT()
  const hq = useIsHq()
  const { act, busy } = useAct()
  const prodOpts = useProductOptionsByCode()
  const f = useForm({
    name: '', phone: '', city: '', interest: 'program', product: '', source: hq ? 'inbound_call' : 'partner_ads', comment: '', franchisee: franchisee ? String(franchisee) : '',
    company_name: '', contact_name: '', region: '', implementer: '', next_contact_at: '',
  })
  const submit = async () => {
    const e: Record<string, string> = {}
    if (!f.v.name.trim()) e.name = t('leads.err.name')
    if (!f.v.phone.trim()) e.phone = t('leads.err.phone')
    if (Object.keys(e).length) return f.fail({ data: Object.fromEntries(Object.entries(e).map(([k, v]) => [k, [v]])) })
    const body: Record<string, unknown> = { ...f.v, franchisee: hq ? toId(f.v.franchisee) : undefined, implementer: toId(f.v.implementer), next_contact_at: f.v.next_contact_at || null }
    const r = await act('leads/', body, t('leads.created2'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('leads.newLead')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Input label={t('leads.company')} value={f.v.company_name} onChange={(e) => f.set('company_name', e.target.value)} />
        <Input label={t('leads.contactPerson')} value={f.v.contact_name} onChange={(e) => f.set('contact_name', e.target.value)} />
        <Input label={t('leads.name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} />
        <Input label={t('common.phone')} value={f.v.phone} onChange={(e) => f.set('phone', e.target.value)} error={f.errors.phone} placeholder="0555 000 000" />
        <Input label={t('common.city')} value={f.v.city} onChange={(e) => f.set('city', e.target.value)} error={f.errors.city} />
        <Input label={t('common.region')} value={f.v.region} onChange={(e) => f.set('region', e.target.value)} />
        <Input label={t('leads.nextContact')} type="datetime-local" value={f.v.next_contact_at} onChange={(e) => f.set('next_contact_at', e.target.value)} />
        {hq && <UserSelect label={t('leads.implementer')} value={f.v.implementer} onChange={(v) => f.set('implementer', v)} />}
        <Select label={t('leads.source')} options={dictOptions(LEAD_SOURCES)} value={f.v.source} onChange={(e) => f.set('source', e.target.value)} />
        <Select label={t('leads.interest')} options={dictOptions(LEAD_INTERESTS)} value={f.v.interest} onChange={(e) => f.set('interest', e.target.value)} />
        <Select label={t('leads.product')} options={[...prodOpts, { value: 'help', label: t('leads.helpChoose') }]} placeholder={t('leads.notChosen')} value={f.v.product} onChange={(e) => f.set('product', e.target.value)} />
        {hq && <div className="span-2"><FranchiseeSelect label={t('leads.franchiseeOpt')} placeholder={t('leads.autoAssign')} value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} /></div>}
        <div className="span-2"><Textarea label={t('common.comment')} value={f.v.comment} onChange={(e) => f.set('comment', e.target.value)} /></div>
      </div>
    </FormModal>
  )
}

type Dlg = { kind: 'assign' | 'win' | 'lose'; lead: Lead } | null

function LeadChips({ lead }: { lead: Lead }) {
  const t = useT()
  return (
    <span className="row" style={{ gap: 6 }}>
      <StatusChip kind="lead" status={lead.status} small />
      {lead.overdue && <Badge tone="error" icon={AlarmClock} small>{t('leads.overdue')}</Badge>}
    </span>
  )
}

export function LeadsList({ franchisee, embedded }: { franchisee?: number; embedded?: boolean }) {
  const t = useT()
  const hq = useIsHq()
  const canAssign = useCan('leadAssign')
  const canAct = useCan('leadActions')
  const canCreate = useCan('leadCreate')
  const toast = useToast()
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const [view, setView] = useState<'kanban' | 'table'>(embedded ? 'table' : 'kanban')
  const [creating, setCreating] = useState(false)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [open, setOpen] = useState<Lead | null>(null)
  const { act } = useAct()
  const prodLabel = useProductLabel()
  const ls = useListState({ status: '', source: '', unassigned: sp.get('unassigned') ? 'true' : '', overdue: '', contact_today: '', owner_confirmed: '' })
  const params = { ...ls.params, franchisee, ...(view === 'kanban' ? { page: 1, page_size: 100, status: '' } : {}) }
  const { rows: allRows, data, isLoading, error } = useList<Lead>('leads/', params)
  const today = toISODate(new Date())
  const rows = ls.filters.contact_today ? (allRows ?? []).filter((l) => l.next_contact_at && l.next_contact_at.slice(0, 10) <= today && !['paid', 'won', 'lost'].includes(l.status)) : allRows
  void toast

  const run = (lead: Lead, action: string, msg: string) => act(`leads/${lead.id}/${action}/`, undefined, msg)

  const actions = (l: Lead) => (
    <div className="kcard__actions" onClick={(e) => e.stopPropagation()}>
      {canAssign && !['won', 'paid', 'lost'].includes(l.status) && <Button size="sm" variant="secondary" icon={UserRoundCog} onClick={() => setDlg({ kind: 'assign', lead: l })}>{t('leads.assignBtn')}</Button>}
      {canAct && ['new', 'assigned'].includes(l.status) && l.franchisee != null && <Button size="sm" onClick={() => run(l, 'take', t('leads.taken'))}>{t('leads.take')}</Button>}
      {canAct && ['new', 'assigned', 'in_progress'].includes(l.status) && <Button size="sm" variant="secondary" onClick={() => run(l, 'demo', t('leads.demoMarked'))}>{t('leads.demo')}</Button>}
      {canAct && ['in_progress', 'demo', 'proposal', 'contract'].includes(l.status) && <Button size="sm" variant="dark" onClick={() => setDlg({ kind: 'win', lead: l })}>{t('leads.success')}</Button>}
      {(canAct || canAssign) && !['won', 'paid', 'lost'].includes(l.status) && <Button size="sm" variant="danger" onClick={() => setDlg({ kind: 'lose', lead: l })}>{t('leads.refuse')}</Button>}
      {l.client_id && !hq && <Button size="sm" variant="ghost" onClick={() => navigate(`/clients/${l.client_id}`)}>{t('leads.client')}</Button>}
    </div>
  )

  const FLOW = ['new', 'in_progress', 'demo', 'proposal', 'contract', 'paid', 'lost']
  const cols = [...FLOW, ...['assigned', 'won'].filter((s) => (rows ?? []).some((l) => l.status === s))].filter((s) => hq || s !== 'new' || (rows ?? []).some((l) => l.status === 'new'))

  return (
    <div className="page">
      {!embedded && (
        <PageHeader eyebrow={t('leads.funnel')} title={t('leads.title')} actions={
          <>
            <div className="tabs" role="group" aria-label={t('leads.view')}>
              <button className="tab" aria-selected={view === 'kanban'} onClick={() => setView('kanban')}><LayoutGrid size={16} style={{ display: 'inline', verticalAlign: '-3px' }} aria-hidden /> {t('leads.kanban')}</button>
              <button className="tab" aria-selected={view === 'table'} onClick={() => setView('table')}><Table2 size={16} style={{ display: 'inline', verticalAlign: '-3px' }} aria-hidden /> {t('leads.table')}</button>
            </div>
            {canCreate && <Button icon={Plus} onClick={() => setCreating(true)}>{t('leads.newLead')}</Button>}
          </>
        } />
      )}
      {embedded && canCreate && <div className="row"><Button icon={Plus} size="sm" onClick={() => setCreating(true)}>{t('leads.newLead')}</Button></div>}

      <div className="filters">
        <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('leads.searchPh')} />
        {view === 'table' && <Select label={t('common.status')} options={statusOptions('lead')} placeholder={t('common.all')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />}
        <Select label={t('leads.source')} options={dictOptions(LEAD_SOURCES)} placeholder={t('common.all')} value={ls.filters.source} onChange={(e) => ls.setFilter('source', e.target.value)} />
        {hq && !franchisee && (
          <Select label={t('leads.distribution')} options={[{ value: 'true', label: t('leads.unassigned') }]} placeholder={t('common.all')} value={ls.filters.unassigned} onChange={(e) => ls.setFilter('unassigned', e.target.value)} />
        )}
        <Select label={t('leads.contactToday')} options={[{ value: 'true', label: t('leads.contactTodayYes') }]} placeholder={t('common.all')} value={ls.filters.contact_today} onChange={(e) => ls.setFilter('contact_today', e.target.value)} />
        {hq && <Select label={t('leads.owner')} options={[{ value: 'false', label: t('leads.ownerNotConfirmed') }]} placeholder={t('common.all')} value={ls.filters.owner_confirmed} onChange={(e) => ls.setFilter('owner_confirmed', e.target.value)} />}
        <Select label={t('leads.term')} options={[{ value: 'true', label: t('leads.overdueMany') }]} placeholder={t('common.all')} value={ls.filters.overdue} onChange={(e) => ls.setFilter('overdue', e.target.value)} />
      </div>
      <ErrorAlert error={error} />

      {view === 'kanban' ? (
        isLoading ? <Card><span className="skeleton" style={{ height: 160 }} /></Card> : (
          <div className="kanban">
            {cols.map((s) => {
              const info = STATUS.lead[s]
              const items = (rows ?? []).filter((l) => l.status === s)
              return (
                <div className="kanban__col" key={s}>
                  <div className="kanban__head"><span className="row" style={{ gap: 6 }}><info.icon size={16} aria-hidden />{info.label}</span><Badge small>{items.length}</Badge></div>
                  {items.length === 0 && <span className="muted" style={{ fontSize: 13 }}>{t('leads.empty')}</span>}
                  {items.map((l) => (
                    <div className="kcard" key={l.id} onClick={() => setOpen(l)} style={{ cursor: 'pointer' }}>
                      <div className="kcard__title">{l.company_name || l.name}</div>
                      <OwnerBadge lead={l} />
                      {l.next_contact_at && <div className="muted" style={{ fontSize: 13 }}>{t('leads.contactAt', { dt: formatDateTime(l.next_contact_at) })}</div>}
                      <div className="muted"><Phone size={13} style={{ display: 'inline', verticalAlign: '-2px' }} aria-hidden /> <a href={`tel:${l.phone}`}>{formatPhone(l.phone)}</a></div>
                      <div className="muted">{[l.city, prodLabel(l.product), LEAD_INTERESTS[l.interest]].filter(Boolean).join(' · ')}</div>
                      {hq && <div className="muted" style={{ fontSize: 13 }}>{l.franchisee_name ?? t('leads.notAssigned')}</div>}
                      {l.overdue && <Badge tone="error" icon={AlarmClock} small>{t('leads.overdue')}</Badge>}
                      {l.lost_reason && <div className="muted" style={{ fontSize: 13 }}>{t('leads.reasonLine', { reason: l.lost_reason })}</div>}
                      {actions(l)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )
      ) : (
        <Card white flush>
          <DataTable
            loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={setOpen}
            ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
            emptyTitle={t('leads.tableEmpty')} emptyText={t('leads.tableEmptyText')}
            columns={[
              { key: 'n', header: t('leads.colApplicant'), sortKey: 'name', render: (r) => <div><strong>{r.name}</strong><div className="muted" style={{ fontSize: 12 }}><a href={`tel:${r.phone}`}>{formatPhone(r.phone)}</a></div></div> },
              { key: 'p', header: t('leads.product'), render: (r) => prodLabel(r.product) },
              { key: 'c', header: t('common.city'), sortKey: 'city', render: (r) => r.city || '—' },
              { key: 'i', header: t('leads.colInterest'), render: (r) => LEAD_INTERESTS[r.interest] ?? r.interest },
              { key: 'src', header: t('leads.colSource'), render: (r) => LEAD_SOURCES[r.source] ?? r.source },
              ...(hq && !franchisee ? [{ key: 'f', header: t('leads.colFranchisee'), render: (r: Lead) => r.franchisee_name ?? <Badge tone="warning" small>{t('leads.notAssignedF')}</Badge> }] : []),
              { key: 's', header: t('common.status'), render: (r) => <span className="row" style={{ gap: 6 }}><LeadChips lead={r} /><OwnerBadge lead={r} /></span> },
              { key: 'nc', header: t('leads.colNextContact'), render: (r) => (r.next_contact_at ? formatDateTime(r.next_contact_at) : '—') },
              { key: 'd', header: t('leads.colCreated'), sortKey: 'created_at', render: (r) => formatDate(r.created_at) },
              { key: 'a', header: '', render: (r) => actions(r) },
            ]}
          />
        </Card>
      )}
      {view === 'kanban' && (data?.count ?? 0) > 100 && <p className="muted">{t('leads.first100')}</p>}

      {creating && <LeadForm onClose={() => setCreating(false)} franchisee={franchisee} />}
      {open && <LeadModal lead={open} onClose={() => setOpen(null)} />}
      {dlg?.kind === 'assign' && <AssignModal lead={dlg.lead} onClose={() => setDlg(null)} />}
      {dlg?.kind === 'win' && <WinModal lead={dlg.lead} onClose={() => setDlg(null)} />}
      {dlg?.kind === 'lose' && <LoseModal lead={dlg.lead} onClose={() => setDlg(null)} />}
    </div>
  )
}

export default function LeadsPage() {
  return <LeadsList />
}
