import { Link } from 'react-router-dom'
import { Award, Banknote, ClipboardCheck, LifeBuoy, MapPin, Rocket, ShieldAlert, Star, Users } from 'lucide-react'
import { useOne } from '../../api/hooks'
import { Card, CardTitle, DataTable, ErrorAlert, KpiCard, Money, PageHeader } from '../../components/ui'
import { formatDate, formatNumber, monthLabel } from '../../lib/format'
import { FUNNEL_STAGES, statusLabel } from '../../lib/status'
import { t, useT } from '../../i18n'

/** Форма ответа dashboard/ для recruiter / regional_support / implementer / quality (backend dashboard/roles.py). */
interface RecruiterDash {
  scope: 'recruiter'; month: string; partners_total: number; funnel: Record<string, number>; by_status: Record<string, number>
  rewards_count: number; rewards_amount: Record<string, string>
  rewards: { id: number; partner: number; partner_name: string; status: string; accrued_amount: string; target_amount: string }[]
}
interface RegionalDash {
  scope: 'regional_support'; month?: string; region: string; clients_total: number
  subscriptions: Record<string, number>; installations: Record<string, number>; tickets: { open?: number; sla_breached?: number }
}
interface ImplementerDash {
  scope: 'implementer'; month: string; installations: Record<string, number>; accruals: Record<string, string>
  upcoming: { id: number; client: string; deadline: string | null; status: string }[]
}
interface QualityDash {
  scope: 'quality'; month: string; audits_count: number; audits_avg_score: number; audits_low: number; complaints: number
  tickets_open: number; tickets_sla_breached: number; low_rated: number
}
type RoleDash = RecruiterDash | RegionalDash | ImplementerDash | QualityDash

const instStatus = (k: string): string => {
  const m: Record<string, string> = {
    assigned: t('dashboard.role.inst.assigned'), in_progress: t('dashboard.role.inst.in_progress'), training: t('dashboard.role.inst.training'), awaiting_act: t('dashboard.role.inst.awaiting_act'),
    done: t('dashboard.role.inst.done'), cancelled: t('dashboard.role.inst.cancelled'), overdue: t('dashboard.role.inst.overdue'),
  }
  return m[k] ?? k
}
const accrualStatus = (k: string): string => {
  const m: Record<string, string> = { accrued: t('dashboard.role.acc.accrued'), verified: t('dashboard.role.acc.verified'), paid: t('dashboard.role.acc.paid') }
  return m[k] ?? k
}
const rewardStatus = (k: string): string => {
  const m: Record<string, string> = { accruing: t('dashboard.role.rew.accruing'), accrued: t('dashboard.role.acc.accrued'), verified: t('dashboard.role.acc.verified'), paid: t('dashboard.role.acc.paid') }
  return m[k] ?? k
}
const partnerStatus = (k: string): string => {
  const m: Record<string, string> = { pending: t('dashboard.role.ps.pending'), active: t('dashboard.role.ps.active'), suspended: t('dashboard.role.ps.suspended'), closed: t('dashboard.role.ps.closed') }
  return m[k] ?? k
}

function Counts({ title, data, labels }: { title: string; data: Record<string, number>; labels: (k: string) => string }) {
  const t = useT()
  const rows = Object.entries(data ?? {}).map(([k, n]) => ({ k, label: labels(k), n }))
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle>{title}</CardTitle></div>
      <DataTable rows={rows} rowKey={(r) => r.k} emptyTitle={t('dashboard.role.noData')} emptyText=" "
        columns={[{ key: 'l', header: t('common.status'), render: (r) => r.label }, { key: 'n', header: t('dashboard.role.count'), align: 'right', render: (r) => formatNumber(r.n) }]} />
    </Card>
  )
}

const stageLabel = (k: string) => FUNNEL_STAGES[k] ?? k

function Recruiter({ d }: { d: RecruiterDash }) {
  const t = useT()
  return (
    <>
      <div className="grid grid--kpi">
        <KpiCard icon={Users} label={t('dashboard.role.myPartners')} value={formatNumber(d.partners_total)} />
        <KpiCard icon={Award} label={t('dashboard.role.rewardsCount')} value={formatNumber(d.rewards_count)} />
        {Object.entries(d.rewards_amount ?? {}).map(([k, v]) => <KpiCard key={k} icon={Banknote} label={rewardStatus(k)} value={<Money value={v} />} />)}
      </div>
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Counts title={t('dashboard.role.partnerFunnel')} data={d.funnel} labels={stageLabel} />
        <Counts title={t('dashboard.role.partnersByStatus')} data={d.by_status} labels={(k) => partnerStatus(k)} />
      </div>
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('dashboard.role.rewards')}</CardTitle></div>
        <DataTable rows={d.rewards} rowKey={(r) => r.id} emptyTitle={t('dashboard.role.noRewards')} emptyText=" "
          columns={[
            { key: 'p', header: t('dashboard.role.partner'), render: (r) => r.partner_name },
            { key: 's', header: t('common.status'), render: (r) => rewardStatus(r.status) },
            { key: 'a', header: t('dashboard.role.accumulated'), align: 'right', render: (r) => <Money value={r.accrued_amount} /> },
            { key: 't', header: t('dashboard.role.target'), align: 'right', render: (r) => <Money value={r.target_amount} /> },
          ]} />
      </Card>
      <p><Link to="/recruiters">{t('dashboard.role.allRewards')}</Link></p>
    </>
  )
}

