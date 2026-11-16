import { useState } from 'react'
import { CalendarClock, Plus, Star } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { EquipmentSale, ImplementerAccrual, Installation, InstallationComment, TechnicalChannel } from '../../api/types'
import { Badge, Button, Card, DataTable, Dl, ErrorAlert, FormModal, Input, Modal, Money, PageHeader, Select, Tabs, Textarea } from '../../components/ui'
import { useForm } from '../../lib/useForm'
import { t, useT } from '../../i18n'
import { useUser } from '../../app/hooks'
import { BranchSelect, ClientSelect, NbsUserSelect, ProductSelect, toId } from '../common/pickers'
import type { Tone } from '../../lib/status'
import { formatDate, formatDateTime, toISODate } from '../../lib/format'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useListState } from '../../lib/useListState'
import { canRead } from '../../lib/permissions'

const I = 'installations.'
const COLUMNS: { status: string; label: string; tone: Tone }[] = [
  { status: 'assigned', get label() { return t(I + 'st.assigned') }, tone: 'info' }, { status: 'in_progress', get label() { return t(I + 'st.in_progress') }, tone: 'warning' },
  { status: 'training', get label() { return t(I + 'st.training') }, tone: 'info' }, { status: 'awaiting_act', get label() { return t(I + 'st.awaiting_act') }, tone: 'warning' },
  { status: 'done', get label() { return t(I + 'st.done') }, tone: 'success' }, { status: 'cancelled', get label() { return t(I + 'st.cancelled') }, tone: 'neutral' },
]
const CHANNELS: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', get api_telephony() { return t(I + 'ch.api_telephony') } }
const CH_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { get label() { return t(I + 'chs.pending') }, tone: 'warning' }, connected: { get label() { return t(I + 'chs.connected') }, tone: 'success' }, failed: { get label() { return t(I + 'chs.failed') }, tone: 'error' },
}
const TRAINING: Record<string, string> = { get passed() { return t(I + 'training.passed') }, get needs_repeat() { return t(I + 'training.needs_repeat') } }
const ACC: Record<string, { label: string; tone: Tone }> = {
  accrued: { get label() { return t(I + 'acc.accrued') }, tone: 'info' }, verified: { get label() { return t(I + 'acc.verified') }, tone: 'info' }, paid: { get label() { return t(I + 'acc.paid') }, tone: 'success' },
}

/** Допустимые переходы статуса (backend clients/installations.py NEXT). */
const NEXT: Record<string, string[]> = {
  assigned: ['in_progress', 'cancelled'], in_progress: ['training', 'awaiting_act', 'cancelled'],
  training: ['in_progress', 'awaiting_act', 'cancelled'], awaiting_act: ['training', 'done', 'cancelled'], done: [], cancelled: [],
}
const statusLabel = (s: string) => COLUMNS.find((c) => c.status === s)?.label ?? s

function Channels({ inst, canEdit }: { inst: Installation; canEdit: boolean }) {
  const t = useT()
  const { act } = useAct()
  const list = inst.technical_channels ?? []
  if (!list.length) return null
  const set = (ch: TechnicalChannel, status: string) => act(`installations/${inst.id}/channels/`, { channel: ch.channel, status }, t(I + 'channelUpdated'))
  return (
    <div className="stack" style={{ gap: 8 }}>
      <strong>{t(I + 'channelsTitle')}{inst.technical_status && inst.technical_status !== 'n/a' ? ` · ${CH_STATUS[inst.technical_status]?.label ?? inst.technical_status}` : ''}</strong>
      {list.map((c) => (
        <div key={c.channel} className="row row--between">
          <span>{CHANNELS[c.channel] ?? c.channel}</span>
          {canEdit ? <Select aria-label={CHANNELS[c.channel] ?? c.channel} options={Object.entries(CH_STATUS).map(([value, v]) => ({ value, label: v.label }))} value={c.status} onChange={(e) => void set(c, e.target.value)} />
            : <Badge small tone={CH_STATUS[c.status]?.tone}>{CH_STATUS[c.status]?.label ?? c.status}</Badge>}
        </div>
      ))}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t(I + 'channelsNote')}</p>
    </div>
  )
}

