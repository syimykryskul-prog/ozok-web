import { useMemo, useState } from 'react'
import { Banknote, Plus, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useList, useOne } from '../../api/hooks'
import type { LedgerCategory, LedgerEntry, LedgerReport } from '../../api/types'
import { Badge, Button, Card, CardTitle, DataTable, ErrorAlert, FormModal, Input, KpiCard, Money, PageHeader, Select, Textarea } from '../../components/ui'
import { compactMoney, formatDate, formatMoney, monthLabel, shortMonth, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { LEDGER_TYPES, SALE_KINDS, dictOptions } from '../../lib/status'
import { FranchiseeSelect, ProductSelect, toId } from '../common/pickers'
import { ReasonModal } from '../common/shared'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useT } from '../../i18n'
import { CHART, CHART_TICK, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'

function EntryForm({ partner, onClose }: { partner?: string; onClose: () => void }) {
  const t = useT()
  const hq = useIsHq()
  const { act, busy } = useAct()
  const f = useForm({ type: 'expense', category: '', amount: '', date: toISODate(new Date()), description: '', product: '', partner: partner ?? '' })
  const { rows: cats } = useList<LedgerCategory>('ledger-categories/', { page_size: 100, type: f.v.type, is_active: true })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.category) e.category = [t('ledger.err.category')]
    if (!(toNum(f.v.amount) > 0)) e.amount = [t('ledger.err.amount')]
    if (hq && !f.v.partner) e.partner = [t('ledger.err.partner')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act('ledger/', {
      type: f.v.type, category: toId(f.v.category), amount: f.v.amount.replace(',', '.'), date: f.v.date, description: f.v.description,
      product: toId(f.v.product), partner: hq ? toId(f.v.partner) : undefined,
    }, t('ledger.added'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('ledger.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        {hq && <div className="span-2"><FranchiseeSelect value={f.v.partner} onChange={(v) => f.set('partner', v)} error={f.errors.partner} /></div>}
        <Select label={t('common.type')} options={[{ value: 'expense', label: t('ledger.expense') }, { value: 'income', label: t('ledger.otherIncome') }]} value={f.v.type} onChange={(e) => { f.set('type', e.target.value); f.set('category', '') }} />
        <Select label={t('ledger.category')} placeholder={t('ledger.choose')} options={(cats ?? []).map((c) => ({ value: c.id, label: c.name }))} value={f.v.category} error={f.errors.category} onChange={(e) => f.set('category', e.target.value)} />
        <Input label={t('ledger.amountSom')} inputMode="decimal" value={f.v.amount} error={f.errors.amount} onChange={(e) => f.set('amount', e.target.value)} />
        <Input label={t('common.date')} type="date" value={f.v.date} onChange={(e) => f.set('date', e.target.value)} />
        <ProductSelect label={t('ledger.sphereOpt')} placeholder={t('ledger.noSphere')} value={f.v.product} onChange={(v) => f.set('product', v)} />
        <div className="field"><span className="field__label">{t('ledger.receipt')}</span><input className="input" type="file" disabled aria-label={t('ledger.attachment')} /><span className="field__hint">{t('ledger.uploadLater')}</span></div>
        <div className="span-2"><Textarea label={t('common.description')} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} /></div>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>{t('ledger.autoNote')}</p>
    </FormModal>
  )
}

export function LedgerView({ partner: fixedPartner }: { partner?: number }) {
  const t = useT()
  const hq = useIsHq()
  const canWrite = useCan('ledgerWrite')
  const { act } = useAct()
  const init = useMemo(() => { const d = new Date(); return toISODate(new Date(d.getFullYear(), d.getMonth() - 5, 1)) }, [])
  const [from, setFrom] = useState(init)
  const [to, setTo] = useState(toISODate(new Date()))
  const [partner, setPartner] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [cancel, setCancel] = useState<LedgerEntry | null>(null)
  const pid = fixedPartner ? String(fixedPartner) : partner
  const filt = { partner: hq ? pid : undefined, date_from: from, date_to: to }
  const rep = useOne<LedgerReport>('reports/ledger/', filt)
  const list = useList<LedgerEntry>('ledger/', { ...filt, type, cancelled: 'all', page, page_size: 20, ordering: '-date' })
  const r = rep.data
  const kinds = r?.sales_income?.by_kind ?? []
  const spheres = r?.sales_income?.by_product ?? []
  const chart = (r?.by_month ?? []).map((m) => ({ month: m.month, income: toNum(m.income), expense: toNum(m.expenses), profit: toNum(m.profit) }))
  const profit = toNum(r?.profit)
  const serName = (n: string) => (n === 'income' ? t('ledger.income') : n === 'expense' ? t('ledger.expenses') : t('ledger.profit'))

  return (
    <div className="stack">
      <div className="filters">
        <Input label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        {hq && !fixedPartner && <FranchiseeSelect label={t('ledger.partner')} placeholder={t('ledger.allPartners')} value={partner} onChange={(v) => { setPartner(v); setPage(1) }} />}
        {canWrite && <Button icon={Plus} onClick={() => setAdding(true)}>{t('ledger.add')}</Button>}
      </div>
      <ErrorAlert error={rep.error} />
      <div className="grid grid--kpi">
        <KpiCard icon={Banknote} label={t('ledger.salesIncome')} value={r ? <Money value={r.sales_income?.total ?? 0} /> : '…'} />
        <KpiCard icon={TrendingUp} label={t('ledger.otherIncomes')} value={r ? <Money value={r.other_income?.total ?? 0} /> : '…'} />
        <KpiCard icon={TrendingDown} label={t('ledger.expenses')} value={r ? <Money value={r.expenses?.total ?? 0} /> : '…'} />
        <KpiCard icon={Wallet} label={t('ledger.deductions')} value={r ? <Money value={r.deductions?.total ?? 0} /> : '…'} sub={r ? t('ledger.deductionsSub', { share: formatMoney(r.deductions?.nbs_share ?? 0), held: formatMoney(r.deductions?.withheld ?? 0) }) : undefined} />
        <KpiCard icon={Scale} label={t('ledger.profit')} value={r ? <span className={profit < 0 ? 'amount-neg' : 'amount-pos'}><Money value={r.profit ?? 0} /></span> : '…'} />
      </div>

      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('ledger.salesIncome')}</CardTitle></div>
          <DataTable rows={[...kinds.map((k) => ({ id: `k${k.kind}`, name: k.label ?? SALE_KINDS[k.kind] ?? k.kind, amount: k.income, grp: t('ledger.byKind') })), ...spheres.map((s) => ({ id: `s${s.product}`, name: s.name, amount: s.income, grp: t('ledger.bySphere') }))]}
            rowKey={(x) => x.id} emptyTitle={t('ledger.noSales')} emptyText=" "
            columns={[{ key: 'g', header: t('ledger.slice'), render: (x) => <Badge small>{x.grp}</Badge> }, { key: 'n', header: t('common.name'), render: (x) => x.name }, { key: 'a', header: t('common.amount'), align: 'right', render: (x) => <Money value={x.amount} /> }]} />
        </Card>
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('ledger.expByCat')}</CardTitle></div>
          <DataTable rows={r?.expenses?.by_category ?? []} rowKey={(x) => x.category} emptyTitle={t('ledger.noExpenses')} emptyText=" "
            columns={[{ key: 'n', header: t('ledger.category'), render: (x) => x.name }, { key: 'a', header: t('common.amount'), align: 'right', render: (x) => <Money value={x.amount} /> }]} />
        </Card>
      </div>

      <Card white>
        <CardTitle>{t('ledger.byMonth')}</CardTitle>
        <div className="chart-box" role="img" aria-label={t('ledger.chartAria')}>
          {chart.length === 0 ? <div className="empty"><h3>{t('ledger.noData')}</h3></div> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
                <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={CHART_TICK} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(v, n) => [formatMoney(Number(v)), serName(String(n))]} labelFormatter={(l) => monthLabel(String(l))} contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend formatter={(n) => serName(String(n))} />
                <Bar dataKey="income" fill={CHART.c1} radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill={CHART.c2} radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill={CHART.c3} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card white flush>
        <div style={{ padding: '20px 24px 0' }} className="row row--between">
          <CardTitle>{t('ledger.entries')}</CardTitle>
          <Select aria-label={t('common.type')} placeholder={t('common.all')} options={dictOptions(LEDGER_TYPES)} value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} />
        </div>
        <ErrorAlert error={list.error} />
        <DataTable loading={list.isLoading} rows={list.rows} rowKey={(x) => x.id} page={page} total={list.data?.count} onPage={setPage}
          emptyTitle={t('ledger.noEntries')} emptyText={t('ledger.noEntriesText')}
          columns={[
            { key: 'd', header: t('common.date'), render: (x) => formatDate(x.date) },
            ...(hq ? [{ key: 'p', header: t('ledger.partner'), render: (x: LedgerEntry) => x.partner_name ?? '—' }] : []),
            { key: 't', header: t('common.type'), render: (x) => <Badge small tone={x.type === 'income' ? 'success' : 'warning'}>{LEDGER_TYPES[x.type]}</Badge> },
            { key: 'c', header: t('ledger.category'), render: (x) => x.category_name ?? '—' },
            { key: 'ds', header: t('common.description'), render: (x) => <span>{x.description || '—'}{(x.cancelled || x.cancelled_at) && <div className="muted" style={{ fontSize: 12 }}>{t('ledger.cancelledReason', { reason: x.cancel_reason ?? '' })}</div>}</span> },
            { key: 'a', header: t('common.amount'), align: 'right', render: (x) => <span style={x.cancelled || x.cancelled_at ? { textDecoration: 'line-through' } : undefined}><Money value={x.amount} /></span> },
            ...(canWrite ? [{ key: 'x', header: '', render: (x: LedgerEntry) => (x.cancelled || x.cancelled_at ? <Badge small>{t('ledger.cancelled')}</Badge> : <Button size="sm" variant="danger" onClick={() => setCancel(x)}>{t('ledger.cancel')}</Button>) }] : []),
          ]} />
      </Card>
      {adding && <EntryForm partner={pid} onClose={() => setAdding(false)} />}
      {cancel && <ReasonModal title={t('ledger.cancelTitle')} submitLabel={t('ledger.cancelTitle')} hint={t('ledger.cancelHint')} onClose={() => setCancel(null)}
        onSubmit={(reason) => act(`ledger/${cancel.id}/cancel/`, { reason }, t('ledger.cancelledOk'))} />}
    </div>
  )
}

export default function LedgerPage() {
  const t = useT()
  return (
    <div className="page">
      <PageHeader eyebrow={t('ledger.eyebrow')} title={t('ledger.title')} />
      <LedgerView />
    </div>
  )
}
