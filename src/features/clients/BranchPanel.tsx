import { useState } from 'react'
import { Clock, Landmark, Plus } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { AssignmentHistory, Branch, ClientContact } from '../../api/types'
import { useUser } from '../../app/hooks'
import { Badge, Button, Card, CardTitle, DataTable, Dl, ErrorAlert, FormModal, Input, Modal, Select, StatusChip, Textarea } from '../../components/ui'
import { formatDate, formatDateTime, formatPhone, toISODate } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { t, useT } from '../../i18n'
import { BRANCH_REASONS, BRANCH_STATUS, SUB_STATUS_TONE, dictOptions } from '../../lib/status'
import { FranchiseeSelect, ProductSelect, toId, useProductLabel } from '../common/pickers'
import { NameOf } from '../common/shared'
import { useAct, useCan } from '../common/useAct'

const FIELD_LABEL: Record<string, string> = {
  get service() { return t('clients.field.service') }, get implementer() { return t('clients.field.implementer') }, get responsible() { return t('common.responsible') }, get seller() { return t('clients.field.seller') },
}

export function BranchStatusBadge({ status }: { status: string }) {
  const s = BRANCH_STATUS[status]
  return <Badge small tone={s?.tone ?? 'neutral'}>{s?.label ?? status}</Badge>
}

function hoursLeft(deadline: string | null, backend?: number | null): string {
  if (backend != null) return backend <= 0 ? t('clients.expiredShort') : t('clients.hoursLeftReply', { n: backend })
  if (!deadline) return ''
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return t('clients.expiredShort')
  const h = Math.floor(ms / 3600000)
  return h >= 48 ? t('clients.daysLeft', { n: Math.floor(h / 24) }) : t('clients.hoursLeft', { n: h })
}

/** Правило второго филиала: у партнёра первого филиала есть срок, чтобы принять; иначе назначает OZOK. */
export function PriorityBanner({ branch, onReassign }: { branch: Branch; onReassign?: () => void }) {
  const t = useT()
  const user = useUser()
  const { act, busy } = useAct()
  const canReassign = useCan('branchReassign')
  const canAccept = useCan('branchAccept')
  const waiting = !!branch.priority_partner && !branch.priority_accepted_at && !branch.implementer_partner
  if (!waiting) return null
  const mine = !!user?.franchisee && user.franchisee.id === branch.priority_partner
  const expired = branch.priority_expired
  return (
    <div className={`alert ${expired ? 'alert--error' : 'alert--warning'}`} role="status" style={{ alignItems: 'flex-start' }}>
      <Clock size={18} aria-hidden />
      <div className="stack" style={{ gap: 6, flex: 1 }}>
        <strong>{branch.client_name ? t('clients.secondBranchClient', { name: branch.name, client: branch.client_name }) : t('clients.secondBranch', { name: branch.name })}</strong>
        <span>
          {t('clients.priorityIntro')} {branch.priority_partner ? <NameOf path="franchisees/" id={branch.priority_partner} /> : '—'}.
          {' '}{t('clients.acceptBefore')} <strong>{formatDateTime(branch.priority_deadline)}</strong> ({hoursLeft(branch.priority_deadline, branch.priority_hours_left)}).
          {expired && ` ${t('clients.priorityExpired')}`}
        </span>
        <div className="row" style={{ gap: 8 }}>
          {mine && canAccept && !expired && <Button size="sm" loading={busy} onClick={() => act(`branches/${branch.id}/accept/`, undefined, t('clients.accepted'))}>{t('clients.accept')}</Button>}
          {canReassign && <Button size="sm" variant="secondary" onClick={onReassign}>{t('clients.reassign')}</Button>}
        </div>
      </div>
    </div>
  )
}