function Comments({ id }: { id: number }) {
  const t = useT()
  const { act, busy } = useAct()
  const q = useOne<InstallationComment[] | { results: InstallationComment[] }>(`installations/${id}/comments/`)
  const [text, setText] = useState('')
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? []
  return (
    <div className="stack" style={{ gap: 8 }}>
      <strong>{t(I + 'commentsTitle')}</strong>
      <ErrorAlert error={q.error} />
      <ul className="list">
        {rows.length === 0 && <li className="muted">{t(I + 'noComments')}</li>}
        {rows.map((c) => <li key={c.id} className="list__item" style={{ alignItems: 'flex-start' }}><span>{c.text}</span><span className="muted nowrap" style={{ fontSize: 12 }}>{c.author_name} · {formatDateTime(c.created_at)}</span></li>)}
      </ul>
      <Textarea label={t(I + 'newComment')} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      <div><Button size="sm" loading={busy} onClick={async () => { if (text.trim() && await act(`installations/${id}/comments/`, { text: text.trim() }, t(I + 'commentAdded'))) setText('') }}>{t('common.add')}</Button></div>
    </div>
  )
}

function ActForm({ id, onClose }: { id: number; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ client_confirmed_by: '', act_file: '' })
  const submit = async () => {
    if (!f.v.client_confirmed_by.trim()) return f.fail({ data: { client_confirmed_by: [t(I + 'actWhoRequired')] } })
    const r = await act(`installations/${id}/act/`, { client_confirmed_by: f.v.client_confirmed_by.trim(), act_file: f.v.act_file.trim() }, t(I + 'actConfirmed'))
    if (r) onClose()
  }
  return (
    <FormModal title={t(I + 'actTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t(I + 'actBy')} value={f.v.client_confirmed_by} error={f.errors.client_confirmed_by} onChange={(e) => f.set('client_confirmed_by', e.target.value)} />
      <Input label={t(I + 'actFileLabel')} value={f.v.act_file} error={f.errors.act_file} onChange={(e) => f.set('act_file', e.target.value)} />
    </FormModal>
  )
}

function AssignForm({ inst, hq, onClose }: { inst: Installation; hq: boolean; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ implementer: inst.implementer ? String(inst.implementer) : '', deadline: inst.deadline ?? '', note: inst.note ?? '' })
  const submit = async () => {
    const r = await act(`installations/${inst.id}/`, { ...(hq ? { implementer: toId(f.v.implementer) } : {}), deadline: f.v.deadline || null, note: f.v.note }, t(I + 'updated'), 'PATCH')
    if (r) onClose()
  }
  return (
    <FormModal title={t(I + 'assignTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      {hq && <NbsUserSelect label={t(I + 'implementer')} value={f.v.implementer} error={f.errors.implementer} onChange={(v) => f.set('implementer', v)} />}
      <Input label={t(I + 'deadlineInstall')} type="date" value={f.v.deadline} error={f.errors.deadline} onChange={(e) => f.set('deadline', e.target.value)} />
      <Textarea label={t(I + 'note')} rows={2} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} />
    </FormModal>
  )
}

export function InstallationModal({ id, onClose }: { id: number; onClose: () => void }) {
  const t = useT()
  const { data: i, isLoading, error } = useOne<Installation>(`installations/${id}/`)
  const canEdit = useCan('installationsWrite')
  const canChannels = useCan('installChannels')
  const hq = useIsHq()
  const { act, busy } = useAct()
  const [actForm, setActForm] = useState(false)
  const [assign, setAssign] = useState(false)
  const toggle = (idx: number) => {
    const c = i?.checklist?.[idx]
    return c && act(`installations/${id}/checklist/`, { items: [{ item: c.item, done: !c.done }] })
  }
  const setStatus = (status: string) => act(`installations/${id}/status/`, { status }, t(I + 'statusToast', { status: statusLabel(status) }))
  const done = (i?.checklist ?? []).filter((c) => c.done).length
  return (
    <Modal open wide title={i ? t(I + 'titleClient', { client: i.client_name ?? '' }) : t(I + 'title')} onClose={onClose}>
      <ErrorAlert error={error} />
      {isLoading && <span className="skeleton" style={{ height: 120 }} />}
      {i && (
        <div className="stack">
          <Dl items={[
            [t(I + 'product'), i.product_name], [t(I + 'partner'), i.franchisee_name], [t(I + 'implementer'), i.implementer_name ?? t(I + 'notAssigned')],
            [t(I + 'deadline'), <span className="row" style={{ gap: 6 }}>{formatDate(i.deadline)}{i.overdue && <Badge small tone="error">{t(I + 'overdue')}</Badge>}</span>],
            [t('common.status'), statusLabel(i.status)],
            [t(I + 'implAccrual'), i.implementer_accrual ? <span><Money value={i.implementer_accrual.amount} /> · {ACC[i.implementer_accrual.status]?.label ?? i.implementer_accrual.status}</span> : t(I + 'notAccrued')],
          ]} />
          {canEdit && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {(NEXT[i.status] ?? []).map((s) => <Button key={s} size="sm" variant={s === 'cancelled' ? 'danger' : 'secondary'} loading={busy} onClick={() => setStatus(s)}>{s === 'cancelled' ? t(I + 'cancelInstall') : `→ ${statusLabel(s)}`}</Button>)}
              <Button size="sm" variant="secondary" onClick={() => setAssign(true)}>{t(I + 'assignTitle')}</Button>
            </div>
          )}
          <div className="stack" style={{ gap: 8 }}>
            <strong>{i.checklist?.length ? t(I + 'checklistProgress', { done, total: i.checklist.length }) : t(I + 'checklist')}</strong>
            {(i.checklist ?? []).length === 0 && <span className="muted">{t(I + 'checklistEmpty')}</span>}
            {(i.checklist ?? []).map((c, k) => (
              <label key={k} className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={c.done} disabled={!canEdit || busy} onChange={() => void toggle(k)} />
                <span style={c.done ? { textDecoration: 'line-through' } : undefined}>{c.item}</span>
                {c.done_at && <span className="muted" style={{ fontSize: 12 }}>{formatDateTime(c.done_at)}</span>}
              </label>
            ))}
          </div>
          <Channels inst={i} canEdit={canChannels} />
          <div className="form-grid">
            <Select label={t(I + 'trainingResult')} placeholder={t(I + 'notMarked')} options={Object.entries(TRAINING).map(([value, label]) => ({ value, label }))} value={i.training_result ?? ''} disabled={!canEdit}
              onChange={(e) => e.target.value && void act(`installations/${id}/training-result/`, { result: e.target.value }, t(I + 'trainingSaved'))} />
            <Select label={t(I + 'clientRating')} placeholder={t(I + 'noRating')} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: '★'.repeat(n) }))} value={i.client_rating ?? ''} disabled={!canEdit}
              onChange={(e) => e.target.value && void act(`installations/${id}/rate/`, { rating: Number(e.target.value) }, t(I + 'ratingSaved'))} />
          </div>
          <div className="row" style={{ gap: 12 }}>
            {i.act_confirmed_at
              ? <Badge tone="success">{i.client_confirmed_by ? t(I + 'actConfirmedAtBy', { date: formatDateTime(i.act_confirmed_at), by: i.client_confirmed_by }) : t(I + 'actConfirmedAt', { date: formatDateTime(i.act_confirmed_at) })}</Badge>
              : <Badge tone="warning">{t(I + 'actNotConfirmed')}</Badge>}
            {i.act_file && <a href={i.act_file} target="_blank" rel="noreferrer">{t(I + 'actFile')}</a>}
            {canEdit && !i.act_confirmed_at && i.status !== 'cancelled' && <Button size="sm" onClick={() => setActForm(true)}>{t(I + 'confirmAct')}</Button>}
          </div>
          <Comments id={id} />
        </div>
      )}
      {actForm && <ActForm id={id} onClose={() => setActForm(false)} />}
      {assign && i && <AssignForm inst={i} hq={hq} onClose={() => setAssign(false)} />}
    </Modal>
  )
}

