import { useRef, useState } from 'react'
import { FileUp, Plus } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { ImportResult, ImportRow, Payment, Subscription, SubscriptionPeriod } from '../../api/types'
import { Badge, Button, Card, DataTable, Dl, ErrorAlert, FormModal, Input, KpiCard, Modal, PageHeader, Select, StatusChip, Tabs, Textarea } from '../../components/ui'
import { Money } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { formatDate, formatDateTime, formatMoney, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { IMPORT_ROW_STATUS, PAYMENT_STATUS, STATUS, dictOptions, statusOptions } from '../../lib/status'
import { BranchSelect, useProducts } from '../common/pickers'
import { ReasonModal } from '../common/shared'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useSend } from '../../api/hooks'
import { t, useT } from '../../i18n'

const SOURCES = Object.fromEntries(Object.entries(STATUS.paySource).map(([k, v]) => [k, v.label]))

// ---------- Подписки ----------

const PERIOD_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  paid: { get label() { return t('subscriptions.period.paid') }, tone: 'success' },
  partial: { get label() { return t('subscriptions.period.partial') }, tone: 'warning' },
  unpaid: { get label() { return t('subscriptions.period.unpaid') }, tone: 'error' },
}

function PeriodsModal({ sub, onClose }: { sub: Subscription; onClose: () => void }) {
  const t = useT()
  const q = useOne<{ periods: SubscriptionPeriod[] }>(`subscriptions/${sub.id}/periods/`)
  const { act } = useAct()
  const [closing, setClosing] = useState(false)
  const canClose = useCan('subscriptionClose') && sub.status !== 'closed'
  const periods = q.data?.periods ?? []
  return (
    <Modal open wide title={`${sub.product_name ?? t('subscriptions.subscription')} · ${sub.client_name ?? ''}`} onClose={onClose}>
      <div className="stack">
        <Dl items={[
          [t('subscriptions.branch'), sub.branch_name], [t('common.status'), <StatusChip kind="subscription" status={sub.status} small />], [t('subscriptions.paidUntil'), formatDate(sub.paid_until)],
          [t('subscriptions.tariff'), sub.tariff_name], [t('subscriptions.monthlyFee'), sub.monthly_price ? <Money value={sub.monthly_price} /> : null],
        ]} />
        <h3 style={{ margin: 0 }}>{t('subscriptions.breakdown')}</h3>
        <ErrorAlert error={q.error} />
        <DataTable loading={q.isLoading} rows={periods} rowKey={(p) => p.period} emptyTitle={t('subscriptions.noPeriods')} emptyText={t('subscriptions.noPeriodsText')}
          columns={[
            { key: 'p', header: t('common.period'), render: (p) => p.period },
            { key: 'e', header: t('subscriptions.expected'), align: 'right', render: (p) => <Money value={p.expected} /> },
            { key: 'a', header: t('subscriptions.paid'), align: 'right', render: (p) => <Money value={p.paid} /> },
            { key: 's', header: t('common.status'), render: (p) => <Badge small tone={PERIOD_STATUS[p.status]?.tone}>{PERIOD_STATUS[p.status]?.label ?? p.status}</Badge> },
          ]} />
        {canClose && <div><Button variant="danger" onClick={() => setClosing(true)}>{t('subscriptions.close')}</Button></div>}
      </div>
      {closing && <ReasonModal title={t('subscriptions.close')} submitLabel={t('common.close')} onClose={() => setClosing(false)} onSubmit={async (reason) => { const r = await act(`subscriptions/${sub.id}/close/`, { reason }, t('subscriptions.closed')); if (r) onClose(); return r }} />}
    </Modal>
  )
}

