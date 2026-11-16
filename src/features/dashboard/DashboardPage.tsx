import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useIsHq } from '../common/useAct'
import {
  AlertTriangle, Banknote, Building2, ClipboardList, GraduationCap, LifeBuoy, ListChecks, Inbox, Trophy, Users, Wallet,
  CalendarClock, Target, UserPlus, TrendingUp, HandCoins, Repeat, Plug,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useOne } from '../../api/hooks'
import type { FrDashboard, HqDashboard, RevenuePoint } from '../../api/types'
import { useUser } from '../../app/hooks'
import { Badge, Button, Card, CardTitle, DataTable, ErrorAlert, KpiCard, Money, Bar as ProgressBar, Select, Tabs, planTone, pct, ratingTone } from '../../components/ui'
import { compactMoney, formatMoney, formatNumber, monthLabel, shortMonth, toISODate, toNum } from '../../lib/format'
import { STATUS } from '../../lib/status'
import { FilterBar, NetworkAnalytics, PartnerAnalyticsView, SphereView, defaultFilters } from '../analytics/Analytics'
import type { AFilters } from '../analytics/Analytics'
import { FranchiseeSelect, useProducts } from '../common/pickers'
import RoleDashboard from './RoleDashboards'
import { CHART, CHART_TICK, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { t, useT } from '../../i18n'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return t('dashboard.greetNight')
  if (h < 12) return t('dashboard.greetMorning')
  if (h < 18) return t('dashboard.greetDay')
  return t('dashboard.greetEvening')
}

function RevenueChart({ data, loading }: { data?: RevenuePoint[]; loading: boolean }) {
  const t = useT()
  const chart = useMemo(() => (data ?? []).map((d) => ({ month: d.month, revenue: toNum(d.revenue) })), [data])
  return (
    <Card white>
      <CardTitle>{t('dashboard.revenue6')}</CardTitle>
      <div className="chart-box" role="img" aria-label={t('dashboard.chartAria')}>
        {loading ? <span className="skeleton" style={{ height: 300 }} /> : chart.length === 0 ? (
          <div className="empty"><h3>{t('dashboard.noData')}</h3><p>{t('dashboard.noClientSales')}</p></div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="month" tickFormatter={shortMonth} tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
              <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={CHART_TICK} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v) => [formatMoney(Number(v)), t('dashboard.revenue')]} labelFormatter={(l) => monthLabel(String(l))} contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: CHART.cursor }} />
              <Bar dataKey="revenue" fill={CHART.c1} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

const FUNNEL = ['new', 'in_progress', 'demo', 'proposal', 'contract', 'paid', 'lost']

function Funnel({ leads }: { leads?: Record<string, number> }) {
  const t = useT()
  const max = Math.max(1, ...FUNNEL.map((k) => leads?.[k] ?? 0))
  return (
    <Card white>
      <CardTitle actions={<Link to="/leads" className="link-strong">{t('dashboard.allLeads')}</Link>}>{t('dashboard.funnel')}</CardTitle>
      <div className="funnel">
        {FUNNEL.map((k) => {
          const s = STATUS.lead[k]
          return (
            <div className="funnel__row" key={k}>
              <span className="row" style={{ gap: 6 }}><s.icon size={16} aria-hidden />{s.label}</span>
              <ProgressBar value={(leads?.[k] ?? 0) / max} tone={s.tone} />
              <strong>{leads?.[k] ?? 0}</strong>
            </div>
          )
        })}
      </div>
      {!!leads && (
        <div className="row" style={{ marginTop: 16 }}>
          {!!leads.overdue && <Badge tone="error" icon={AlertTriangle}>{t('dashboard.overdueN', { n: leads.overdue })}</Badge>}
          {!!leads.unassigned && <Link to="/leads?unassigned=1"><Badge tone="warning" icon={Inbox}>{t('dashboard.unassignedN', { n: leads.unassigned })}</Badge></Link>}
        </div>
      )}
    </Card>
  )
}