export function ReassignModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ partner: '', reason_code: 'no_response', reason: '', effective_from: toISODate(new Date()) })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.partner) e.partner = [t('clients.pickPartner')]
    if (!f.v.reason.trim()) e.reason = [t('clients.describeBasis')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act(`branches/${branch.id}/reassign/`, { partner: Number(f.v.partner), reason_code: f.v.reason_code, reason: f.v.reason.trim(), effective_from: f.v.effective_from }, t('clients.reassigned'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('clients.reassignTitle', { name: branch.name })} onClose={onClose} onSubmit={submit} saving={busy} error={f.general} submitLabel={t('clients.reassign')}>
      <FranchiseeSelect label={t('clients.newPartner')} value={f.v.partner} error={f.errors.partner} onChange={(v) => f.set('partner', v)} onlyActive />
      <Select label={t('clients.basis')} options={dictOptions(Object.fromEntries(Object.entries(BRANCH_REASONS).filter(([k]) => !['accepted', 'partner_closed'].includes(k))))} value={f.v.reason_code} onChange={(e) => f.set('reason_code', e.target.value)} />
      <Textarea label={t('common.comment')} value={f.v.reason} error={f.errors.reason} onChange={(e) => f.set('reason', e.target.value)} />
      <Input label={t('clients.effectiveFrom')} type="date" value={f.v.effective_from} onChange={(e) => f.set('effective_from', e.target.value)} hint={t('clients.effectiveHint')} />
    </FormModal>
  )
}