function InstallationForm({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const hq = useIsHq()
  const f = useForm({ client: '', product: '', branch: '', implementer: '', started_at: toISODate(new Date()), deadline: '' })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.client) e.client = [t(I + 'pickClient')]
    if (!f.v.product) e.product = [t(I + 'pickProduct')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act('installations/', {
      client: toId(f.v.client), product: toId(f.v.product), branch: toId(f.v.branch), started_at: f.v.started_at, deadline: f.v.deadline || undefined,
      ...(hq ? { implementer: toId(f.v.implementer) } : {}),
    }, t(I + 'created'))
    if (r) onClose()
  }
  return (
    <FormModal title={t(I + 'newTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <ClientSelect value={f.v.client} onChange={(v) => f.set('client', v)} error={f.errors.client} />
      <ProductSelect value={f.v.product} onChange={(v) => f.set('product', v)} error={f.errors.product} />
      <BranchSelect value={f.v.branch} onChange={(v) => f.set('branch', v)} error={f.errors.branch} />
      {hq && <NbsUserSelect label={t(I + 'implementer')} value={f.v.implementer} onChange={(v) => f.set('implementer', v)} error={f.errors.implementer} />}
      <div className="form-grid">
        <Input label={t(I + 'startDate')} type="date" value={f.v.started_at} error={f.errors.started_at} onChange={(e) => f.set('started_at', e.target.value)} />
        <Input label={t(I + 'deadline')} type="date" value={f.v.deadline} error={f.errors.deadline} onChange={(e) => f.set('deadline', e.target.value)} hint={t(I + 'deadlineHint')} />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t(I + 'autoNote')}</p>
    </FormModal>
  )
}

function Kanban() {
  const t = useT()
  const canCreate = useCan('installCreate')
  const [form, setForm] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const { rows, isLoading, error } = useList<Installation>('installations/', { page_size: 200, ordering: 'deadline' })
  return (
    <div className="stack">
      {canCreate && <div><Button icon={Plus} onClick={() => setForm(true)}>{t(I + 'newBtn')}</Button></div>}
      <ErrorAlert error={error} />
      {isLoading && <span className="skeleton" style={{ height: 160 }} />}
      <div className="kanban">
        {COLUMNS.map((col) => {
          const items = (rows ?? []).filter((r) => r.status === col.status)
          return (
            <section key={col.status} className="kanban__col" aria-label={col.label}>
              <header className="row row--between"><strong>{col.label}</strong><Badge small tone={col.tone}>{items.length}</Badge></header>
              {items.map((r) => {
                const total = r.checklist?.length ?? 0
                const done = (r.checklist ?? []).filter((c) => c.done).length
                return (
                  <button key={r.id} type="button" className="kcard" style={{ textAlign: 'left' }} onClick={() => setOpen(r.id)}>
                    <strong>{r.client_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{r.product_name}</div>
                    <div className="row" style={{ gap: 8, fontSize: 12 }}>
                      <span className="row" style={{ gap: 4 }}><CalendarClock size={14} aria-hidden />{formatDate(r.deadline)}</span>
                      {r.overdue && <Badge small tone="error">{t(I + 'overdue')}</Badge>}
                      {total > 0 && <span>{done}/{total}</span>}
                      {r.client_rating ? <span className="row" style={{ gap: 2 }}><Star size={12} aria-hidden />{r.client_rating}</span> : null}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.implementer_name ?? t(I + 'noImplementer')}</div>
                  </button>
                )
              })}
              {!isLoading && items.length === 0 && <p className="muted" style={{ fontSize: 13 }}>{t(I + 'empty')}</p>}
            </section>
          )
        })}
      </div>
      {open != null && <InstallationModal id={open} onClose={() => setOpen(null)} />}
      {form && <InstallationForm onClose={() => setForm(false)} />}
    </div>
  )
}

function ChannelsTab() {
  const t = useT()
  const [open, setOpen] = useState<number | null>(null)
  const { rows, isLoading, error } = useList<Installation>('installations/', { page_size: 200, product: 'onai' })
  return (
    <div className="stack">
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r.id)} emptyTitle={t(I + 'onaiEmptyTitle')} emptyText={t(I + 'onaiEmptyText')}
          columns={[
            { key: 'c', header: t(I + 'client'), render: (r) => <strong>{r.client_name}</strong> },
            ...['whatsapp', 'instagram', 'facebook', 'api_telephony'].map((ch) => ({
              key: ch, header: CHANNELS[ch], render: (r: Installation) => { const c = (r.technical_channels ?? []).find((x) => x.channel === ch); return c ? <Badge small tone={CH_STATUS[c.status]?.tone}>{CH_STATUS[c.status]?.label ?? c.status}</Badge> : <span className="muted">—</span> },
            })),
            { key: 'a', header: t(I + 'act'), render: (r) => (r.act_confirmed_at ? <Badge small tone="success">{t(I + 'actYes')}</Badge> : <Badge small tone="warning">{t('common.no')}</Badge>) },
          ]} />
      </Card>
      {open != null && <InstallationModal id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}


function ImplPayModal({ accrual, onClose }: { accrual: ImplementerAccrual; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const [ref, setRef] = useState('')
  return (
    <FormModal title={t(I + 'payTitle', { name: accrual.user_name ?? '' })} onClose={onClose} saving={busy} submitLabel={t(I + 'payBtn')}
      onSubmit={async () => { if (await act(`implementer-accruals/${accrual.id}/pay/`, { payment_ref: ref.trim() }, t(I + 'paidToast'))) onClose() }}>
      <p style={{ margin: 0 }}>{t(I + 'amountLabel')} <strong><Money value={accrual.amount} /></strong></p>
      <Input label={t(I + 'payRef')} value={ref} onChange={(e) => setRef(e.target.value)} />
    </FormModal>
  )
}

export function AccrualsTab() {
  const t = useT()
  const user = useUser()
  const canVerify = useCan('implementerAccruals')
  const canPay = useCan('implementerPay')
  const { act } = useAct()
  const ls = useListState({ status: '' }, '-id')
  const { rows, data, isLoading, error } = useList<ImplementerAccrual>('implementer-accruals/', ls.params)
  const [pay, setPay] = useState<ImplementerAccrual | null>(null)
  return (
    <div className="stack">
      <div className="filters"><Select label={t('common.status')} placeholder={t('common.all')} options={Object.entries(ACC).map(([value, v]) => ({ value, label: v.label }))} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} /></div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} page={ls.page} total={data?.count} onPage={ls.setPage} emptyTitle={t(I + 'accEmptyTitle')} emptyText={t(I + 'accEmptyText')}
          columns={[
            { key: 'd', header: t('common.date'), render: (r) => formatDate(r.created_at) },
            { key: 'u', header: t(I + 'implementer'), render: (r) => r.user_name ?? `№ ${r.user}` },
            { key: 'c', header: t(I + 'client'), render: (r) => <div>{r.client_name ?? t(I + 'installationNo', { n: r.installation })}<div className="muted" style={{ fontSize: 12 }}>{r.product_code}{r.sold_amount ? ` · ${t(I + 'soldOn', { amount: r.sold_amount })}` : ''}</div></div> },
            { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.amount} /> },
            { key: 's', header: t('common.status'), render: (r) => <div><Badge small tone={ACC[r.status]?.tone}>{ACC[r.status]?.label ?? r.status}</Badge>{r.paid_at && <div className="muted" style={{ fontSize: 12 }}>{formatDate(r.paid_at)} {r.payment_ref}</div>}</div> },
            ...(canVerify || canPay ? [{ key: 'x', header: '', render: (r: ImplementerAccrual) => (
              <div className="kcard__actions">
                {canVerify && r.status === 'accrued' && <Button size="sm" onClick={() => act(`implementer-accruals/${r.id}/verify/`, undefined, t(I + 'verifiedToast'))}>{t(I + 'verify')}</Button>}
                {canPay && r.status === 'verified' && (r.verified_by === user?.id
                  ? <span className="muted" style={{ fontSize: 12 }}>{t(I + 'selfChecked')}</span>
                  : <Button size="sm" variant="dark" onClick={() => setPay(r)}>{t(I + 'payOut')}</Button>)}
              </div>) }] : []),
          ]} />
      </Card>
      {pay && <ImplPayModal accrual={pay} onClose={() => setPay(null)} />}
    </div>
  )
}

