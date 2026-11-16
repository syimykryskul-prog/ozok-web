import { useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Award, Banknote, Building2, Percent, Repeat, ShoppingBag, TrendingDown, Users } from 'lucide-react'
import { useOne } from '../../api/hooks'
import type { PartnerAnalytics, SalesReport, SphereAnalytics, SphereBlock, SphereRow } from '../../api/types'
import { Card, CardTitle, DataTable, Dl, ErrorAlert, Input, KpiCard, Money, Select } from '../../components/ui'
import type { Column } from '../../components/ui'
import { compactMoney, formatMoney, formatNumber, monthLabel, shortMonth, toISODate, toNum } from '../../lib/format'
import { LEAD_SOURCES, PARTNER_TIERS, dictOptions, statusLabel } from '../../lib/status'
import { LedgerView } from '../ledger/LedgerPage'
import { CHART, CHART_TICK, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { t, useT } from '../../i18n'

const pctStr = (v?: string | number | null) => (v == null ? '—' : `${Math.round(toNum(v))}%`)
const statusOpts = () => [
  { value: 'candidate', label: t('analytics.st.candidate') }, { value: 'trainee', label: t('analytics.st.trainee') }, { value: 'manager', label: t('analytics.st.manager') },
  { value: 'franchisee', label: t('analytics.st.franchisee') }, { value: 'suspended', label: t('analytics.st.suspended') }, { value: 'closed', label: t('analytics.st.closed') },
]

export interface AFilters { date_from: string; date_to: string; region: string; status: string; tier: string; lead_source: string }
export const defaultFilters = (): AFilters => {
  const d = new Date()
  return { date_from: toISODate(new Date(d.getFullYear(), d.getMonth() - 5, 1)), date_to: toISODate(d), region: '', status: '', tier: '', lead_source: '' }
}

export function FilterBar({ f, set, full, children }: { f: AFilters; set: (k: keyof AFilters, v: string) => void; full?: boolean; children?: ReactNode }) {
  const t = useT()
  return (
    <div className="filters">
      <Input label={t('common.from')} type="date" value={f.date_from} onChange={(e) => set('date_from', e.target.value)} />
      <Input label={t('common.to')} type="date" value={f.date_to} onChange={(e) => set('date_to', e.target.value)} />
      {full && <Input label={t('common.region')} placeholder={t('common.all')} value={f.region} onChange={(e) => set('region', e.target.value)} />}
      {full && <Select label={t('analytics.partnerStatus')} placeholder={t('common.all')} options={statusOpts()} value={f.status} onChange={(e) => set('status', e.target.value)} />}
      {full && <Select label={t('analytics.partnerTier')} placeholder={t('common.all')} options={dictOptions(PARTNER_TIERS)} value={f.tier} onChange={(e) => set('tier', e.target.value)} />}
      <Select label={t('analytics.leadSource')} placeholder={t('common.all')} options={dictOptions(LEAD_SOURCES)} value={f.lead_source} onChange={(e) => set('lead_source', e.target.value)} />
      {children}
    </div>
  )
}

function monthChart(by?: { month: string; revenue?: string }[]) {
  const data = (by ?? []).map((m) => ({ month: m.month, revenue: toNum(m.revenue) }))
  return (
    <Card white>
      <CardTitle>{t('analytics.dynamics')}</CardTitle>
      <div className="chart-box" role="img" aria-label={t('analytics.revenueByMonth')}>
        {data.length === 0 ? <div className="empty"><h3>{t('analytics.noData')}</h3></div> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="month" tickFormatter={shortMonth} tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
              <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={CHART_TICK} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v) => [formatMoney(Number(v)), t('analytics.revenue')]} labelFormatter={(l) => monthLabel(String(l))} contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: CHART.cursor }} />
              <Legend formatter={() => t('analytics.revenue')} />
              <Bar dataKey="revenue" fill={CHART.c1} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

const kindAmount = (b: SphereBlock, kind: string) => b.sales.by_kind.find((k) => k.kind === kind)?.amount ?? 0