function HqView({ month }: { month: string }) {
  const t = useT()
  const navigate = useNavigate()
  const user = useUser()
  const { data, isLoading, error } = useOne<HqDashboard>('dashboard/', { month })
  const active = data?.franchisees?.franchisee ?? 0
  const ATT: Record<string, string> = {
    overdue_payment: t('dashboard.att.overdue_payment'), sla: t('dashboard.att.sla'), overdue_task: t('dashboard.att.overdue_task'), overdue_lead: t('dashboard.att.overdue_lead'), expired_cert: t('dashboard.att.expired_cert'),
  }
  return (
    <div className="stack">
      <section className="hero on-dark" aria-label={t('dashboard.networkSummaryAria')}>
        <div className="row row--between" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div className="page-header__text">
            <span className="eyebrow">{t('dashboard.hqEyebrow', { month: monthLabel(month) })}</span>
            <h1>{greeting()}, {user?.first_name || t('dashboard.colleague')}</h1>
            <p style={{ color: 'var(--on-dark)' }}>{t('dashboard.hqSub')}</p>
          </div>
        </div>
        <div className="hero-line">
          <div className="kpi-pill"><span className="kpi-pill__label">{t('dashboard.activeFr')}</span><span className="kpi-pill__value">{data ? active : '…'}</span></div>
          <div className="kpi-pill"><span className="kpi-pill__label">{t('dashboard.networkRevenue')}</span><span className="kpi-pill__value">{data ? formatMoney(data.network_revenue) : '…'}</span></div>
          <div className="kpi-pill"><span className="kpi-pill__label">{t('dashboard.networkDebt')}</span><span className="kpi-pill__value">{data ? formatMoney(data.receivables) : '…'}</span></div>
        </div>
      </section>

      <ErrorAlert error={error} />

      <div className="grid grid--kpi">
        <KpiCard icon={Building2} label={t('dashboard.franchisees')} value={data ? formatNumber(Object.values(data.franchisees ?? {}).reduce((a, b) => a + b, 0), 0) : '…'}
          sub={data ? t('dashboard.frSub', { trainee: data.franchisees?.trainee ?? 0, manager: data.franchisees?.manager ?? 0, candidate: data.franchisees?.candidate ?? 0, suspended: data.franchisees?.suspended ?? 0 }) : undefined} />
        <KpiCard icon={UserPlus} label={t('dashboard.newClients')} value={data ? data.new_clients : '…'} sub={t('dashboard.perMonth')} />
        <KpiCard icon={AlertTriangle} label={t('dashboard.overdueDebt')} value={data ? <Money value={data.overdue_receivables} /> : '…'} />
        <KpiCard icon={Wallet} label={t('dashboard.frIncomeMonth')} value={data ? <Money value={data.network_income_month ?? 0} /> : '…'} sub={data?.withheld_month != null ? t('dashboard.withheldSub', { v: formatMoney(data.withheld_month) }) : undefined} />
        <KpiCard icon={Banknote} label={t('dashboard.paymentsMonth')} value={data ? <Money value={data.payments_month} /> : '…'} />
        <KpiCard icon={LifeBuoy} label={t('dashboard.openTickets')} value={data ? data.open_tickets : '…'} sub={data ? t('dashboard.slaBreachedN', { n: data.sla_breached }) : undefined} />
        <KpiCard icon={ListChecks} label={t('dashboard.overdueTasks')} value={data ? data.overdue_tasks : '…'} />
        <KpiCard icon={GraduationCap} label={t('dashboard.trained')} value={data ? pct(data.trained_share) : '…'} sub={t('dashboard.trainedShare')} />
        <KpiCard icon={HandCoins} label={t('dashboard.frReward')} value={data ? <Money value={data.commission_month ?? 0} /> : '…'} sub={t('dashboard.accruedMonth')} />
        <KpiCard icon={Repeat} label={t('dashboard.clientSubs')} value={data?.subscriptions?.active ?? '…'} sub={data?.subscriptions ? t('dashboard.renewSub', { renewal: data.subscriptions.renewal_soon, expired: data.subscriptions.expired }) : undefined} />
        {!!data?.unmatched_events && (
          <Link to="/integrations" style={{ textDecoration: 'none', color: 'inherit' }}>
            <KpiCard icon={Plug} label={t('dashboard.unmatched')} value={data.unmatched_events} sub={t('dashboard.unmatchedSub')} />
          </Link>
        )}
      </div>

      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Funnel leads={data?.leads} />
        <RevenueChart data={data?.revenue_by_month} loading={isLoading} />
      </div>

      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}>
            <CardTitle actions={<Link to="/plans" className="link-strong">{t('common.details')}</Link>}><span className="row"><Trophy size={20} aria-hidden /> {t('dashboard.networkRating')}</span></CardTitle>
          </div>
          <DataTable
            loading={isLoading} rows={data?.rating} rowKey={(r) => r.franchisee_id}
            onRowClick={(r) => navigate(`/franchisees/${r.franchisee_id}`)}
            emptyTitle={t('dashboard.ratingEmpty')} emptyText={t('dashboard.noActiveFr')}
            columns={[
              { key: 'p', header: '#', width: '48px', render: (r) => <strong>{r.place}</strong> },
              { key: 'n', header: t('dashboard.franchisees'), render: (r) => <div><strong>{r.name}</strong><div className="muted" style={{ fontSize: 12 }}>{r.city}</div></div> },
              { key: 'pl', header: t('dashboard.plan'), render: (r) => <Badge tone={planTone(r.plan_percent)} small>{pct(r.plan_percent)}</Badge> },
              { key: 'r', header: t('dashboard.rating'), align: 'right', render: (r) => <Badge tone={ratingTone(r.rating)} small>{r.rating}</Badge> },
            ]}
          />
        </Card>
        <Card white>
          <CardTitle><span className="row"><AlertTriangle size={20} color="var(--warning)" aria-hidden /> {t('dashboard.needsAttention')}</span></CardTitle>
          {isLoading ? <span className="skeleton" style={{ height: 120 }} /> : !data?.attention?.length ? (
            <div className="empty"><h3>{t('dashboard.allGood')}</h3><p>{t('dashboard.noOverdue')}</p></div>
          ) : (
            <div className="attention">
              {data.attention.map((a, i) => (
                <Link key={i} to={`/franchisees/${a.franchisee_id}`} className="attention__item" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <Badge tone={a.type === 'overdue_payment' || a.type === 'sla' ? 'error' : 'warning'} small>{ATT[a.type] ?? a.type}</Badge>
                  <span><strong>{a.franchisee_name}</strong> · {a.text}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function FrView({ month, filters }: { month: string; filters: AFilters }) {
  const t = useT()
  const user = useUser()
  const { data, isLoading, error } = useOne<FrDashboard>('dashboard/', { month })
  const plan = data?.plan
  const lead = (k: string) => data?.leads?.[k] ?? 0
  const task = (k: string) => data?.tasks?.[k] ?? 0
  return (
    <div className="stack">
      <section className="hero on-dark" aria-label={t('dashboard.summaryAria')}>
        <div className="row row--between" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div className="page-header__text">
            <span className="eyebrow">{t('dashboard.frEyebrow', { month: monthLabel(month) })}</span>
            <h1>{greeting()}, {user?.first_name || t('dashboard.colleague')}</h1>
            <p style={{ color: 'var(--on-dark)' }}>{t('dashboard.frSubtitle', { name: user?.franchisee?.name ?? '' })}</p>
          </div>
        </div>
        <div className="hero-line">
          <div className="kpi-pill"><span className="kpi-pill__label">{t('dashboard.rating')}</span><span className="kpi-pill__value">{data?.rating ?? '—'}{data?.place ? t('dashboard.ratingPlace', { place: data.place, size: data.network_size }) : ''}</span></div>
          <div className="kpi-pill"><span className="kpi-pill__label">{t('dashboard.planExec')}</span><span className="kpi-pill__value">{data ? pct(plan?.plan_percent) : '…'}</span></div>
          {(!data || data.balance != null) && <div className="kpi-pill"><span className="kpi-pill__label">{t('dashboard.debtToOzok')}</span><span className="kpi-pill__value">{data ? formatMoney(data.balance) : '…'}</span></div>}
        </div>
      </section>

      <ErrorAlert error={error} />

      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Card white>
          <CardTitle><span className="row"><Target size={20} aria-hidden /> {t('dashboard.planMonth')}</span></CardTitle>
          {isLoading ? <span className="skeleton" style={{ height: 80 }} /> : !plan ? (
            <p className="muted">{t('dashboard.noPlan')}</p>
          ) : (
            <div className="stack">
              <div>
                <div className="row row--between"><span>{t('dashboard.newClients')}</span><strong>{t('dashboard.ofN', { a: plan.fact_clients, b: plan.target_clients })}</strong></div>
                <ProgressBar value={plan.target_clients ? plan.fact_clients / plan.target_clients : 0} tone={planTone(plan.plan_percent)} />
              </div>
              <div>
                <div className="row row--between"><span>{t('dashboard.revenue')}</span><strong>{t('dashboard.ofN', { a: formatMoney(plan.fact_revenue), b: formatMoney(plan.target_revenue) })}</strong></div>
                <ProgressBar value={toNum(plan.target_revenue) ? toNum(plan.fact_revenue) / toNum(plan.target_revenue) : 0} tone={planTone(plan.plan_percent)} />
              </div>
            </div>
          )}
        </Card>
        <Card white>
          <CardTitle actions={<Link to="/leads" className="link-strong">{t('dashboard.leadsLink')}</Link>}><span className="row"><Inbox size={20} aria-hidden /> {t('dashboard.myLeads')}</span></CardTitle>
          <div className="row" style={{ gap: 12 }}>
            <Badge tone="warning" icon={STATUS.lead.assigned.icon}>{t('dashboard.leadNew', { n: lead('assigned') })}</Badge>
            <Badge tone="info" icon={STATUS.lead.in_progress.icon}>{t('dashboard.leadWork', { n: lead('in_progress') })}</Badge>
            <Badge tone="info" icon={STATUS.lead.demo.icon}>{t('dashboard.leadDemo', { n: lead('demo') })}</Badge>
            {lead('overdue') > 0 && <Badge tone="error" icon={AlertTriangle}>{t('dashboard.overdueN', { n: lead('overdue') })}</Badge>}
          </div>
        </Card>
      </div>

      <div className="grid grid--kpi">
        <KpiCard icon={Users} label={t('dashboard.clients')} value={data?.clients_total ?? '…'} sub={data ? t('dashboard.renewSub', { renewal: data.renewal_soon, expired: data.expired }) : undefined} />
        {(!data || data.balance != null) && <KpiCard icon={Wallet} label={t('dashboard.balance')} value={data ? <Money value={data.balance} /> : '…'} sub={data?.overdue_amount != null ? t('dashboard.overdueAmt', { v: formatMoney(data.overdue_amount) }) : undefined} />}
        <KpiCard icon={LifeBuoy} label={t('dashboard.openTickets')} value={data?.open_tickets ?? '…'} sub={data ? t('dashboard.slaBreachedN', { n: data.sla_breached }) : undefined} />
        <KpiCard icon={ClipboardList} label={t('dashboard.tasks')} value={data ? task('new') + task('in_progress') : '…'} sub={data ? t('dashboard.tasksSub', { new: task('new'), work: task('in_progress'), overdue: task('overdue') }) : undefined} />
        <KpiCard icon={GraduationCap} label={t('dashboard.trained')} value={data ? pct(data.trained_share) : '…'} sub={t('dashboard.trainedShare')} />
        {data?.income_month != null && <KpiCard icon={HandCoins} label={t('dashboard.incomeMonth')} value={<Money value={data.income_month} />} sub={data.withheld_month != null ? t('dashboard.withheldSub', { v: formatMoney(data.withheld_month) }) : undefined} />}
        <KpiCard icon={CalendarClock} label={t('dashboard.renewal')} value={data?.renewal_soon ?? '…'} sub={t('dashboard.renewalSub')} />
        {(!data || data.commission_due != null) && <KpiCard icon={HandCoins} label={t('dashboard.ozokOwes')} value={data ? <Money value={data.commission_due} /> : '…'} sub={data?.commission_month != null ? t('dashboard.rewardMonth', { v: formatMoney(data.commission_month) }) : undefined} />}
        <KpiCard icon={Repeat} label={t('dashboard.clientSubs')} value={data?.subscriptions?.active ?? '…'} sub={data?.subscriptions ? t('dashboard.subsExpired', { n: data.subscriptions.expired }) : undefined} />
      </div>

      <RevenueChart data={data?.revenue_by_month} loading={isLoading} />
      <h3 style={{ margin: 0 }}>{t('dashboard.myAnalytics')}</h3>
      <PartnerAnalyticsView partner="" filters={filters} />
      <p className="muted" style={{ fontSize: 13 }}><TrendingUp size={14} style={{ display: 'inline', verticalAlign: '-2px' }} aria-hidden /> {t('dashboard.ratingNote')}</p>
    </div>
  )
}

const ROLE_DASH = new Set(['recruiter', 'regional_support', 'implementer', 'quality'])

type Mode = 'network' | 'sphere' | 'partner'
const modes = (): { value: Mode; label: string }[] => [{ value: 'network', label: t('dashboard.modeNetwork') }, { value: 'sphere', label: t('dashboard.modeSphere') }, { value: 'partner', label: t('dashboard.modePartner') }]

/** Фильтры экрана живут в URL: ?mode=&date_from=&date_to=&region=&status=&tier=&lead_source=&product=&partner= */
function useScreenFilters() {
  const [sp, setSp] = useSearchParams()
  const def = defaultFilters()
  const f: AFilters = {
    date_from: sp.get('date_from') ?? def.date_from, date_to: sp.get('date_to') ?? def.date_to, region: sp.get('region') ?? '',
    status: sp.get('status') ?? sp.get('partner_status') ?? '', tier: sp.get('tier') ?? '', lead_source: sp.get('lead_source') ?? '',
  }
  const mode = (sp.get('mode') as Mode) || 'network'
  const set = (k: string, v: string) => setSp((prev) => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })
  const preset = (kind: 'month' | 'prev' | 'quarter') => {
    const d = new Date()
    const from = kind === 'month' ? new Date(d.getFullYear(), d.getMonth(), 1) : kind === 'prev' ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : new Date(d.getFullYear(), d.getMonth() - 2, 1)
    const to = kind === 'prev' ? new Date(d.getFullYear(), d.getMonth(), 0) : d
    setSp((prev) => { const n = new URLSearchParams(prev); n.set('date_from', toISODate(from)); n.set('date_to', toISODate(to)); return n }, { replace: true })
  }
  return { f, mode, set, preset, product: sp.get('product') ?? '', partner: sp.get('partner') ?? '' }
}

function NetworkDashboard() {
  const t = useT()
  const user = useUser()
  const hq = useIsHq()
  const products = useProducts()
  const { f, mode, set, preset, product, partner } = useScreenFilters()
  if (!user) return null
  const month = f.date_to.slice(0, 7)
  const bar = (
    <div className="stack" style={{ gap: 8 }}>
      <FilterBar f={f} set={(k, v) => set(k, v)} full={hq && mode === 'sphere'}>
        {hq && mode === 'sphere' && <Select label={t('dashboard.sphere')} placeholder={t('dashboard.pickSphere')} options={products.map((p) => ({ value: p.code, label: p.sphere || p.name }))} value={product} onChange={(e) => set('product', e.target.value)} />}
        {hq && mode === 'partner' && <FranchiseeSelect label={t('dashboard.partner')} value={partner} onChange={(v) => set('partner', v)} />}
      </FilterBar>
      <div className="row" style={{ gap: 8 }}>
        <Button size="sm" variant="secondary" onClick={() => preset('month')}>{t('dashboard.thisMonth')}</Button>
        <Button size="sm" variant="secondary" onClick={() => preset('prev')}>{t('dashboard.prevMonth')}</Button>
        <Button size="sm" variant="secondary" onClick={() => preset('quarter')}>{t('dashboard.quarter')}</Button>
      </div>
    </div>
  )
  return (
    <div className="page">
      {hq && <Tabs<Mode> tabs={modes()} value={mode} onChange={(m) => set('mode', m === 'network' ? '' : m)} />}
      {bar}
      {!hq ? <FrView month={month} filters={f} /> : mode === 'network' ? (
        <>
          <HqView month={month} />
          <NetworkAnalytics filters={f} />
        </>
      ) : mode === 'sphere' ? <SphereView sphere={product} filters={f} /> : (partner ? <PartnerAnalyticsView partner={partner} filters={f} /> : <p className="muted">{t('dashboard.pickPartner')}</p>)}
    </div>
  )
}

/** Роли без общего дашборда (recruiter / regional_support / implementer / quality) получают простой payload со `scope`;
 *  выбор делается до хуков общего дашборда, чтобы не дёргать недоступные им ресурсы (products/ и т. п.). */
export default function DashboardPage() {
  const user = useUser()
  if (!user) return null
  return ROLE_DASH.has(user.role) ? <RoleDashboard /> : <NetworkDashboard />
}