const DELIVERY: Record<string, { label: string; tone: Tone }> = {
  ordered: { get label() { return t(I + 'delivery.ordered') }, tone: 'neutral' }, in_stock: { get label() { return t(I + 'delivery.in_stock') }, tone: 'info' },
  delivered: { get label() { return t(I + 'delivery.delivered') }, tone: 'warning' }, installed: { get label() { return t(I + 'delivery.installed') }, tone: 'success' },
}

function EquipmentForm({ item, onClose }: { item: EquipmentSale; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const qty = Number(item.quantity) || 1
  const f = useForm({ delivery_status: item.delivery_status ?? '', serials: (item.serial_numbers ?? []).join('\n') })
  const submit = async () => {
    const serials = f.v.serials.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean)
    if (serials.length > qty) return f.fail({ data: { serial_numbers: [t(I + 'serialTooMany', { qty })] } })
    const r = await act(`equipment-sales/${item.id}/`, { delivery_status: f.v.delivery_status, serial_numbers: serials }, t('common.saved'), 'PATCH')
    if (r) onClose()
  }
  return (
    <FormModal title={`${item.equipment_name ?? t(I + 'equipment')} · ${item.client_name ?? ''}`} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Select label={t(I + 'delivery')} placeholder={t(I + 'notSpecifiedF')} options={Object.entries(DELIVERY).map(([value, v]) => ({ value, label: v.label }))} value={f.v.delivery_status} error={f.errors.delivery_status} onChange={(e) => f.set('delivery_status', e.target.value)} />
      <Textarea label={t(I + 'serials', { qty })} rows={3} hint={t(I + 'serialsHint')} value={f.v.serials} error={f.errors.serial_numbers} onChange={(e) => f.set('serials', e.target.value)} />
    </FormModal>
  )
}