/** Вкладка «Аналитика» карточки партнёра и режим «По партнёру». */
export function PartnerAnalyticsView({ partner, filters }: { partner: number | string; filters?: AFilters }) {
  const [own, setOwn] = useState(defaultFilters())
  const f = filters ?? own
  const q = useOne<PartnerAnalytics>('reports/partner-analytics/', { partner, date_from: f.date_from, date_to: f.date_to })
  const d = q.data
  const tot = d?.totals
  const t = useT()
  const avg = d?.network_average
  return (
    <div className="stack">
      {!filters && <FilterBar f={own} set={(k, v) => setOwn((p) => ({ ...p, [k]: v }))} />}
      <ErrorAlert error={q.error} />
      <div className="grid grid--kpi">
        <KpiCard icon={Banknote} label={t('analytics.revenue')} value={q.isLoading ? '…' : <Money value={tot?.sales_amount ?? 0} />} sub={avg ? t('analytics.networkAvg', { v: formatMoney(avg.sales_amount) }) : undefined} />
        <KpiCard icon={ShoppingBag} label={t('analytics.sales')} value={tot?.sales_count ?? '—'} sub={avg ? t('analytics.networkAvg', { v: Math.round(toNum(avg.sales_count)) }) : undefined} />
        <KpiCard icon={Percent} label={t('analytics.conversion')} value={pctStr(tot?.leads.conversion_percent)} sub={tot ? t('analytics.leadsPaid', { total: tot.leads.total, paid: tot.leads.paid }) : undefined} />
        <KpiCard icon={TrendingDown} label={t('analytics.discounts')} value={<Money value={tot?.discounts ?? 0} />} />
        <KpiCard icon={Award} label={t('analytics.rating')} value={d?.quality?.rating ?? '—'} sub={d?.quality ? t('analytics.placeSla', { place: d.quality.place ?? '—', n: d.quality.sla_breached }) : undefined} />
      </div>
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('analytics.bySphere')}</CardTitle></div>
        <DataTable loading={q.isLoading} rows={d?.spheres} rowKey={(m) => m.product} emptyTitle={t('analytics.noDataTitle')} emptyText={t('analytics.noSales')}
          columns={[
            { key: 'n', header: t('analytics.sphere'), render: (m) => <strong>{m.sphere || m.name}</strong> },
            { key: 'sc', header: t('analytics.sales'), align: 'right', render: (m) => m.sales.count },
            { key: 'rv', header: t('analytics.revenue'), align: 'right', render: (m) => <Money value={m.sales.amount} /> },
            { key: 'se', header: t('analytics.setup'), align: 'right', render: (m) => <Money value={kindAmount(m, 'setup')} /> },
            { key: 'eq', header: t('analytics.equip'), align: 'right', render: (m) => <Money value={kindAmount(m, 'equipment')} /> },
            { key: 'sb', header: t('analytics.subscription'), align: 'right', render: (m) => <Money value={m.subscription_collected} /> },
            { key: 'ds', header: t('analytics.discounts'), align: 'right', render: (m) => <Money value={m.sales.discounts} /> },
            { key: 'ck', header: t('analytics.avgCheck'), align: 'right', render: (m) => <Money value={m.sales.avg_check} /> },
            { key: 'ld', header: t('analytics.leadsConv'), align: 'right', render: (m) => `${m.leads.total} · ${pctStr(m.leads.conversion_percent)}` },
            { key: 'su', header: t('analytics.subsActOver'), align: 'right', render: (m) => `${m.subscriptions.active} / ${m.subscriptions.overdue}` },
            { key: 'cm', header: t('analytics.commission'), align: 'right', render: (m) => <Money value={m.commission.accrued} /> },
            { key: 'wh', header: t('analytics.withheld'), align: 'right', render: (m) => <Money value={m.commission.withheld} /> },
            { key: 'ns', header: t('analytics.ozokShare'), align: 'right', render: (m) => <Money value={m.commission.nbs_share} /> },
            { key: 'in', header: t('analytics.income'), align: 'right', render: (m) => <Money value={m.income} /> },
          ]} />
      </Card>
      {monthChart(d?.by_month)}
      <h3>{t('analytics.partnerIncomeExpense')}</h3>
      <LedgerView partner={Number(partner)} />
    </div>
  )
}

const rowCols = (): Column<SphereRow>[] => [
  { key: 'rk', header: '#', render: (m) => m.rank },
  { key: 'n', header: t('analytics.partner'), render: (m) => <strong>{m.name}</strong> },
  { key: 'rg', header: t('common.region'), render: (m) => m.region || '—' },
  { key: 'st', header: t('analytics.statusTier'), render: (m) => `${statusLabel('franchisee', m.status)} · ${PARTNER_TIERS[m.tier] ?? m.tier}` },
  { key: 'sc', header: t('analytics.sales'), align: 'right', render: (m) => m.sales_count },
  { key: 'rv', header: t('analytics.revenue'), align: 'right', render: (m) => <Money value={m.revenue} /> },
  { key: 'sb', header: t('analytics.subCollected'), align: 'right', render: (m) => <Money value={m.subscription_collected} /> },
  { key: 'ds', header: t('analytics.discounts'), align: 'right', render: (m) => <Money value={m.discounts} /> },
  { key: 'ck', header: t('analytics.avgCheck'), align: 'right', render: (m) => <Money value={m.avg_check} /> },
  { key: 'cv', header: t('analytics.conversionCol'), align: 'right', render: (m) => pctStr(m.conversion_percent) },
  { key: 'su', header: t('analytics.subsActOver'), align: 'right', render: (m) => `${m.active_subscriptions} / ${m.overdue_subscriptions}` },
  { key: 'rt', header: t('analytics.rating'), align: 'right', render: (m) => m.rating ?? '—' },
]