function SubscriptionsTab() {
  const t = useT()
  const hq = useIsHq()
  const products = useProducts()
  const ls = useListState({ status: '', product: '', expired: '' }, '-paid_until')
  const { rows, data, isLoading, error } = useList<Subscription>('subscriptions/', ls.params)
  const [open, setOpen] = useState<Subscription | null>(null)
  return (
    <div className="stack">
      <div className="grid grid--kpi">
        {(['active', 'grace', 'overdue', 'restricted'] as const).map((s) => (
          <SubKpi key={s} status={s} active={ls.filters.status === s} onClick={() => ls.setFilter('status', ls.filters.status === s ? '' : s)} />
        ))}
      </div>
      <div className="filters">
        <Select label={t('common.status')} placeholder={t('common.all')} options={statusOptions('subscription')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        <Select label={t('subscriptions.product')} placeholder={t('common.all')} options={products.map((p) => ({ value: p.code, label: p.name }))} value={ls.filters.product} onChange={(e) => ls.setFilter('product', e.target.value)} />
        <input className="input input--sm" type="search" placeholder={t('subscriptions.searchPh')} aria-label={t('common.search')} value={ls.search} onChange={(e) => ls.setSearch(e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(s) => s.id} onRowClick={setOpen} ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('subscriptions.noSubs')} emptyText={t('subscriptions.noSubsText')}
          columns={[
            { key: 'c', header: t('subscriptions.clientBranch'), render: (s) => <div><strong>{s.client_name}</strong><div className="muted" style={{ fontSize: 12 }}>{s.branch_name}{hq && s.franchisee_name ? ` · ${s.franchisee_name}` : ''}</div></div> },
            { key: 'p', header: t('subscriptions.product'), render: (s) => <div>{s.product_name}<div className="muted" style={{ fontSize: 12 }}>{s.tariff_name}</div></div> },
            { key: 's', header: t('common.status'), render: (s) => <StatusChip kind="subscription" status={s.status} small /> },
            { key: 'f', header: t('subscriptions.perMonth'), align: 'right', render: (s) => (s.monthly_price ? <Money value={s.monthly_price} /> : '—') },
            { key: 'u', header: t('subscriptions.paidUntil'), sortKey: 'paid_until', render: (s) => formatDate(s.paid_until) },
          ]} />
      </Card>
      {open && <PeriodsModal sub={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function SubKpi({ status, active, onClick }: { status: string; active: boolean; onClick: () => void }) {
  const q = useList<Subscription>('subscriptions/', { status, page_size: 1 })
  const s = STATUS.subscription[status]
  return (
    <button type="button" onClick={onClick} className="kpi-btn" aria-pressed={active} style={{ all: 'unset', cursor: 'pointer' }}>
      <KpiCard icon={s.icon} label={s.label} value={q.data?.count ?? '…'} />
    </button>
  )
}

// ---------- Платежи ----------

function PaymentForm({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ branch: '', amount: '', paid_at: toISODate(new Date()), months: '1', external_id: '', purpose: '' })
  const products = useProducts()
  const br = useOne<{ product_code?: string | null }>(`branches/${f.v.branch}/`, undefined, { skip: !f.v.branch })
  const src = products.find((p) => p.code === br.data?.product_code)?.payment_source
  const auto = src === 'product' || src === 'elqr'
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.branch) e.branch = [t('subscriptions.err.branch')]
    if (auto) e.branch = [t('subscriptions.autoSource')]
    if (!(toNum(f.v.amount) > 0)) e.amount = [t('subscriptions.err.amount')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act('payments/', {
      branch: Number(f.v.branch), amount: f.v.amount.replace(',', '.'), paid_at: `${f.v.paid_at}T12:00:00`, months: Number(f.v.months) || 1,
      external_id: f.v.external_id.trim(), purpose: f.v.purpose.trim(), source: 'manual',
    }, t('subscriptions.paymentAdded'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('subscriptions.manualTitle')} onClose={onClose} onSubmit={submit} saving={busy || auto} error={f.general}>
      <BranchSelect value={f.v.branch} onChange={(v) => f.set('branch', v)} error={f.errors.branch} />
      {auto && <div className="alert alert--warning" role="status">{t('subscriptions.autoSourceLong')}</div>}
      <div className="form-grid">
        <Input label={t('subscriptions.amountSom')} inputMode="decimal" value={f.v.amount} error={f.errors.amount} onChange={(e) => f.set('amount', e.target.value)} />
        <Input label={t('subscriptions.payDate')} type="date" value={f.v.paid_at} error={f.errors.paid_at} onChange={(e) => f.set('paid_at', e.target.value)} />
        <Input label={t('subscriptions.months')} type="number" min={1} value={f.v.months} error={f.errors.months} onChange={(e) => f.set('months', e.target.value)} />
        <Input label={t('subscriptions.opId')} value={f.v.external_id} error={f.errors.external_id} onChange={(e) => f.set('external_id', e.target.value)} hint={t('subscriptions.opIdHint')} />
      </div>
      <Textarea label={t('subscriptions.purpose')} rows={2} value={f.v.purpose} onChange={(e) => f.set('purpose', e.target.value)} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('subscriptions.manualNote')}</p>
    </FormModal>
  )
}

function RefundModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const left = toNum(payment.amount) - toNum(payment.refunded_amount)
  const f = useForm({ amount: String(left), external_id: '' })
  const submit = async () => {
    const n = toNum(f.v.amount)
    if (!(n > 0) || n > left) return f.fail({ data: { amount: [t('subscriptions.err.refundRange', { max: formatMoney(left) })] } })
    const r = await act(`payments/${payment.id}/refund/`, { amount: f.v.amount.replace(',', '.'), external_id: f.v.external_id.trim() }, t('subscriptions.refunded'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('subscriptions.refundTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general} submitLabel={t('subscriptions.refundSubmit')}>
      <p style={{ margin: 0 }}>{payment.client_name} · {payment.branch_name}. {t('subscriptions.refundInfo', { amount: formatMoney(payment.amount), refunded: formatMoney(payment.refunded_amount) })}</p>
      <Input label={t('subscriptions.refundAmount')} inputMode="decimal" value={f.v.amount} error={f.errors.amount} onChange={(e) => f.set('amount', e.target.value)} />
      <Input label={t('subscriptions.refundOpId')} value={f.v.external_id} onChange={(e) => f.set('external_id', e.target.value)} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('subscriptions.refundNote')}</p>
    </FormModal>
  )
}

const rowTone = (s: string) => IMPORT_ROW_STATUS[s]?.tone ?? 'neutral'

function ImportRowsTable({ rows }: { rows: ImportRow[] }) {
  const t = useT()
  return (
    <DataTable rows={rows} rowKey={(r) => `${r.line}-${r.operation_id}`} emptyTitle={t('subscriptions.noRows')} emptyText=" "
      columns={[
        { key: 'l', header: t('subscriptions.lineNo'), render: (r) => r.line },
        { key: 'd', header: t('common.date'), render: (r) => (r.date ? formatDate(r.date) : '—') },
        { key: 'a', header: t('common.amount'), align: 'right', render: (r) => (r.amount ? <Money value={r.amount} /> : '—') },
        { key: 'ac', header: t('subscriptions.account'), render: (r) => r.account || '—' },
        { key: 'o', header: t('subscriptions.opId'), render: (r) => <span className="muted">{r.operation_id || '—'}</span> },
        { key: 's', header: t('subscriptions.result'), render: (r) => <div><Badge small tone={rowTone(r.status)}>{IMPORT_ROW_STATUS[r.status]?.label ?? r.status}</Badge>{r.message && <div className="muted" style={{ fontSize: 12 }}>{r.message}</div>}</div> },
      ]} />
  )
}

/** Импорт банковской выписки: CSV → предпросмотр (сопоставлено / не найдено / дубли) → подтверждение. */
function ImportModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [send] = useSend<ImportResult>()
  const [csv, setCsv] = useState('')
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [done, setDone] = useState<ImportResult | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const pick = async (file?: File) => {
    if (!file) return
    setErr(''); setPreview(null); setDone(null)
    const text = await file.text()
    setCsv(text); setName(file.name)
    setBusy(true)
    try { setPreview(await send('payments/import/preview/', { csv: text })) } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const confirm = async () => {
    setBusy(true); setErr('')
    try { setDone(await send('payments/import/', { csv, filename: name })) } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const s = (done ?? preview)?.summary ?? {}
  const willCreate = preview?.summary.new ?? 0
  const willReconcile = preview?.summary.reconcile ?? 0
  const matched = (s.new ?? 0) + (s.reconcile ?? 0) + (s.created ?? 0) + (s.reconciled ?? 0)
  const unmatched = (s.not_found ?? 0) + (s.invalid ?? 0)
  return (
    <FormModal wide title={t('subscriptions.importTitle')} onClose={onClose} saving={busy} error={err}
      submitLabel={done ? t('common.done') : t('subscriptions.importConfirm') + (willCreate ? ` (${willCreate})` : '')}
      onSubmit={() => { if (done) onClose(); else if (preview && willCreate + willReconcile > 0) void confirm(); else setErr(t('subscriptions.noRowsToImport')) }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('subscriptions.importNote')}</p>
      <div className="row" style={{ gap: 12 }}>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <Button type="button" variant="secondary" icon={FileUp} onClick={() => input.current?.click()}>{name ? t('subscriptions.pickOther') : t('subscriptions.uploadCsv')}</Button>
        <span className="muted">{name || t('subscriptions.csvColumns')}</span>
      </div>
      {(preview || done) && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{done ? t('subscriptions.processed') : t('subscriptions.matched')}: {matched}</Badge>
            <Badge tone="error">{t('subscriptions.unmatched')}: {unmatched}</Badge>
            <Badge tone="warning">{t('subscriptions.duplicates')}: {s.duplicate ?? 0}</Badge>
            {!!s.not_authoritative && <Badge>{t('subscriptions.reconOnly')}: {s.not_authoritative}</Badge>}
          </div>
          <ImportRowsTable rows={(done ?? preview)?.rows ?? []} />
        </>
      )}
    </FormModal>
  )
}

export function PaymentsTab() {
  const t = useT()
  const canWrite = useCan('paymentsWrite')
  const canImport = useCan('paymentImport')
  const canCancel = useCan('paymentCancel')
  const canRefund = useCan('paymentRefund')
  const products = useProducts()
  const { act } = useAct()
  const ls = useListState({ source: '', status: '', product: '', reconciled: '', date_from: '', date_to: '' }, '-paid_at')
  const { rows, data, isLoading, error } = useList<Payment>('payments/', { ...ls.params, cancelled: 'all' })
  const [form, setForm] = useState(false)
  const [imp, setImp] = useState(false)
  const [cancel, setCancel] = useState<Payment | null>(null)
  const [refund, setRefund] = useState<Payment | null>(null)
  return (
    <div className="stack">
      <div className="filters">
        <Select label={t('subscriptions.source')} placeholder={t('common.all')} options={dictOptions(SOURCES)} value={ls.filters.source} onChange={(e) => ls.setFilter('source', e.target.value)} />
        <Select label={t('common.status')} placeholder={t('common.all')} options={Object.entries(PAYMENT_STATUS).map(([value, v]) => ({ value, label: v.label }))} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        <Select label={t('subscriptions.product')} placeholder={t('common.all')} options={products.map((p) => ({ value: p.code, label: p.name }))} value={ls.filters.product} onChange={(e) => ls.setFilter('product', e.target.value)} />
        <Select label={t('subscriptions.recon')} placeholder={t('common.all')} options={[{ value: 'true', label: t('subscriptions.reconciled') }, { value: 'false', label: t('subscriptions.notReconciled') }]} value={ls.filters.reconciled} onChange={(e) => ls.setFilter('reconciled', e.target.value)} />
        <Input label={t('common.from')} type="date" value={ls.filters.date_from} onChange={(e) => ls.setFilter('date_from', e.target.value)} />
        <Input label={t('common.to')} type="date" value={ls.filters.date_to} onChange={(e) => ls.setFilter('date_to', e.target.value)} />
        {canWrite && <Button icon={Plus} onClick={() => setForm(true)}>{t('subscriptions.addPayment')}</Button>}
        {canImport && <Button variant="secondary" icon={FileUp} onClick={() => setImp(true)}>{t('subscriptions.importBtn')}</Button>}
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(p) => p.id} ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('subscriptions.noPayments')} emptyText={t('subscriptions.noPaymentsText')}
          columns={[
            { key: 'd', header: t('common.date'), sortKey: 'paid_at', render: (p) => formatDateTime(p.paid_at) },
            { key: 'c', header: t('subscriptions.clientBranch'), render: (p) => <div><strong>{p.client_name}</strong><div className="muted" style={{ fontSize: 12 }}>{p.branch_name}{p.elqr_account ? t('subscriptions.accountSuffix', { acc: p.elqr_account }) : ''}</div></div> },
            { key: 'sr', header: t('subscriptions.source'), render: (p) => <StatusChip kind="paySource" status={p.source} small /> },
            { key: 'a', header: t('common.amount'), sortKey: 'amount', align: 'right', render: (p) => <span className={p.status === 'cancelled' ? 'muted' : ''}><Money value={p.amount} />{toNum(p.refunded_amount) > 0 && <div className="muted" style={{ fontSize: 12 }}>{t('subscriptions.refundLine', { v: p.refunded_amount ?? 0 })}</div>}</span> },
            { key: 'm', header: t('subscriptions.months'), align: 'right', render: (p) => p.months ?? '—' },
            { key: 'cm', header: t('subscriptions.commission'), align: 'right', render: (p) => (p.commission_amount != null ? <Money value={p.commission_amount} /> : '—') },
            { key: 'st', header: t('common.status'), render: (p) => <div><Badge small tone={PAYMENT_STATUS[p.status]?.tone}>{PAYMENT_STATUS[p.status]?.label ?? p.status}</Badge>{p.reconciled_at && <div className="muted" style={{ fontSize: 12 }}>{t('subscriptions.reconciledOne')}</div>}{p.cancel_reason && <div className="muted" style={{ fontSize: 12 }}>{p.cancel_reason}</div>}</div> },
            ...(canCancel || canRefund ? [{ key: 'x', header: '', render: (p: Payment) => (p.status === 'confirmed' ? (
              <div className="kcard__actions">
                {canRefund && p.sale != null && <Button size="sm" variant="secondary" onClick={() => setRefund(p)}>{t('subscriptions.refund')}</Button>}
                {canCancel && <Button size="sm" variant="danger" onClick={() => setCancel(p)}>{t('subscriptions.cancel')}</Button>}
              </div>) : null) }] : []),
          ]} />
      </Card>
      {form && <PaymentForm onClose={() => setForm(false)} />}
      {imp && <ImportModal onClose={() => setImp(false)} />}
      {refund && <RefundModal payment={refund} onClose={() => setRefund(null)} />}
      {cancel && <ReasonModal title={t('subscriptions.cancelPayment')} submitLabel={t('subscriptions.cancelPayment')} hint={t('subscriptions.cancelHint')} onClose={() => setCancel(null)}
        onSubmit={(reason) => act(`payments/${cancel.id}/cancel/`, { reason }, t('subscriptions.paymentCancelled'))} />}
    </div>
  )
}

type Tab = 'subs' | 'pay'

export default function SubscriptionsPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('subs')
  const canPay = useCan('paymentsView')
  return (
    <div className="page">
      <PageHeader eyebrow={t('subscriptions.eyebrow')} title={t('subscriptions.title')} />
      <Tabs<Tab> tabs={[{ value: 'subs', label: t('subscriptions.tab.subs') }, ...(canPay ? [{ value: 'pay' as Tab, label: t('subscriptions.tab.pay') }] : [])]} value={tab} onChange={setTab} />
      {tab === 'subs' ? <SubscriptionsTab /> : <PaymentsTab />}
    </div>
  )
}
