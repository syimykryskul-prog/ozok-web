import { useState } from 'react'
import { Banknote, Download, Plus, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { CashAccount, CashCategory, CashReport, CashTransaction, HqDashboard } from '../../api/types'
import { canRead } from '../../lib/permissions'
import { downloadFile } from '../common/download'
import { useToast } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { Badge, Button, Card, CardTitle, Checkbox, DataTable, ErrorAlert, FormModal, Input, KpiCard, Money, PageHeader, Select, Tabs, Textarea } from '../../components/ui'
import { formatDate, formatMoney, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { FranchiseeSelect, toId } from '../common/pickers'
import { ReasonModal } from '../common/shared'
import { PaymentsTab } from '../subscriptions/SubscriptionsPage'
import { AccrualsTab, PayoutsTab, SummaryBlock } from '../commissions/CommissionsPage'
import { RewardsSection } from '../recruiters/RecruitersPage'
import { AccrualsTab as ImplementerAccruals } from '../installations/InstallationsPage'
import { HqSettlements, FrSettlements } from '../settlements/SettlementsPage'
import { LedgerView } from '../ledger/LedgerPage'
import { useSearchParams } from 'react-router-dom'
import { useT } from '../../i18n'

const kindLabels = (t: (k: string) => string): Record<string, string> => ({ cash: t('cash.kind.cash'), bank: t('cash.kind.bank'), elqr: t('cash.kind.elqr') })
const monthStart = () => { const d = new Date(); return toISODate(new Date(d.getFullYear(), d.getMonth(), 1)) }

function Period({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  const t = useT()
  return (
    <div className="filters">
      <Input label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <Input label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
    </div>
  )
}

// ---------- Обзор (OZOK) ----------
function AccountForm({ item, onClose }: { item?: CashAccount; onClose: () => void }) {
  const t = useT()
  const KIND = kindLabels(t)
  const { act, busy } = useAct()
  const f = useForm({ name: item?.name ?? '', kind: item?.kind ?? 'bank', opening_balance: item?.opening_balance ?? '0', opening_date: item?.opening_date ?? toISODate(new Date()), is_active: item?.is_active ?? true })
  const submit = async () => {
    if (!f.v.name.trim()) return f.fail({ data: { name: [t('cash.err.name')] } })
    const body = { name: f.v.name.trim(), kind: f.v.kind, opening_balance: f.v.opening_balance.replace(',', '.') || '0', opening_date: f.v.opening_date, is_active: f.v.is_active }
    const r = item ? await act(`cash-accounts/${item.id}/`, body, t('cash.acc.saved'), 'PATCH') : await act('cash-accounts/', body, t('cash.acc.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('cash.acc.title') : t('cash.acc.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t('common.name')} value={f.v.name} error={f.errors.name} onChange={(e) => f.set('name', e.target.value)} />
      <Select label={t('cash.acc.kind')} options={Object.entries(KIND).map(([value, label]) => ({ value, label }))} value={f.v.kind} error={f.errors.kind} onChange={(e) => f.set('kind', e.target.value)} />
      <div className="form-grid">
        <Input label={t('cash.acc.opening')} inputMode="decimal" value={f.v.opening_balance} error={f.errors.opening_balance} onChange={(e) => f.set('opening_balance', e.target.value)} />
        <Input label={t('cash.acc.openingDate')} type="date" value={f.v.opening_date} error={f.errors.opening_date} onChange={(e) => f.set('opening_date', e.target.value)} />
      </div>
      <Checkbox label={t('cash.acc.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

function Overview() {
  const t = useT()
  const KIND = kindLabels(t)
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(toISODate(new Date()))
  const toast = useToast()
  const canAcc = useCan('cashAccountWrite')
  const [accForm, setAccForm] = useState<CashAccount | 'new' | null>(null)
  const [exporting, setExporting] = useState(false)
  const rep = useOne<CashReport>('reports/cash/', { date_from: from, date_to: to })
  const accs = useList<CashAccount>('cash-accounts/', { page_size: 50 })
  const hasDash = canRead('dashboard')
  const dash = useOne<HqDashboard>('dashboard/', undefined, { skip: !hasDash })
  const canPayouts = canRead('payouts')
  const pending = useList<unknown>('payouts/', { status: 'verified', page_size: 1 }, { skip: !canPayouts })
  const draft = useList<unknown>('payouts/', { status: 'draft', page_size: 1 }, { skip: !canPayouts })
  const r = rep.data
  const net = toNum(r?.net ?? toNum(r?.total_in) - toNum(r?.total_out))
  const exportCsv = async () => {
    setExporting(true)
    try { await downloadFile('reports/cash/', { date_from: from, date_to: to, export: 'csv' }, 'cash-report.csv') } catch (e) { toast.error(errorMessage(e)) } finally { setExporting(false) }
  }
  const byId = new Map((r?.accounts ?? []).map((a) => [a.id, a]))
  return (
    <div className="stack">
      <div className="row row--between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Period from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Button variant="secondary" icon={Download} loading={exporting} onClick={exportCsv}>{t('cash.exportCsv')}</Button>
      </div>
      <ErrorAlert error={rep.error} />
      <div className="grid grid--kpi">
        <KpiCard icon={Wallet} label={t('cash.kpi.opening')} value={r ? <Money value={r.opening_total ?? 0} /> : '…'} />
        <KpiCard icon={TrendingUp} label={t('cash.kpi.in')} value={r ? <Money value={r.total_in ?? 0} /> : '…'} />
        <KpiCard icon={TrendingDown} label={t('cash.kpi.out')} value={r ? <Money value={r.total_out ?? 0} /> : '…'} />
        <KpiCard icon={Scale} label={t('cash.kpi.net')} value={r ? <span className={net < 0 ? 'amount-neg' : 'amount-pos'}>{formatMoney(net)}</span> : '…'} sub={r ? t('cash.kpi.closing', { v: formatMoney(r.closing_total ?? 0) }) : undefined} />
        {hasDash && <KpiCard icon={Wallet} label={t('cash.kpi.receivables')} value={dash.data ? <Money value={dash.data.receivables} /> : '…'} sub={dash.data ? t('cash.kpi.overdue', { v: formatMoney(dash.data.overdue_receivables) }) : undefined} />}
        {canPayouts && <KpiCard icon={Banknote} label={t('cash.kpi.queue')} value={(draft.data?.count ?? 0) + (pending.data?.count ?? 0)} sub={t('cash.kpi.queueSub', { a: draft.data?.count ?? 0, b: pending.data?.count ?? 0 })} />}
      </div>
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle actions={canAcc && <Button size="sm" icon={Plus} onClick={() => setAccForm('new')}>{t('cash.acc.btn')}</Button>}>{t('cash.acc.list')}</CardTitle></div>
        <ErrorAlert error={accs.error} />
        <DataTable loading={accs.isLoading} rows={accs.rows} rowKey={(a) => a.id} onRowClick={canAcc ? setAccForm : undefined} emptyTitle={t('cash.acc.empty')} emptyText={t('cash.acc.emptyText')}
          columns={[
            { key: 'n', header: t('cash.acc.account'), render: (a) => <div><strong>{a.name}</strong>{!a.is_active && <> <Badge small>{t('cash.acc.disabled')}</Badge></>}</div> },
            { key: 'k', header: t('cash.acc.kind'), render: (a) => KIND[a.kind] ?? a.kind },
            { key: 'o', header: t('cash.col.opening'), align: 'right', render: (a) => (byId.get(a.id) ? <Money value={byId.get(a.id)!.opening} /> : '—') },
            { key: 'i', header: t('cash.col.in'), align: 'right', render: (a) => (byId.get(a.id) ? <Money value={byId.get(a.id)!.in} /> : '—') },
            { key: 'u', header: t('cash.col.out'), align: 'right', render: (a) => (byId.get(a.id) ? <Money value={byId.get(a.id)!.out} /> : '—') },
            { key: 'b', header: t('cash.col.balance'), align: 'right', render: (a) => (a.balance != null ? <Money value={a.balance} /> : '—') },
          ]} />
      </Card>
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <CatTable title={t('cash.inByCat')} rows={r?.in_by_category} />
        <CatTable title={t('cash.outByCat')} rows={r?.out_by_category} />
      </div>
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('cash.byMonth')}</CardTitle></div>
        <DataTable rows={r?.by_month ?? []} rowKey={(m) => m.month} emptyTitle={t('cash.noData')} emptyText=" "
          columns={[
            { key: 'm', header: t('cash.col.month'), render: (m) => m.month },
            { key: 'i', header: t('cash.col.in'), align: 'right', render: (m) => <Money value={m.in} /> },
            { key: 'o', header: t('cash.col.out'), align: 'right', render: (m) => <Money value={m.out} /> },
            { key: 'n', header: t('common.total'), align: 'right', render: (m) => <Money value={m.net} signed /> },
          ]} />
      </Card>
      {accForm && <AccountForm item={accForm === 'new' ? undefined : accForm} onClose={() => setAccForm(null)} />}
    </div>
  )
}

function CatTable({ title, rows }: { title: string; rows?: { category: number; name: string; amount: string }[] }) {
  const t = useT()
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle>{title}</CardTitle></div>
      <DataTable rows={rows ?? []} rowKey={(x) => String(x.category)} emptyTitle={t('cash.noData')} emptyText=" "
        columns={[{ key: 'n', header: t('cash.category'), render: (x) => x.name ?? String(x.category) }, { key: 'a', header: t('common.amount'), align: 'right', render: (x) => <Money value={x.amount} /> }]} />
    </Card>
  )
}

// ---------- Поступления / Расходы / Переводы ----------
type Dir = 'in' | 'out' | 'transfer'
const dirTitle = (t: (k: string) => string): Record<Dir, string> => ({ in: t('cash.tx.newIn'), out: t('cash.tx.newOut'), transfer: t('cash.tx.newTransfer') })

/** Ручные проводки: поступление и перевод → cash-transactions/, расход → nbs-expenses/ (поставщик, описание). Автопроводки вручную не вносятся. */
function TxForm({ direction, onClose }: { direction: Dir; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ account: '', transfer_account: '', category: '', amount: '', date: toISODate(new Date()), comment: '', partner: '', supplier: '', description: '' })
  const accs = useList<CashAccount>('cash-accounts/', { page_size: 50, is_active: true })
  const cats = useList<CashCategory>('cash-categories/', { page_size: 100, is_active: true, manual_allowed: true, direction: direction === 'transfer' ? undefined : direction })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.account) e.account = [direction === 'transfer' ? t('cash.err.fromAccount') : t('cash.err.account')]
    if (direction === 'transfer' && !f.v.transfer_account) e.transfer_account = [t('cash.err.toAccount')]
    if (direction === 'transfer' && f.v.transfer_account && f.v.transfer_account === f.v.account) e.transfer_account = [t('cash.err.otherAccount')]
    if (direction !== 'transfer' && !f.v.category) e.category = [t('cash.err.category')]
    if (!(toNum(f.v.amount) > 0)) e.amount = [t('cash.err.amount')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const amount = f.v.amount.replace(',', '.')
    let r
    if (direction === 'out') {
      r = await act('nbs-expenses/', { account: toId(f.v.account), category: toId(f.v.category), amount, date: f.v.date, description: f.v.description.trim() || f.v.comment.trim(), supplier: f.v.supplier.trim() }, t('cash.tx.outAdded'))
    } else {
      r = await act('cash-transactions/', {
        direction, account: toId(f.v.account), amount, date: f.v.date, comment: f.v.comment.trim(),
        ...(direction === 'transfer' ? { transfer_account: toId(f.v.transfer_account) } : { category: toId(f.v.category), partner: toId(f.v.partner) }),
      }, direction === 'transfer' ? t('cash.tx.transferDone') : t('cash.tx.added'))
    }
    if (r) onClose()
  }
  const accOpts = (accs.rows ?? []).map((a) => ({ value: a.id, label: a.name }))
  return (
    <FormModal title={dirTitle(t)[direction]} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Select label={direction === 'transfer' ? t('cash.tx.fromAccount') : t('cash.acc.account')} placeholder={t('cash.choose')} options={accOpts} value={f.v.account} error={f.errors.account} onChange={(e) => f.set('account', e.target.value)} />
        {direction === 'transfer'
          ? <Select label={t('cash.tx.toAccount')} placeholder={t('cash.choose')} options={accOpts.filter((o) => String(o.value) !== f.v.account)} value={f.v.transfer_account} error={f.errors.transfer_account} onChange={(e) => f.set('transfer_account', e.target.value)} />
          : <Select label={t('cash.tx.category')} placeholder={t('cash.choose')} options={(cats.rows ?? []).map((c) => ({ value: c.id, label: c.name }))} value={f.v.category} error={f.errors.category} onChange={(e) => f.set('category', e.target.value)} />}
        <Input label={t('cash.tx.amount')} inputMode="decimal" value={f.v.amount} error={f.errors.amount} onChange={(e) => f.set('amount', e.target.value)} />
        <Input label={t('common.date')} type="date" value={f.v.date} error={f.errors.date} onChange={(e) => f.set('date', e.target.value)} />
      </div>
      {direction === 'in' && <FranchiseeSelect label={t('cash.tx.partnerOpt')} placeholder={t('cash.tx.noPartner')} value={f.v.partner} onChange={(v) => f.set('partner', v)} />}
      {direction === 'out' && <Input label={t('cash.tx.supplier')} value={f.v.supplier} error={f.errors.supplier} onChange={(e) => f.set('supplier', e.target.value)} />}
      {direction === 'out' && <Input label={t('cash.tx.expenseDesc')} value={f.v.description} error={f.errors.description} onChange={(e) => f.set('description', e.target.value)} />}
      <Textarea label={t('common.comment')} rows={2} value={f.v.comment} onChange={(e) => f.set('comment', e.target.value)} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('cash.tx.autoNote')}</p>
    </FormModal>
  )
}

function Journal({ direction }: { direction: Dir }) {
  const t = useT()
  const canWrite = useCan('cashWrite')
  const canCancel = useCan('cashCancel')
  const { act } = useAct()
  const ls = useListState({ account: '', category: '', date_from: '', date_to: '' }, '-date')
  const accs = useList<CashAccount>('cash-accounts/', { page_size: 50 })
  const cats = useList<CashCategory>('cash-categories/', { page_size: 100, direction: direction === 'transfer' ? undefined : direction })
  const { rows, data, isLoading, error } = useList<CashTransaction>('cash-transactions/', { ...ls.params, direction })
  const [form, setForm] = useState(false)
  const [cancel, setCancel] = useState<CashTransaction | null>(null)
  const [showReversals, setShowReversals] = useState(false)
  const visible = (rows ?? []).filter((x) => showReversals || !x.reversal_of)
  const addLabel = direction === 'in' ? t('cash.j.addIn') : direction === 'out' ? t('cash.j.addOut') : t('cash.j.addTransfer')
  return (
    <div className="stack">
      <div className="filters">
        <Select label={t('cash.acc.account')} placeholder={t('common.all')} options={(accs.rows ?? []).map((a) => ({ value: a.id, label: a.name }))} value={ls.filters.account} onChange={(e) => ls.setFilter('account', e.target.value)} />
        {direction !== 'transfer' && <Select label={t('cash.tx.category')} placeholder={t('common.all')} options={(cats.rows ?? []).map((c) => ({ value: c.id, label: c.name }))} value={ls.filters.category} onChange={(e) => ls.setFilter('category', e.target.value)} />}
        <Input label={t('common.from')} type="date" value={ls.filters.date_from} onChange={(e) => ls.setFilter('date_from', e.target.value)} />
        <Input label={t('common.to')} type="date" value={ls.filters.date_to} onChange={(e) => ls.setFilter('date_to', e.target.value)} />
        <Checkbox label={t('cash.j.showReversals')} checked={showReversals} onChange={(e) => setShowReversals(e.target.checked)} />
        {canWrite && <Button icon={Plus} onClick={() => setForm(true)}>{addLabel}</Button>}
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={visible} rowKey={(x) => x.id} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={direction === 'in' ? t('cash.j.emptyIn') : direction === 'out' ? t('cash.j.emptyOut') : t('cash.j.emptyTransfer')} emptyText={t('cash.j.emptyText')}
          columns={[
            { key: 'd', header: t('common.date'), render: (x) => formatDate(x.date) },
            { key: 'a', header: direction === 'transfer' ? t('cash.j.fromTo') : t('cash.acc.account'), render: (x) => (direction === 'transfer' ? `${x.account_name ?? x.account} → ${x.transfer_account_name ?? '—'}` : x.account_name ?? t('cash.accNo', { id: x.account })) },
            ...(direction !== 'transfer' ? [{ key: 'c', header: t('cash.tx.category'), render: (x: CashTransaction) => x.category_name ?? '—' }, { key: 'p', header: t('cash.partner'), render: (x: CashTransaction) => x.partner_name ?? '—' }] : []),
            { key: 'm', header: t('common.comment'), render: (x) => <span>{x.reversal_of && <Badge small tone="warning">{t('cash.j.reversal')}</Badge>} {x.comment || '—'}{x.is_auto && <div className="muted" style={{ fontSize: 12 }}>{x.source_type ? t('cash.j.autoSrc', { src: x.source_type }) : t('cash.j.auto')}</div>}</span> },
            { key: 's', header: t('common.amount'), align: 'right', render: (x) => <span style={x.is_reversed ? { textDecoration: 'line-through' } : undefined}><Money value={x.amount} /></span> },
            { key: 'x', header: '', render: (x: CashTransaction) => (x.reversal_of ? <Badge small tone="warning">{t('cash.j.reversalOf', { n: x.reversal_of })}</Badge> : x.is_reversed ? <Badge small>{t('cash.j.cancelledRev', { n: x.reversal ?? '' })}</Badge> : canCancel ? <Button size="sm" variant="danger" onClick={() => setCancel(x)}>{t('cash.j.cancel')}</Button> : null) },
          ]} />
      </Card>
      {form && <TxForm direction={direction} onClose={() => setForm(false)} />}
      {cancel && <ReasonModal title={t('cash.j.cancelTitle')} submitLabel={t('cash.j.cancel')} hint={t('cash.j.cancelHint')} onClose={() => setCancel(null)} onSubmit={(reason) => act(`cash-transactions/${cancel.id}/cancel/`, { reason }, t('cash.j.cancelled'))} />}
    </div>
  )
}

// ---------- Выплаты ----------
type PayTab = 'commissions' | 'recruiters' | 'implementers'
function Payouts() {
  const t = useT()
  const [tab, setTab] = useState<PayTab>('commissions')
  return (
    <div className="stack">
      <Tabs<PayTab> tabs={[{ value: 'commissions', label: t('cash.pay.commissions') }, { value: 'recruiters', label: t('cash.pay.recruiters') }, { value: 'implementers', label: t('cash.pay.implementers') }]} value={tab} onChange={setTab} />
      <p className="muted" style={{ margin: 0 }}>{t('cash.pay.flow')}</p>
      {tab === 'commissions' && <PayoutsTab />}
      {tab === 'recruiters' && <RewardsSection />}
      {tab === 'implementers' && <ImplementerAccruals />}
    </div>
  )
}

// ---------- Расчёты с партнёрами ----------
function PartnerSettlements() {
  const t = useT()
  return (
    <div className="stack">
      <HqSettlements embedded />
      <h3 style={{ margin: 0 }}>{t('cash.commAccruals')}</h3>
      <AccrualsTab />
    </div>
  )
}

// ---------- Сверка ----------
function Reconciliation() {
  const t = useT()
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>{t('cash.recon.note')}</p>
      <PaymentsTab />
    </div>
  )
}

type NbsTab = 'overview' | 'in' | 'out' | 'transfer' | 'payouts' | 'partners' | 'recon'
type FrTab = 'overview' | 'ledger' | 'settlements' | 'commissions'

function NbsCash() {
  const t = useT()
  const [sp, setSp] = useSearchParams()
  const all: { value: NbsTab; label: string; ok: boolean }[] = [
    { value: 'overview', label: t('cash.tab.overview'), ok: canRead('cash_report') || canRead('cash_accounts') },
    { value: 'in', label: t('cash.tab.in'), ok: canRead('cash_transactions') },
    { value: 'out', label: t('cash.tab.out'), ok: canRead('cash_transactions') },
    { value: 'transfer', label: t('cash.tab.transfer'), ok: canRead('cash_transactions') },
    { value: 'payouts', label: t('cash.tab.payouts'), ok: canRead('payouts') || canRead('recruiter_rewards') || canRead('implementer_accruals') },
    { value: 'partners', label: t('cash.tab.partners'), ok: canRead('payments') || canRead('charges') || canRead('commission_accruals') },
    { value: 'recon', label: t('cash.tab.recon'), ok: canRead('subscription_payments') },
  ]
  const tabs = all.filter((x) => x.ok)
  const asked = sp.get('tab') as NbsTab | null
  const tab = (tabs.find((x) => x.value === asked) ?? tabs[0])?.value
  return (
    <div className="page">
      <PageHeader eyebrow={t('cash.eyebrow')} title={t('cash.title')} />
      <Tabs<NbsTab> tabs={tabs.map(({ value, label }) => ({ value, label }))} value={tab ?? 'overview'} onChange={(v) => setSp({ tab: v }, { replace: true })} />
      {tab === 'overview' && <Overview />}
      {tab === 'in' && <Journal direction="in" />}
      {tab === 'out' && <Journal direction="out" />}
      {tab === 'transfer' && <Journal direction="transfer" />}
      {tab === 'payouts' && <Payouts />}
      {tab === 'partners' && <PartnerSettlements />}
      {tab === 'recon' && <Reconciliation />}
    </div>
  )
}

function PartnerCash() {
  const t = useT()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as FrTab) || 'overview'
  return (
    <div className="page">
      <PageHeader eyebrow={t('cash.eyebrow')} title={t('cash.title')} />
      <Tabs<FrTab> tabs={[{ value: 'overview', label: t('cash.tab.overview') }, { value: 'ledger', label: t('cash.tab.ledger') }, { value: 'settlements', label: t('cash.tab.settlements') }, { value: 'commissions', label: t('cash.tab.commissions') }]} value={tab} onChange={(v) => setSp({ tab: v }, { replace: true })} />
      {tab === 'overview' && <div className="stack"><FrSettlements embedded /><SummaryBlock /></div>}
      {tab === 'ledger' && <LedgerView />}
      {tab === 'settlements' && <FrSettlements embedded />}
      {tab === 'commissions' && <div className="stack"><SummaryBlock /><AccrualsTab /><h3 style={{ margin: 0 }}>{t('cash.tab.payouts')}</h3><PayoutsTab /></div>}
    </div>
  )
}

export default function CashPage() {
  return useIsHq() ? <NbsCash /> : <PartnerCash />
}