function Ranked({ title, rows }: { title: string; rows?: SphereRow[] }) {
  return (
    <Card white>
      <CardTitle>{title}</CardTitle>
      <ul className="list">{(rows ?? []).length === 0 && <li className="muted">—</li>}
        {(rows ?? []).map((m) => <li className="list__item" key={m.partner}><span>{m.rank}. {m.name}</span><Money value={m.revenue} /></li>)}
      </ul>
    </Card>
  )
}

/** Режим «По сфере»: hero сферы, таблица всех партнёров сферы с местом, топ и отстающие. */
export function SphereView({ sphere, filters }: { sphere: string; filters: AFilters }) {
  const t = useT()
  const q = useOne<SphereAnalytics>('reports/sphere-analytics/', {
    product: sphere, date_from: filters.date_from, date_to: filters.date_to, region: filters.region, status: filters.status, tier: filters.tier, lead_source: filters.lead_source,
  }, { skip: !sphere })
  const d = q.data
  if (!sphere) return <p className="muted">{t('analytics.pickSphere')}</p>
  return (
    <div className="stack">
      <ErrorAlert error={q.error} />
      <section className="hero on-dark" aria-label={t('analytics.sphere')}>
        <div className="page-header__text">
          <span className="eyebrow">{t('analytics.sphere')}</span>
          <h1>{d?.product.name ?? '…'}</h1>
        </div>
        <div className="hero-line">
          <div className="kpi-pill"><span className="kpi-pill__label">{t('analytics.sphereRevenue')}</span><span className="kpi-pill__value">{d ? formatMoney(d.totals.revenue) : '…'}</span></div>
          <div className="kpi-pill"><span className="kpi-pill__label">{t('analytics.partnersInSphere')}</span><span className="kpi-pill__value">{d?.participants ?? '…'}</span></div>
          <div className="kpi-pill"><span className="kpi-pill__label">{t('analytics.directShare')}</span><span className="kpi-pill__value">{d ? pctStr(d.totals.nbs_direct_share_percent) : '…'}</span></div>
        </div>
      </section>
      <div className="grid grid--2" style={{ alignItems: 'start' }}><Ranked title={t('analytics.top')} rows={d?.top} /><Ranked title={t('analytics.lagging')} rows={d?.lagging} /></div>
      <Card white flush>
        <DataTable loading={q.isLoading} rows={d?.rows} rowKey={(m) => m.partner} emptyTitle={t('analytics.noDataTitle')} emptyText={t('analytics.changeFilters')} columns={rowCols()} />
      </Card>
      {d?.nbs_direct && <div className="hint-box">{t('analytics.nbsDirect', { name: d.nbs_direct.name, count: d.nbs_direct.sales_count, revenue: formatMoney(d.nbs_direct.revenue), discounts: formatMoney(d.nbs_direct.discounts) })}</div>}
    </div>
  )
}

function SphereCard({ code, name, sphere, color, count, amount, subscription, commission, filters }: {
  code: string; name: string; sphere: string; color?: string; count: number; amount: string; subscription: string; commission: string; filters: AFilters
}) {
  const t = useT()
  const q = useOne<SphereAnalytics>('reports/sphere-analytics/', { product: code, date_from: filters.date_from, date_to: filters.date_to })
  const d = q.data
  const active = (d?.rows ?? []).reduce((a, r) => a + r.active_subscriptions, 0)
  const overdue = (d?.rows ?? []).reduce((a, r) => a + r.overdue_subscriptions, 0)
  return (
    <Card white>
      <div className="row row--between"><strong style={{ borderLeft: `4px solid ${color ?? 'var(--turquoise)'}`, paddingLeft: 8 }}>{sphere || name}</strong><span className="muted">{t('analytics.salesCount', { n: count })}</span></div>
      <Dl items={[
        [t('analytics.revenue'), <Money value={amount} />], [t('analytics.subscription'), <Money value={subscription} />], [t('analytics.commission'), <Money value={commission} />],
        [t('analytics.subs'), d ? t('analytics.subsActOverdue', { active, overdue }) : '…'], [t('analytics.directOzok'), d ? pctStr(d.totals.nbs_direct_share_percent) : '…'],
      ]} />
    </Card>
  )
}

/** Сегмент «Собственные клиенты OZOK» (legacy + прямые продажи): reports/ozok-clients/. */
interface OzokOwn {
  clients: { total: number; legacy: number; direct: number }
  subscriptions_by_status: Record<string, number>
  mrr: string
  collected: string
  spheres: { product: number; code: string; name: string; sphere?: string; subscriptions: number; mrr: string; collected: string }[]
  share: { ozok: string; partners: string; ozok_percent: string; partners_percent: string }
}

