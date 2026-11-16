import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { AppUser, Franchisee } from '../../api/types'
import { Badge, Button, Card, DataTable, ErrorAlert, FormModal, Input, Money, PageHeader, SearchInput, Select, StatusChip, Textarea, ratingTone } from '../../components/ui'
import { formatMoney, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { CANDIDATE_SOURCES, CERT_RESULTS, PARTNER_TIERS, REGIONS, STATUS, dictOptions } from '../../lib/status'
import { canSeePersonal } from '../../lib/permissions'
import { useUser } from '../../app/hooks'
import { TierBadge } from './PartnerParts'
import { useT } from '../../i18n'

const PARTNER_STATUSES = ['candidate', 'trainee', 'manager', 'franchisee', 'suspended', 'closed']
const statusOptions = (_k: 'franchisee') => PARTNER_STATUSES.map((value) => ({ value, label: STATUS.franchisee[value].label }))
import { toId, useProducts } from '../common/pickers'
import { useAct, useCan } from '../common/useAct'

export function FranchiseeForm({ item, onClose }: { item?: Franchisee; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const { rows: users } = useList<AppUser>('users/', { page_size: 100, is_active: true })
  const user = useUser()
  const personal = canSeePersonal(user?.role)
  const curators = (users ?? []).filter((u) => ['network_head', 'super_admin', 'recruiter', 'hq_curator', 'hq_admin'].includes(u.role))
  const recruiters = (users ?? []).filter((u) => ['recruiter', 'super_admin', 'network_head', 'hq_curator', 'hq_admin'].includes(u.role))
  const f = useForm({
    name: item?.name ?? '', legal_name: item?.legal_name ?? '', inn: item?.inn ?? '', city: item?.city ?? '', cities: (item?.cities ?? []).join(', '),
    address: item?.address ?? '', phone: item?.phone ?? '', email: item?.email ?? '', owner_name: item?.owner_name ?? '', status: item?.status ?? 'candidate',
    curator: String(item?.curator ?? ''),
    full_name: item?.full_name ?? '', passport: item && /^\*+$/.test(item.passport ?? '') ? '' : item?.passport ?? '', region: item?.region ?? '', candidate_source: item?.candidate_source ?? '',
    recruited_by: String(item?.recruited_by ?? ''), responsible: String(item?.responsible ?? ''), training_date: item?.training_date ?? '', certification_result: item?.certification_result ?? '',
    certification_date: item?.certification_date ?? '', tier: item?.tier ?? 'standard', partner_code: item?.partner_code ?? '', joined_at: item?.joined_at ?? '', note: item?.note ?? '',
  })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.name.trim()) e.name = [t('franchisees.form.nameRequired')]
    if (!f.v.city.trim()) e.city = [t('franchisees.form.cityRequired')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const cities = f.v.cities.split(',').map((c) => c.trim()).filter(Boolean)
    const { passport, inn, ...rest } = f.v
    const body = { ...rest, ...(personal ? { passport, inn } : {}), recruited_by: toId(f.v.recruited_by), responsible: toId(f.v.responsible), training_date: f.v.training_date || null,
      certification_result: f.v.certification_result || null, certification_date: f.v.certification_date || null, specialization: undefined, cities: cities.length ? cities : [f.v.city.trim()], curator: toId(f.v.curator), joined_at: f.v.joined_at || null, partner_code: f.v.partner_code.trim() || undefined }
    const r = item ? await act(`franchisees/${item.id}/`, body, t('franchisees.form.saved'), 'PATCH') : await act('franchisees/', body, t('franchisees.form.created'))
    if (r) onClose()
  }
  return (
    <FormModal wide title={item ? t('franchisees.form.editTitle') : t('franchisees.form.newTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Input label={t('common.name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} placeholder={t('franchisees.form.namePh')} />
        <Input label={t('franchisees.form.code')} value={f.v.partner_code} onChange={(e) => f.set('partner_code', e.target.value)} error={f.errors.partner_code} hint={t('franchisees.form.codeHint')} />
        <Input label={t('franchisees.form.legalName')} value={f.v.legal_name} onChange={(e) => f.set('legal_name', e.target.value)} />
        {personal && <Input label={t('franchisees.form.inn')} value={f.v.inn} onChange={(e) => f.set('inn', e.target.value)} />}
        {personal && <Input label={t('franchisees.form.passport')} value={f.v.passport} onChange={(e) => f.set('passport', e.target.value)} />}
        <Input label={t('common.fullName')} value={f.v.full_name} onChange={(e) => f.set('full_name', e.target.value)} />
        <Select label={t('common.region')} placeholder="—" options={dictOptions(REGIONS)} value={f.v.region} onChange={(e) => f.set('region', e.target.value)} />
        <Select label={t('franchisees.form.source')} placeholder="—" options={dictOptions(CANDIDATE_SOURCES)} value={f.v.candidate_source} onChange={(e) => f.set('candidate_source', e.target.value)} />
        <Select label={t('franchisees.form.recruitedBy')} placeholder="—" options={recruiters.map((u) => ({ value: u.id, label: u.full_name || u.email }))} value={f.v.recruited_by} onChange={(e) => f.set('recruited_by', e.target.value)} />
        <Select label={t('common.responsible')} placeholder="—" options={curators.map((u) => ({ value: u.id, label: u.full_name || u.email }))} value={f.v.responsible} onChange={(e) => f.set('responsible', e.target.value)} />
        <Input label={t('franchisees.form.trainingDate')} type="date" value={f.v.training_date} onChange={(e) => f.set('training_date', e.target.value)} />
        <Select label={t('franchisees.form.certResult')} placeholder="—" options={dictOptions(CERT_RESULTS)} value={f.v.certification_result} onChange={(e) => f.set('certification_result', e.target.value as 'passed' | 'failed' | '')} />
        <Input label={t('franchisees.form.certDate')} type="date" value={f.v.certification_date} onChange={(e) => f.set('certification_date', e.target.value)} />
        <Select label={t('franchisees.form.tier')} options={dictOptions(PARTNER_TIERS)} value={f.v.tier} onChange={(e) => f.set('tier', e.target.value)} />
        <Input label={t('franchisees.form.mainCity')} value={f.v.city} onChange={(e) => f.set('city', e.target.value)} error={f.errors.city} />
        <Input label={t('franchisees.form.coverCities')} value={f.v.cities} onChange={(e) => f.set('cities', e.target.value)} hint={t('franchisees.form.coverHint')} />
        <Input label={t('franchisees.form.owner')} value={f.v.owner_name} onChange={(e) => f.set('owner_name', e.target.value)} />
        <Input label={t('common.phone')} value={f.v.phone} onChange={(e) => f.set('phone', e.target.value)} placeholder="0555 000 000" />
        <Input label={t('common.email')} type="email" value={f.v.email} onChange={(e) => f.set('email', e.target.value)} error={f.errors.email} />
        <Input label={t('franchisees.form.address')} value={f.v.address} onChange={(e) => f.set('address', e.target.value)} />
        <Select label={t('common.status')} options={statusOptions('franchisee')} value={f.v.status} onChange={(e) => f.set('status', e.target.value)} />
        <Select label={t('franchisees.form.curator')} placeholder={t('franchisees.form.notAssigned')} options={curators.map((u) => ({ value: u.id, label: u.full_name || u.email }))} value={f.v.curator} onChange={(e) => f.set('curator', e.target.value)} />
        <Input label={t('franchisees.form.joinedAt')} type="date" value={f.v.joined_at} onChange={(e) => f.set('joined_at', e.target.value)} />
        <div className="span-2"><Textarea label={t('franchisees.form.note')} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} /></div>
      </div>
    </FormModal>
  )
}

export default function FranchiseesPage() {
  const t = useT()
  const navigate = useNavigate()
  const canWrite = useCan('franchisees')
  const products = useProducts()
  const [creating, setCreating] = useState(false)
  const ls = useListState({ status: '', curator: '', tier: '', region: '' })
  const { rows, data, isLoading, error } = useList<Franchisee>('franchisees/', ls.params)
  const label = (c: string) => products.find((p) => p.code === c)?.sphere || c
  return (
    <div className="page">
      <PageHeader eyebrow={t('franchisees.eyebrow')} title={t('franchisees.title')} actions={canWrite && <Button icon={Plus} onClick={() => setCreating(true)}>{t('franchisees.addPartner')}</Button>} />
      <div className="filters">
        <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('franchisees.searchPh')} />
        <Select label={t('common.status')} options={statusOptions('franchisee')} placeholder={t('common.all')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        <Select label={t('franchisees.filterType')} options={dictOptions(PARTNER_TIERS)} placeholder={t('common.all')} value={ls.filters.tier} onChange={(e) => ls.setFilter('tier', e.target.value)} />
        <Select label={t('common.region')} options={dictOptions(REGIONS)} placeholder={t('common.all')} value={ls.filters.region} onChange={(e) => ls.setFilter('region', e.target.value)} />
        <Select label={t('franchisees.form.curator')} options={[{ value: 'me', label: t('franchisees.onlyMine') }]} placeholder={t('common.all')} value={ls.filters.curator} onChange={(e) => ls.setFilter('curator', e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/franchisees/${r.id}`)}
          ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('franchisees.emptyTitle')} emptyText={t('franchisees.emptyText')}
          columns={[
            { key: 'n', header: t('franchisees.colPartner'), sortKey: 'name', render: (r) => <div><strong>{r.name}</strong><div className="muted" style={{ fontSize: 12 }}>{r.city}{r.partner_code ? ` · ${r.partner_code}` : ''}</div></div> },
            { key: 's', header: t('common.status'), render: (r) => <span className="row" style={{ gap: 6 }}><StatusChip kind="franchisee" status={r.status} small />{r.status === 'franchisee' && <TierBadge tier={r.tier} />}</span> },
            { key: 'c', header: t('common.responsible'), render: (r) => r.responsible_name ?? r.curator_name ?? '—' },
            { key: 'p', header: t('franchisees.colSpheres'), render: (r) => (r.products?.length ? <span className="row" style={{ gap: 4 }}>{r.products.map((p) => <Badge key={p} small>{label(p)}</Badge>)}</span> : '—') },
            { key: 'cl', header: t('franchisees.colClients'), align: 'right', render: (r) => r.clients_count ?? 0 },
            { key: 'b', header: t('franchisees.debt'), align: 'right', render: (r) => (r.balance != null ? <Money value={r.balance} /> : '—') },
            { key: 'o', header: t('franchisees.colOverdue'), align: 'right', render: (r) => (toNum(r.overdue_amount) > 0 ? <Badge tone="error" small>{formatMoney(r.overdue_amount)}</Badge> : '—') },
            { key: 'r', header: t('franchisees.colRating'), align: 'right', render: (r) => (r.rating != null ? <Badge tone={ratingTone(r.rating)} small>{r.rating}</Badge> : '—') },
          ]}
        />
      </Card>
      {creating && <FranchiseeForm onClose={() => setCreating(false)} />}
    </div>
  )
}