function EquipmentTab() {
  const t = useT()
  const canEdit = useCan('equipmentEdit')
  const ls = useListState({ delivery_status: '' }, '-id')
  const { rows, data, isLoading, error } = useList<EquipmentSale>('equipment-sales/', ls.params)
  const [edit, setEdit] = useState<EquipmentSale | null>(null)
  return (
    <div className="stack">
      <div className="filters"><Select label={t(I + 'delivery')} placeholder={t('common.all')} options={Object.entries(DELIVERY).map(([value, v]) => ({ value, label: v.label }))} value={ls.filters.delivery_status} onChange={(e) => ls.setFilter('delivery_status', e.target.value)} /></div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={canEdit ? setEdit : undefined} page={ls.page} total={data?.count} onPage={ls.setPage} emptyTitle={t(I + 'eqEmptyTitle')} emptyText={t(I + 'eqEmptyText')}
          columns={[
            { key: 'c', header: t(I + 'client'), render: (r) => <strong>{r.client_name}</strong> },
            { key: 'e', header: t(I + 'equipment'), render: (r) => `${r.equipment_name ?? `№ ${r.equipment}`}${r.quantity ? ` × ${r.quantity}` : ''}` },
            { key: 'sn', header: t(I + 'serialsCol'), render: (r) => ((r.serial_numbers ?? []).length ? (r.serial_numbers ?? []).join(', ') : <span className="muted">{t(I + 'notSpecified')}</span>) },
            { key: 'd', header: t(I + 'delivery'), render: (r) => (r.delivery_status ? <Badge small tone={DELIVERY[r.delivery_status]?.tone}>{DELIVERY[r.delivery_status]?.label ?? r.delivery_status}</Badge> : '—') },
            { key: 'w', header: t(I + 'warrantyUntil'), render: (r) => formatDate(r.warranty_until) },
            { key: 'i', header: t(I + 'installedBy'), render: (r) => r.installed_by_name ?? '—' },
          ]} />
      </Card>
      {edit && <EquipmentForm item={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

type Tab = 'kanban' | 'channels' | 'accruals' | 'equipment'

export default function InstallationsPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('kanban')
  const accr = canRead('implementer_accruals')
  return (
    <div className="page">
      <PageHeader eyebrow={t(I + 'eyebrow')} title={t(I + 'pageTitle')} />
      <Tabs<Tab> tabs={[
        { value: 'kanban', label: t(I + 'tab.kanban') }, { value: 'channels', label: t(I + 'tab.channels') },
        ...(accr ? [{ value: 'accruals' as Tab, label: t(I + 'tab.accruals') }] : []), { value: 'equipment', label: t(I + 'tab.equipment') },
      ]} value={tab} onChange={setTab} />
      {tab === 'kanban' && <Kanban />}
      {tab === 'channels' && <ChannelsTab />}
      {tab === 'accruals' && <AccrualsTab />}
      {tab === 'equipment' && <EquipmentTab />}
    </div>
  )
}