function OzokOwnSegment({ filters }: { filters: AFilters }) {
  const t = useT()
  const q = useOne<OzokOwn>('reports/ozok-clients/', { date_from: filters.date_from, date_to: filters.date_to })
  const d = q.data
  if (q.error) return <ErrorAlert error={q.error} />
  if (!d) return null
  return (
    <>
      <h3 style={{ margin: 0 }}>{t('analytics.ownClients')}</h3>
      <div className="grid grid--kpi">
        <KpiCard icon={Users} label={t('analytics.clients')} value={formatNumber(d.clients.total)} sub={t('analytics.clientsSub', { legacy: d.clients.legacy, direct: d.clients.direct })} />
        <KpiCard icon={Repeat} label="MRR" value={<Money value={d.mrr} />} />
        <KpiCard icon={Banknote} label={t('analytics.collectedPeriod')} value={<Money value={d.collected} />} />
        <KpiCard icon={Building2} label={t('analytics.shareVs')} value={`${toNum(d.share.ozok_percent)}% / ${toNum(d.share.partners_percent)}%`} sub={t('analytics.subPeriod')} />
      </div>
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('analytics.subsByStatus')}</CardTitle></div>
          <DataTable rows={Object.entries(d.subscriptions_by_status).map(([k, n]) => ({ k, n }))} rowKey={(r) => r.k} emptyTitle={t('analytics.noData')} emptyText=" "
            columns={[{ key: 's', header: t('common.status'), render: (r) => statusLabel('subscription', r.k) }, { key: 'n', header: t('analytics.count'), align: 'right', render: (r) => r.n }]} />
        </Card>
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('analytics.bySphere')}</CardTitle></div>
          <DataTable rows={d.spheres} rowKey={(r) => r.product} emptyTitle={t('analytics.noData')} emptyText=" "
            columns={[
              { key: 'p', header: t('analytics.sphere'), render: (r) => r.sphere || r.name },
              { key: 'c', header: t('analytics.subscriptionsCol'), align: 'right', render: (r) => r.subscriptions },
              { key: 'm', header: 'MRR', align: 'right', render: (r) => <Money value={r.mrr} /> },
              { key: 'a', header: t('analytics.collected'), align: 'right', render: (r) => <Money value={r.collected} /> },
            ]} />
        </Card>
      </div>
    </>
  )
}

/** Режим «Вся сеть»: сфера за сферой, рейтинг, динамика, прямые продажи OZOK. */
export function NetworkAnalytics({ filters }: { filters: AFilters }) {
  const t = useT()
  const net = useOne<SalesReport>('reports/sales/', { date_from: filters.date_from, date_to: filters.date_to })
  const n = net.data
  return (
    <div className="stack">
      <ErrorAlert error={net.error} />
      <OzokOwnSegment filters={filters} />
      <h3 style={{ margin: 0 }}>{t('analytics.spheres')}</h3>
      <div className="grid grid--3" style={{ alignItems: 'start' }}>
        {(n?.by_product ?? []).map((p) => (
          <SphereCard key={p.product} code={p.product} name={p.name} sphere={p.sphere} color={p.color} count={p.count} amount={p.amount} subscription={p.subscription_amount} commission={p.commission} filters={filters} />
        ))}
      </div>
      <h3 style={{ margin: 0 }}>{t('analytics.partners')}</h3>
      <Card white flush>
        <DataTable loading={net.isLoading} rows={n?.by_franchisee} rowKey={(m) => m.franchisee_id} emptyTitle={t('analytics.noDataTitle')} emptyText={t('analytics.changePeriod')}
          columns={[
            { key: 'n', header: t('analytics.partner'), render: (m) => <strong>{m.name}</strong> },
            { key: 'c', header: t('analytics.sales'), align: 'right', render: (m) => m.count },
            { key: 'a', header: t('analytics.revenue'), align: 'right', render: (m) => <Money value={m.amount} /> },
            { key: 'cm', header: t('analytics.commission'), align: 'right', render: (m) => <Money value={m.commission} /> },
            { key: 'w', header: t('analytics.withheld'), align: 'right', render: (m) => <Money value={m.withheld ?? 0} /> },
            { key: 'i', header: t('analytics.income'), align: 'right', render: (m) => <Money value={m.net_income ?? m.income ?? 0} /> },
          ]} />
      </Card>
      {monthChart(n?.by_month.map((m) => ({ month: m.month, revenue: m.amount })))}
    </div>
  )
}

/** Старый адрес /analytics: редирект на единый экран с теми же параметрами. */
export default function AnalyticsRedirect() {
  const loc = useLocation()
  return <Navigate to={`/${loc.search}`} replace />
}
