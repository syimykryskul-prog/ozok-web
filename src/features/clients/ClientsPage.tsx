import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, UserPlus } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { AssignmentHistory, Client } from '../../api/types'
import { ActiveChip, Badge, Button, Card, DataTable, ErrorAlert, FormModal, Input, PageHeader, SearchInput, Select, Tabs, Textarea } from '../../components/ui'
import { canRead } from '../../lib/permissions'
import { formatDate, formatPhone } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { BRANCH_REASONS, BUSINESS_TYPES, dictOptions } from '../../lib/status'
import { t, useT } from '../../i18n'
import { FranchiseeSelect, toId, useProducts } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { paidState } from './accounts'
import { AssignmentTable, PriorityBranches } from './BranchPanel'
import { LegacyClientsModal } from './LegacyClients'

export function ClientForm({ client, onClose }: { client?: Client; onClose: () => void }) {
  const t = useT()
  const hq = useIsHq()
  const { act, busy } = useAct()
  const f = useForm({
    business_name: client?.business_name ?? '', business_type: client?.business_type ?? 'shop', contact_name: client?.contact_name ?? '',
    phone: client?.phone ?? '', city: client?.city ?? '', address: client?.address ?? '', note: client?.note ?? '', franchisee: client ? String(client.franchisee) : '',
  })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.business_name.trim()) e.business_name = [t('clients.nameRequired')]
    if (hq && !client && !f.v.franchisee) e.franchisee = [t('clients.pickFranchisee')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = { ...f.v, franchisee: hq ? toId(f.v.franchisee) : undefined }
    const r = client ? await act(`clients/${client.id}/`, body, t('clients.saved'), 'PATCH') : await act('clients/', body, t('clients.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={client ? t('clients.editTitle') : t('clients.newTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        {hq && <div className="span-2"><FranchiseeSelect value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} error={f.errors.franchisee} disabled={!!client} /></div>}
        <Input label={t('clients.businessName')} value={f.v.business_name} onChange={(e) => f.set('business_name', e.target.value)} error={f.errors.business_name} />
        <Select label={t('clients.businessType')} options={dictOptions(BUSINESS_TYPES)} value={f.v.business_type} onChange={(e) => f.set('business_type', e.target.value)} />
        <Input label={t('clients.contactPerson')} value={f.v.contact_name} onChange={(e) => f.set('contact_name', e.target.value)} />
        <Input label={t('common.phone')} value={f.v.phone} onChange={(e) => f.set('phone', e.target.value)} placeholder="0555 000 000" />
        <Input label={t('common.city')} value={f.v.city} onChange={(e) => f.set('city', e.target.value)} />
        <Input label={t('clients.address')} value={f.v.address} onChange={(e) => f.set('address', e.target.value)} />
        <div className="span-2"><Textarea label={t('clients.note')} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} /></div>
      </div>
    </FormModal>
  )
}

export const ORIGINS: Record<string, string> = {
  get partner() { return t('clients.origin.partner') }, get ozok_legacy() { return t('clients.origin.ozok_legacy') }, get ozok_direct() { return t('clients.origin.ozok_direct') },
}

export function OriginBadge({ origin }: { origin?: string }) {
  const t = useT()
  if (!origin || origin === 'partner') return null
  return <Badge small tone={origin === 'ozok_legacy' ? 'info' : 'warning'}>{origin === 'ozok_legacy' ? t('clients.origin.legacyBadge') : t('clients.origin.directBadge')}</Badge>
}