function Regional({ d }: { d: RegionalDash }) {
  const t = useT()
  return (
    <>
      <div className="grid grid--kpi">
        <KpiCard icon={MapPin} label={t('common.region')} value={d.region || t('dashboard.role.regionNotSet')} sub={d.region ? undefined : t('dashboard.role.noRegionData')} />
        <KpiCard icon={Users} label={t('dashboard.role.clientsInRegion')} value={formatNumber(d.clients_total)} />
        <KpiCard icon={LifeBuoy} label={t('dashboard.role.openTickets')} value={formatNumber(d.tickets?.open ?? 0)} sub={t('dashboard.role.slaOverdue', { n: d.tickets?.sla_breached ?? 0 })} />
        <KpiCard icon={Rocket} label={t('dashboard.role.instOverdue')} value={formatNumber(d.installations?.overdue ?? 0)} />
      </div>
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Counts title={t('dashboard.role.subsByStatus')} data={d.subscriptions} labels={(k) => statusLabel('subscription', k)} />
        <Counts title={t('dashboard.role.instByStage')} data={d.installations} labels={(k) => instStatus(k)} />
      </div>
    </>
  )
}

function Implementer({ d }: { d: ImplementerDash }) {
  const t = useT()
  return (
    <>
      <div className="grid grid--kpi">
        <KpiCard icon={Rocket} label={t('dashboard.role.overdue')} value={formatNumber(d.installations?.overdue ?? 0)} />
        {Object.entries(d.accruals ?? {}).map(([k, v]) => <KpiCard key={k} icon={Banknote} label={t('dashboard.role.payment', { status: accrualStatus(k) })} value={<Money value={v} />} />)}
      </div>
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Counts title={t('dashboard.role.myInst')} data={d.installations} labels={(k) => instStatus(k)} />
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('dashboard.role.upcoming')}</CardTitle></div>
          <DataTable rows={d.upcoming} rowKey={(r) => r.id} emptyTitle={t('dashboard.role.noInst')} emptyText=" "
            columns={[
              { key: 'c', header: t('dashboard.role.client'), render: (r) => r.client },
              { key: 'd', header: t('dashboard.role.deadline'), render: (r) => formatDate(r.deadline) },
              { key: 's', header: t('common.status'), render: (r) => instStatus(r.status) },
            ]} />
        </Card>
      </div>
      <p><Link to="/installations">{t('dashboard.role.allInst')}</Link></p>
    </>
  )
}

function Quality({ d }: { d: QualityDash }) {
  const t = useT()
  return (
    <div className="grid grid--kpi">
      <KpiCard icon={ClipboardCheck} label={t('dashboard.role.auditsMonth')} value={formatNumber(d.audits_count)} sub={t('dashboard.role.avgScore', { n: d.audits_avg_score })} />
      <KpiCard icon={ShieldAlert} label={t('dashboard.role.auditsLow')} value={formatNumber(d.audits_low)} />
      <KpiCard icon={LifeBuoy} label={t('dashboard.role.complaints')} value={formatNumber(d.complaints)} sub={t('dashboard.role.lowRated', { n: d.low_rated })} />
      <KpiCard icon={Star} label={t('dashboard.role.openTickets')} value={formatNumber(d.tickets_open)} sub={t('dashboard.role.slaOverdue', { n: d.tickets_sla_breached })} />
    </div>
  )
}

const titles = (): Record<string, string> => ({ recruiter: t('dashboard.role.t.recruiter'), regional_support: t('dashboard.role.t.regional_support'), implementer: t('dashboard.role.t.implementer'), quality: t('dashboard.role.t.quality') })

/** Простой дашборд роли без общего дашборда: форма ответа определяется полем `scope`. */
export default function RoleDashboard() {
  const t = useT()
  const q = useOne<RoleDash>('dashboard/')
  const d = q.data
  return (
    <div className="page">
      <PageHeader eyebrow={d?.month ? monthLabel(d.month) : t('dashboard.role.main')} title={d ? t('dashboard.role.titleScope', { scope: titles()[d.scope] ?? '' }) : t('dashboard.role.title')} />
      <ErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">{t('common.loading')}</p>}
      {d?.scope === 'recruiter' && <Recruiter d={d} />}
      {d?.scope === 'regional_support' && <Regional d={d} />}
      {d?.scope === 'implementer' && <Implementer d={d} />}
      {d?.scope === 'quality' && <Quality d={d} />}
    </div>
  )
}