/** Только владелец (branches.commission_switch): комиссия сопровождающему партнёру по филиалу клиента OZOK. */
function LegacyCommission({ branch }: { branch: Branch }) {
  const t = useT()
  const can = useCan('legacyCommission')
  const { act, busy } = useAct()
  const client = useOne<{ origin?: string }>(`clients/${branch.client}/`)
  const [date, setDate] = useState(branch.commission_enabled_from ?? toISODate(new Date()))
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  if (client.data?.origin !== 'ozok_legacy' && client.data?.origin !== 'ozok_direct') return null
  const on = !!branch.commission_enabled
  const toggle = async () => {
    if (!reason.trim()) return setErr(t('clients.reasonRequired'))
    setErr('')
    if (await act(`branches/${branch.id}/commission-switch/`, { enabled: !on, effective_from: date || undefined, reason: reason.trim() }, on ? t('clients.commOff') : t('clients.commOn'))) setReason('')
  }
  return (
    <div className="hint-box stack" style={{ gap: 8 }}>
      <strong>{t('clients.commTitle')}</strong>
      <span className="muted" style={{ fontSize: 13 }}>{t('clients.commNote')}</span>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Badge tone={on ? 'success' : 'neutral'}>{on ? t('clients.commOnFrom', { date: formatDate(branch.commission_enabled_from) }) : t('clients.commNot')}</Badge>
        {can && (
          <>
            <Input label={t('clients.fromDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label={t('common.reason')} value={reason} error={err} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" loading={busy} onClick={() => void toggle()}>{on ? t('clients.commDisable') : t('clients.commEnable')}</Button>
          </>
        )}
      </div>
    </div>
  )
}

function ElqrForm({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const [v, setV] = useState(branch.elqr_account ?? '')
  return (
    <FormModal title={t('clients.elqrTitle')} onClose={onClose} saving={busy} onSubmit={async () => { if (await act(`branches/${branch.id}/elqr-account/`, { elqr_account: v.trim() }, t('clients.elqrLinked'))) onClose() }}>
      <Input label={t('clients.elqrNumber')} value={v} onChange={(e) => setV(e.target.value)} hint={t('clients.elqrHint')} />
    </FormModal>
  )
}

export function AssignmentTable({ rows, loading, withBranch }: { rows?: AssignmentHistory[]; loading?: boolean; withBranch?: boolean }) {
  const t = useT()
  return (
    <DataTable loading={loading} rows={rows} rowKey={(r) => r.id} emptyTitle={t('clients.asg.emptyTitle')} emptyText=" "
      columns={[
        { key: 'd', header: t('clients.effectiveFrom'), render: (r) => formatDate(r.effective_from) },
        ...(withBranch ? [{ key: 'b', header: t('clients.asg.clientBranch'), render: (r: AssignmentHistory) => <div><strong>{r.client_name}</strong><div className="muted" style={{ fontSize: 12 }}>{r.branch_name}</div></div> }] : []),
        { key: 'f', header: t('clients.asg.what'), render: (r) => FIELD_LABEL[r.field] ?? r.field },
        { key: 'a', header: t('clients.asg.fromTo'), render: (r) => `${r.from_partner_name ?? '—'} → ${r.to_partner_name ?? '—'}` },
        { key: 'c', header: t('clients.basis'), render: (r) => <div>{BRANCH_REASONS[r.reason_code] ?? r.reason_code}{r.reason && <div className="muted" style={{ fontSize: 12 }}>{r.reason}</div>}</div> },
        { key: 'u', header: t('clients.asg.decidedBy'), render: (r) => r.decided_by_name ?? '—' },
      ]} />
  )
}

/** Карточка филиала: подписка, лицевой счёт Элкюар, продавец / внедренец / ответственный, история закрепления. */
export function BranchModal({ id, onClose }: { id: number; onClose: () => void }) {
  const t = useT()
  const { data: b, isLoading, error } = useOne<Branch>(`branches/${id}/`)
  const canElqr = useCan('branchElqr')
  const prodLabel = useProductLabel()
  const [reassign, setReassign] = useState(false)
  const [elqr, setElqr] = useState(false)
  const [edit, setEdit] = useState(false)
  const canEdit = useCan('branchesWrite')
  return (
    <Modal open title={b ? t('clients.branchTitle', { name: b.name }) : t('clients.branch')} onClose={onClose} wide>
      <ErrorAlert error={error} />
      {isLoading && <span className="skeleton" style={{ height: 120 }} />}
      {b && (
        <div className="stack">
          <div className="row" style={{ gap: 8 }}><BranchStatusBadge status={b.status} />{b.is_main && <Badge small>{t('clients.main')}</Badge>}<span className="muted">{b.client_name}</span></div>
          <PriorityBanner branch={b} onReassign={() => setReassign(true)} />
          {canEdit && <div><Button size="sm" variant="secondary" onClick={() => setEdit(true)}>{t('clients.editBranch')}</Button></div>}
          <Dl items={[
            [t('clients.address'), [b.city, b.address].filter(Boolean).join(', ')], [t('common.region'), b.region], [t('clients.product'), b.product_code ? prodLabel(b.product_code) : '—'],
            [t('clients.launch'), formatDate(b.launch_date)],
            [t('clients.elqrTitle'), <span className="row" style={{ gap: 8 }}>{b.elqr_account ?? <span className="muted">{t('clients.notLinked')}</span>}{canElqr && <Button size="sm" variant="ghost" icon={Landmark} onClick={() => setElqr(true)}>{b.elqr_account ? t('common.edit') : t('clients.link')}</Button>}</span>],
            [t('clients.field.seller'), b.seller_partner ? <NameOf path="franchisees/" id={b.seller_partner} /> : null],
            [t('clients.implementer'), b.implementer_partner ? <NameOf path="franchisees/" id={b.implementer_partner} /> : (b.implementer_partner_name ?? <span className="muted">{t('clients.notAssigned')}</span>)],
            [t('common.responsible'), b.responsible_partner ? <NameOf path="franchisees/" id={b.responsible_partner} /> : <span className="muted">{t('clients.notAssigned')}</span>],
            [t('clients.support'), b.support_user ? <NameOf path="users/" id={b.support_user} field="full_name" /> : null],
            [t('clients.leadSource'), b.lead_source],
          ]} />
          <LegacyCommission branch={b} />
          <h3 style={{ margin: 0 }}>{t('clients.subsTitle')}</h3>
          <DataTable rows={b.subscriptions} rowKey={(s) => s.id} emptyTitle={t('clients.subs.emptyTitle')} emptyText={t('clients.subs.emptyText')}
            columns={[
              { key: 'p', header: t('clients.product'), render: (s) => <strong>{s.product_name}</strong> },
              { key: 'e', header: t('clients.externalId'), render: (s) => <span className="muted">{s.external_id || '—'}</span> },
              { key: 's', header: t('common.status'), render: (s) => <StatusChip kind="subscription" status={s.status} small /> },
              { key: 'u', header: t('clients.paidUntil'), render: (s) => formatDate(s.paid_until) },
            ]} />
          <h3 style={{ margin: 0 }}>{t('clients.assignmentHistory')}</h3>
          <AssignmentTable rows={b.assignment_history} />
        </div>
      )}
      {reassign && b && <ReassignModal branch={b} onClose={() => setReassign(false)} />}
      {elqr && b && <ElqrForm branch={b} onClose={() => setElqr(false)} />}
      {edit && b && <BranchForm client={b.client} item={b} onClose={() => setEdit(false)} />}
    </Modal>
  )
}

function BranchForm({ client, item, onClose }: { client: number; item?: Branch; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ name: item?.name ?? '', address: item?.address ?? '', city: item?.city ?? '', region: item?.region ?? '', product: item?.product ? String(item.product) : '', launch_date: item?.launch_date ?? '' })
  const submit = async () => {
    if (!f.v.name.trim()) return f.fail({ data: { name: [t('clients.branchNameRequired')] } })
    const body = { name: f.v.name.trim(), address: f.v.address.trim(), city: f.v.city.trim(), region: f.v.region.trim(), product: toId(f.v.product), launch_date: f.v.launch_date || null }
    const r = item ? await act(`branches/${item.id}/`, body, t('clients.branchSaved'), 'PATCH') : await act('branches/', { ...body, client }, t('clients.branchCreated'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('clients.branchTitle', { name: item.name }) : t('clients.newBranch')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Input label={t('common.name')} value={f.v.name} error={f.errors.name} onChange={(e) => f.set('name', e.target.value)} />
        <ProductSelect label={t('clients.product')} placeholder={t('clients.notChosen')} value={f.v.product} error={f.errors.product} onChange={(v) => f.set('product', v)} />
        <Input label={t('common.city')} value={f.v.city} error={f.errors.city} onChange={(e) => f.set('city', e.target.value)} />
        <Input label={t('common.region')} value={f.v.region} error={f.errors.region} onChange={(e) => f.set('region', e.target.value)} />
        <div className="span-2"><Input label={t('clients.address')} value={f.v.address} error={f.errors.address} onChange={(e) => f.set('address', e.target.value)} /></div>
        <Input label={t('clients.launchDate')} type="date" value={f.v.launch_date} error={f.errors.launch_date} onChange={(e) => f.set('launch_date', e.target.value)} />
      </div>
      {!item && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('clients.secondNote')}</p>}
    </FormModal>
  )
}

/** Вкладка «Филиалы» карточки клиента. */
export function BranchesTab({ client }: { client: number }) {
  const t = useT()
  const canCreate = useCan('branchesWrite')
  const [form, setForm] = useState<Branch | 'new' | null>(null)
  const { rows, isLoading, error } = useList<Branch>('branches/', { client, page_size: 100 })
  const [open, setOpen] = useState<number | null>(null)
  const [reassign, setReassign] = useState<Branch | null>(null)
  return (
    <div className="stack">
      {canCreate && <div><Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('clients.addBranch')}</Button></div>}
      <ErrorAlert error={error} />
      {(rows ?? []).map((b) => <PriorityBanner key={b.id} branch={b} onReassign={() => setReassign(b)} />)}
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(b) => b.id} onRowClick={(b) => setOpen(b.id)} emptyTitle={t('clients.br.emptyTitle')} emptyText={t('clients.br.emptyText')}
          columns={[
            { key: 'n', header: t('clients.branch'), render: (b) => <div><strong>{b.name}</strong>{b.is_main && <> <Badge small>{t('clients.main')}</Badge></>}<div className="muted" style={{ fontSize: 12 }}>{[b.city, b.address].filter(Boolean).join(', ')}</div></div> },
            { key: 's', header: t('common.status'), render: (b) => <BranchStatusBadge status={b.status} /> },
            { key: 'i', header: t('clients.implementer'), render: (b) => (b.implementer_partner ? <NameOf path="franchisees/" id={b.implementer_partner} /> : <span className="muted">{t('clients.notAssigned')}</span>) },
            { key: 'e', header: t('clients.elqr'), render: (b) => b.elqr_account ?? '—' },
            { key: 'u', header: t('clients.subsTitle'), render: (b) => (b.subscriptions ?? []).map((s) => <Badge key={s.id} small tone={SUB_STATUS_TONE[s.status] ?? 'neutral'}>{s.product_name}</Badge>) },
          ]} />
      </Card>
      {open != null && <BranchModal id={open} onClose={() => setOpen(null)} />}
      {reassign && <ReassignModal branch={reassign} onClose={() => setReassign(null)} />}
      {form && <BranchForm client={client} item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  )
}

function ContactForm({ client, item, onClose }: { client: number; item?: ClientContact; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ full_name: item?.full_name ?? '', position: item?.position ?? '', phone: item?.phone ?? '', email: item?.email ?? '', is_primary: !!item?.is_primary })
  const submit = async () => {
    if (!f.v.full_name.trim()) return f.fail({ data: { full_name: [t('clients.contactNameRequired')] } })
    const r = item
      ? await act(`client-contacts/${item.id}/`, f.v, t('clients.contactSaved'), 'PATCH')
      : await act('client-contacts/', { ...f.v, client }, t('clients.contactAdded'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('clients.contactTitle') : t('clients.newContact')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Input label={t('clients.firstName')} value={f.v.full_name} error={f.errors.full_name} onChange={(e) => f.set('full_name', e.target.value)} />
        <Input label={t('clients.position')} value={f.v.position} onChange={(e) => f.set('position', e.target.value)} />
        <Input label={t('common.phone')} value={f.v.phone} onChange={(e) => f.set('phone', e.target.value)} />
        <Input label={t('common.email')} type="email" value={f.v.email} error={f.errors.email} onChange={(e) => f.set('email', e.target.value)} />
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.v.is_primary} onChange={(e) => f.set('is_primary', e.target.checked)} /> {t('clients.primaryContact')}</label>
      </div>
    </FormModal>
  )
}

/** Вкладка «Контакты» карточки клиента. */
export function ContactsTab({ client }: { client: number }) {
  const t = useT()
  const canWrite = useCan('contactsWrite')
  const { rows, isLoading, error } = useList<ClientContact>('client-contacts/', { client, page_size: 100 })
  const [form, setForm] = useState<ClientContact | 'new' | null>(null)
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle actions={canWrite && <Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('common.add')}</Button>}>{t('clients.contactPersons')}</CardTitle></div>
      <ErrorAlert error={error} />
      <DataTable loading={isLoading} rows={rows} rowKey={(c) => c.id} onRowClick={canWrite ? (c) => setForm(c) : undefined} emptyTitle={t('clients.ct.emptyTitle')} emptyText={t('clients.ct.emptyText')}
        columns={[
          { key: 'n', header: t('clients.firstName'), render: (c) => <strong>{c.full_name}</strong> },
          { key: 'p', header: t('clients.position'), render: (c) => c.position || '—' },
          { key: 't', header: t('common.phone'), render: (c) => (c.phone ? formatPhone(c.phone) : '—') },
          { key: 'e', header: t('common.email'), render: (c) => c.email || '—' },
          { key: 'm', header: '', render: (c) => (c.is_primary ? <Badge small tone="info">{t('clients.main')}</Badge> : null) },
        ]} />
      {form && <ContactForm client={client} item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  )
}

/** Баннеры «Второй филиал» для партнёра: ожидают принятия. */
export function PriorityBranches() {
  const user = useUser()
  const fid = user?.franchisee?.id
  const { rows } = useList<Branch>('branches/', { priority_partner: fid, page_size: 50 }, { skip: !fid })
  const [reassign, setReassign] = useState<Branch | null>(null)
  const waiting = (rows ?? []).filter((b) => b.priority_partner === fid && !b.priority_accepted_at && !b.implementer_partner)
  if (!waiting.length) return null
  return (
    <div className="stack">
      {waiting.map((b) => <PriorityBanner key={b.id} branch={b} onReassign={() => setReassign(b)} />)}
      {reassign && <ReassignModal branch={reassign} onClose={() => setReassign(null)} />}
    </div>
  )
}