export function ClientsList({ franchisee, embedded }: { franchisee?: number; embedded?: boolean }) {
  const t = useT()
  const hq = useIsHq()
  const canWrite = useCan('clientsWrite')
  const navigate = useNavigate()
  const products = useProducts()
  const canLegacy = useCan('legacyClients')
  const [legacy, setLegacy] = useState(false)
  const [creating, setCreating] = useState(false)
  const ls = useListState({ business_type: '', renewal: '', origin: '' })
  const { rows, data, isLoading, error } = useList<Client>('clients/', {
    ...ls.params, franchisee, renewal: undefined, business_type: ls.filters.business_type, origin: ls.filters.origin || undefined,
    renewal_soon: ls.filters.renewal === 'soon' ? true : undefined, expired: ls.filters.renewal === 'expired' ? true : undefined,
  })
  const nameOf = (c: string) => products.find((p) => p.code === c)?.sphere || c

  return (
    <div className="page">
      {!embedded && <PageHeader eyebrow={t('clients.eyebrow')} title={t('clients.title')} actions={<>{canLegacy && !franchisee && <Button variant="secondary" icon={UserPlus} onClick={() => setLegacy(true)}>{t('clients.addLegacy')}</Button>}{canWrite && <Button icon={Plus} onClick={() => setCreating(true)}>{t('clients.newTitle')}</Button>}</>} />}
      {embedded && canWrite && <div className="row"><Button size="sm" icon={Plus} onClick={() => setCreating(true)}>{t('clients.newTitle')}</Button></div>}
      <div className="filters">
        <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('clients.searchPh')} />
        <Select label={t('clients.type')} options={dictOptions(BUSINESS_TYPES)} placeholder={t('common.all')} value={ls.filters.business_type} onChange={(e) => ls.setFilter('business_type', e.target.value)} />
        {hq && <Select label={t('clients.source')} options={dictOptions(ORIGINS)} placeholder={t('common.all')} value={ls.filters.origin} onChange={(e) => ls.setFilter('origin', e.target.value)} />}
        <Select label={t('clients.subscription')} options={[{ value: 'soon', label: t('clients.renewSoon') }, { value: 'expired', label: t('clients.expired') }]} placeholder={t('common.all')} value={ls.filters.renewal} onChange={(e) => ls.setFilter('renewal', e.target.value)} />
      </div>
      {!embedded && <PriorityBranches />}
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/clients/${r.id}`)}
          ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('clients.emptyTitle')} emptyText={t('clients.emptyText')}
          columns={[
            { key: 'n', header: t('clients.business'), sortKey: 'business_name', render: (r) => <div><strong>{r.business_name}</strong> <OriginBadge origin={r.origin} />{hq && !franchisee && <div className="muted" style={{ fontSize: 12 }}>{r.franchisee_name}</div>}</div> },
            { key: 't', header: t('clients.type'), render: (r) => BUSINESS_TYPES[r.business_type] ?? r.business_type },
            { key: 'c', header: t('clients.contact'), render: (r) => <div>{r.contact_name || '—'}<div className="muted" style={{ fontSize: 12 }}>{formatPhone(r.phone)}</div></div> },
            { key: 'ci', header: t('common.city'), render: (r) => r.city || '—' },
            { key: 'p', header: t('clients.products'), render: (r) => (r.products ?? []).map(nameOf).join(', ') || '—' },
            { key: 'u', header: t('clients.paidUntil'), render: (r) => { const s = paidState(r.last_paid_until ?? null); return r.last_paid_until ? <span className="row" style={{ gap: 6 }}>{formatDate(r.last_paid_until)}{s.tone !== 'success' && <Badge tone={s.tone} small>{s.text}</Badge>}</span> : '—' } },
            { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
          ]}
        />
      </Card>
      {creating && <ClientForm onClose={() => setCreating(false)} />}
      {legacy && <LegacyClientsModal onClose={() => setLegacy(false)} />}
    </div>
  )
}

/** Передачи филиалов: история закрепления за партнёрами (branch-assignments/, фильтр reason_code=partner_closed — «Уход партнёра»). */
function TransfersTab() {
  const t = useT()
  const ls = useListState({ reason_code: '', field: '' }, '-effective_from')
  const { rows, data, isLoading, error } = useList<AssignmentHistory>('branch-assignments/', ls.params)
  return (
    <div className="stack">
      <div className="filters">
        <Select label={t('clients.basis')} placeholder={t('common.all')} options={dictOptions(BRANCH_REASONS)} value={ls.filters.reason_code} onChange={(e) => ls.setFilter('reason_code', e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <AssignmentTable rows={rows} loading={isLoading} withBranch />
        {!!data && data.count > (rows?.length ?? 0) && <p className="muted" style={{ padding: '0 24px 16px' }}>{t('clients.shown', { n: rows?.length ?? 0, total: data.count })}</p>}
      </Card>
    </div>
  )
}

type Tab = 'clients' | 'transfers'

export default function ClientsPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('clients')
  const transfers = canRead('branch_assignments')
  if (!transfers) return <ClientsList />
  return (
    <div className="stack">
      <Tabs<Tab> tabs={[{ value: 'clients', label: t('clients.tab.clients') }, { value: 'transfers', label: t('clients.tab.transfers') }]} value={tab} onChange={setTab} />
      {tab === 'clients' ? <ClientsList /> : <div className="page"><PageHeader eyebrow={t('clients.eyebrow')} title={t('clients.tab.transfers')} /><TransfersTab /></div>}
    </div>
  )
}
