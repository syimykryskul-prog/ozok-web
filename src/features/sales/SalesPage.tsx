import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Banknote, Percent, Lock, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useList, useOne } from '../../api/hooks'
import type { ClientSale, SalesReport, Tariff } from '../../api/types'
import { Badge, Button, Card, CardTitle, DataTable, ErrorAlert, FormModal, Input, KpiCard, Money, PageHeader, Select, Tabs } from '../../components/ui'
import { compactMoney, formatDate, formatMoney, monthLabel, shortMonth, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { SALE_KINDS } from '../../lib/status'
import { iconFor } from '../../lib/icons'
import { FranchiseeSelect, useProducts } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { DealForm } from '../deals/DealForm'
import { DealsList } from '../deals/DealsList'
import { CHART, CHART_TICK, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { useT } from '../../i18n'

function monthRange() {
  const d = new Date()
  return { from: toISODate(new Date(d.getFullYear(), d.getMonth(), 1)), to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
}

export { DealForm as SaleModal }

function IncomeModal({ sale, onClose }: { sale: ClientSale; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ income: String(toNum(sale.franchisee_income)) })
  const submit = async () => {
    const r = await act(`client-sales/${sale.id}/`, { franchisee_income: f.v.income.replace(',', '.') }, t('sales.incomeChanged'), 'PATCH')
    if (r) onClose()
  }
  return (
    <FormModal title={t('sales.incomeModalTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t('sales.incomeLabel')} inputMode="decimal" value={f.v.income} onChange={(e) => f.set('income', e.target.value)} />
    </FormModal>
  )
}

export default function SalesPage() {
  const t = useT()
  const hq = useIsHq()
  const canWrite = useCan('salesWrite')
  const canAdjust = useCan('salesAdjust')
  const { act } = useAct()
  const [sphere, setSphere] = useState('')
  const [tariff, setTariff] = useState('')
  const [fr, setFr] = useState('')
  const products = useProducts()
  const SPHERES = [{ value: '', label: t('common.all') }, ...products.filter((p) => p.is_active).map((p) => ({ value: p.code, label: p.sphere || p.name }))]
  const init = useMemo(monthRange, [])
  const [from, setFrom] = useState(init.from)
  const [to, setTo] = useState(init.to)
  const [adding, setAdding] = useState(false)
  const [income, setIncome] = useState<ClientSale | null>(null)
  const ls = useListState({}, '-date')

  const filt = { date_from: from, date_to: to, franchisee: hq ? fr : undefined, product: sphere }
  const report = useOne<SalesReport>('reports/sales/', filt)
  const prodId = products.find((p) => p.code === sphere)?.id
  const tariffs = useList<Tariff>('tariffs/', { page_size: 100, product: prodId }, { skip: !prodId })
  const list = useList<ClientSale>('client-sales/', { ...ls.params, ...filt, tariff: tariff || undefined })
  const rep = report.data
  const kinds = rep?.by_kind ?? rep?.totals?.by_kind ?? []
  const chart = useMemo(() => (rep?.by_month ?? []).map((m) => ({ month: m.month, amount: toNum(m.amount), income: toNum(m.income ?? m.commission) })), [rep])

  return (
    <div className="page">
      <PageHeader eyebrow={t('sales.eyebrow')} title={t('sales.title')} actions={canWrite && <Button icon={Plus} onClick={() => setAdding(true)}>{t('sales.newSale')}</Button>} />
      <Tabs tabs={SPHERES} value={sphere} onChange={(v) => { setSphere(v); setTariff(''); ls.setPage(1) }} />
      <div className="filters">
        <Input label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        {hq && <FranchiseeSelect label={t('sales.franchisee')} placeholder={t('sales.wholeNetwork')} value={fr} onChange={(v) => { setFr(v); ls.setPage(1) }} />}
        {sphere && <Select label={t('sales.tariff')} placeholder={t('common.all')} value={tariff} options={(tariffs.rows ?? []).map((t) => ({ value: t.id, label: t.name }))} onChange={(e) => { setTariff(e.target.value); ls.setPage(1) }} />}
      </div>
      <ErrorAlert error={report.error} />

      <div className="grid grid--kpi">
        <KpiCard icon={Banknote} label={t('sales.sold')} value={rep ? <Money value={rep.totals?.amount} /> : '…'} sub={rep ? t('sales.pcs', { n: rep.totals?.count ?? 0 }) : undefined} />
        <KpiCard icon={Percent} label={t('sales.earned')} value={rep ? <Money value={rep.totals?.income ?? rep.totals?.commission} /> : '…'} />
        <KpiCard icon={Lock} label={t('sales.withheldFr')} value={rep ? <Money value={rep.totals?.withheld ?? 0} /> : '…'} />
        <KpiCard icon={Wallet} label={t('sales.netIncome')} value={rep ? <Money value={rep.totals?.net_income ?? rep.totals?.income ?? rep.totals?.commission} /> : '…'} />
      </div>

      {kinds.length > 0 && (
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('sales.byKind')}</CardTitle></div>
          <DataTable rows={kinds} rowKey={(r) => r.kind}
            columns={[
              { key: 'k', header: t('sales.kind'), render: (r) => <strong>{r.label || SALE_KINDS[r.kind] || r.kind}</strong> },
              { key: 'c', header: t('sales.count'), align: 'right', render: (r) => r.count },
              { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.amount} /> },
              { key: 'i', header: t('sales.income'), align: 'right', render: (r) => <Money value={r.income} /> },
            ]} />
        </Card>
      )}

      <div className="grid grid--4">
        {(rep?.by_product ?? []).filter((p) => !sphere || p.product === sphere).map((p) => (
          <KpiCard key={p.product} icon={iconFor(products.find((x) => x.code === p.product)?.icon)} label={p.sphere || p.name} value={<Money value={p.amount} />}
            sub={t('sales.incomeSub', { income: formatMoney(p.income ?? p.commission), n: p.count })} />
        ))}
      </div>

      <Card white>
        <CardTitle>{t('sales.byMonth')}</CardTitle>
        <div className="chart-box" role="img" aria-label={t('sales.chartAria')}>
          {report.isLoading ? <span className="skeleton" style={{ height: 300 }} /> : chart.length === 0 ? (
            <div className="empty"><h3>{t('sales.noData')}</h3></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
                <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={CHART_TICK} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(v, n) => [formatMoney(Number(v)), n === 'amount' ? t('sales.sold') : t('sales.income')]} labelFormatter={(l) => monthLabel(String(l))} contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: CHART.cursor }} />
                <Legend formatter={(n) => (n === 'amount' ? t('sales.sold') : t('sales.income'))} />
                <Bar dataKey="amount" fill={CHART.c1} radius={[6, 6, 0, 0]} />
                <Bar dataKey="income" fill={CHART.c2} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {hq && !fr && (
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('sales.byFranchisee')}</CardTitle></div>
          <DataTable
            loading={report.isLoading} rows={rep?.by_franchisee} rowKey={(r) => r.franchisee_id}
            onRowClick={(r) => setFr(String(r.franchisee_id))}
            emptyTitle={t('sales.noSales')} emptyText={t('sales.noSalesPeriod')}
            columns={[
              { key: 'n', header: t('sales.franchisee'), render: (r) => <strong>{r.name}</strong> },
              { key: 'c', header: t('sales.count'), align: 'right', render: (r) => r.count },
              { key: 'a', header: t('sales.sold'), align: 'right', render: (r) => <Money value={r.amount} /> },
              { key: 'i', header: t('sales.income'), align: 'right', render: (r) => <Money value={r.income ?? r.commission} /> },
              { key: 'w', header: t('sales.withheld'), align: 'right', render: (r) => <Money value={r.withheld ?? 0} /> },
              { key: 'n2', header: t('sales.netIncome'), align: 'right', render: (r) => <Money value={r.net_income ?? r.income ?? r.commission} /> },
            ]}
          />
        </Card>
      )}

      <DealsList dateFrom={from} dateTo={to} />

      <Card white flush>
        <div style={{ padding: '20px 24px 0' }} className="row row--between">
          <CardTitle>{t('sales.salesList')}</CardTitle>
        </div>
        <ErrorAlert error={list.error} />
        <DataTable
          loading={list.isLoading} rows={list.rows} rowKey={(r) => r.id}
          ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={list.data?.count} onPage={ls.setPage}
          emptyTitle={t('sales.noSalesList')} emptyText={t('sales.noSalesFound')}
          columns={[
            { key: 'd', header: t('common.date'), sortKey: 'date', render: (r) => formatDate(r.date) },
            { key: 'c', header: t('sales.client'), render: (r) => <div><strong>{r.client_name}</strong>{hq && <div className="muted" style={{ fontSize: 12 }}>{r.franchisee_name}</div>}</div> },
            { key: 'p', header: t('sales.product'), render: (r) => <div>{r.product_name}{r.tariff_name && <div className="muted" style={{ fontSize: 12 }}>{r.tariff_name}</div>}</div> },
            { key: 'k', header: t('sales.kind'), render: (r) => <div>{SALE_KINDS[r.kind] ?? r.kind}{r.equipment_name && <div className="muted" style={{ fontSize: 12 }}>{r.equipment_name} × {toNum(r.quantity)}</div>}{r.source === 'integration' && <div><Badge tone="info" small>{t('sales.fromProduct', { name: r.product_name ?? '' })}</Badge></div>}</div> },
            { key: 'l', header: t('sales.byPrice'), align: 'right', render: (r) => (toNum(r.list_amount) ? <Money value={r.list_amount} /> : '—') },
            { key: 'ds', header: t('sales.discount'), align: 'right', render: (r) => (toNum(r.discount_amount) ? <Money value={r.discount_amount} /> : '—') },
            { key: 'a', header: t('sales.paid'), align: 'right', sortKey: 'amount', render: (r) => <span className={toNum(r.amount) < 0 ? 'amount-neg' : ''}><Money value={r.amount} /></span> },
            { key: 'fi', header: t('sales.frIncome'), align: 'right', render: (r) => <span>{r.franchisee_income != null ? <Money value={r.franchisee_income} /> : <Money value={r.commission_amount ?? 0} />}{r.income_overridden && <div><Badge small>{t('sales.manual')}</Badge></div>}</span> },
            { key: 'w', header: t('sales.withheld'), align: 'right', render: (r) => (toNum(r.withheld_amount) ? <Money value={r.withheld_amount} /> : '—') },
            { key: 'ru', header: t('sales.rule'), render: (r) => <span className="muted">{r.commission_rule_name ?? (r.commission_percent ? `${toNum(r.commission_percent)}%` : '—')}</span> },
            ...(canAdjust ? [{
              key: 'ac', header: '', render: (r: ClientSale) => (
                <div className="kcard__actions">
                  <Button size="sm" variant="secondary" onClick={() => act(`client-sales/${r.id}/recalculate/`, undefined, t('sales.recalculated'))}>{t('sales.recalc')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIncome(r)}>{t('sales.incomeManual')}</Button>
                </div>
              ),
            }] : []),
          ]}
        />
      </Card>
      {adding && <DealForm onClose={() => setAdding(false)} />}
      {income && <IncomeModal sale={income} onClose={() => setIncome(null)} />}
    </div>
  )
}
