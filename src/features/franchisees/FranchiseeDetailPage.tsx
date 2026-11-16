import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, HandCoins, Pencil, Trophy, Wallet } from 'lucide-react'
import { useOne } from '../../api/hooks'
import type { FranchiseeSummary } from '../../api/types'
import {
  ActiveChip, Badge, Button, Card, CardTitle, DataTable, ErrorAlert, KpiCard, Money, PageHeader, StatusChip, Tabs, Bar, pct, planTone, ratingTone,
} from '../../components/ui'
import { formatDate, formatMoney, formatPhone, toNum } from '../../lib/format'
import { ROLES } from '../../lib/status'
import { useCan } from '../common/useAct'
import { ClientsList } from '../clients/ClientsPage'
import { ContractsList } from '../contracts/ContractsPage'
import { LeadsList } from '../leads/LeadsPage'
import { AuditsList, TicketsList } from '../quality/QualityPage'
import { MoneyTabs } from '../settlements/SettlementsPage'
import { TasksList } from '../tasks/TasksPage'
import { EnrollmentsList } from '../training/TrainingPage'
import { FranchiseeForm } from './FranchiseesPage'
import { PartnerProfileCard, StatusHistory, TierBadge, TierModal } from './PartnerParts'
import { CloseWizard } from './CloseWizard'
import { PartnerAnalyticsView } from '../analytics/Analytics'
import { HistoryTab, ReasonModal } from '../common/shared'
import { useAct } from '../common/useAct'
import { useT } from '../../i18n'

type Tab = 'overview' | 'analytics' | 'history' | 'contracts' | 'clients' | 'leads' | 'money' | 'training' | 'quality' | 'tasks' | 'staff'

const TAB_KEYS: Tab[] = ['overview', 'analytics', 'history', 'contracts', 'clients', 'leads', 'money', 'training', 'quality', 'tasks', 'staff']

export default function FranchiseeDetailPage() {
  const t = useT()
  const TABS = TAB_KEYS.map((value) => ({ value, label: t(`franchisees.tab.${value}`) }))
  const { id } = useParams()
  const fid = Number(id)
  const canWrite = useCan('franchisees')
  const canStatus = useCan('partnerStatus')
  const canClose = useCan('franchiseeClose')
  const canReopen = useCan('franchiseeReopen')
  const { act } = useAct()
  const [tierOpen, setTierOpen] = useState(false)
  const [statusDlg, setStatusDlg] = useState<'suspend' | 'close' | 'reactivate' | 'reopen' | null>(null)
  const { data, isLoading, error } = useOne<FranchiseeSummary>(`franchisees/${id}/summary/`)
  const [tab, setTab] = useState<Tab>('overview')
  const [edit, setEdit] = useState(false)
  const [qTab, setQTab] = useState<'t' | 'a'>('t')
  const fr = data?.franchisee
  const plan = data?.plan

  return (
    <div className="page">
      <Link to="/franchisees" className="row link-strong"><ArrowLeft size={16} aria-hidden /> {t('franchisees.allPartners')}</Link>
      <ErrorAlert error={error} />
      {isLoading && <span className="skeleton" style={{ height: 90 }} />}
      {fr && (
        <>
          <PageHeader eyebrow={`${fr.city}${fr.partner_code ? ` · ${fr.partner_code}` : ''}`} title={fr.name} actions={(canWrite || canStatus || canClose || canReopen) && (
            <>
              {canStatus && fr.status === 'franchisee' && <Button variant="secondary" onClick={() => setTierOpen(true)}>Standard / Growth</Button>}
              {canStatus && ['franchisee', 'manager', 'trainee', 'active'].includes(fr.status) && <Button variant="secondary" onClick={() => setStatusDlg('suspend')}>{t('franchisees.suspend')}</Button>}
              {canStatus && fr.status === 'suspended' && <Button variant="secondary" onClick={() => setStatusDlg('reactivate')}>{t('franchisees.reactivate')}</Button>}
              {canReopen && fr.status === 'closed' && <Button variant="secondary" onClick={() => setStatusDlg('reopen')}>{t('franchisees.reactivate')}</Button>}
              {canClose && !['closed', 'terminated'].includes(fr.status) && <Button variant="danger" onClick={() => setStatusDlg('close')}>{t('franchisees.closeCoop')}</Button>}
              {canWrite && <Button variant="secondary" icon={Pencil} onClick={() => setEdit(true)}>{t('common.edit')}</Button>}
            </>
          )}>
            <div className="row">
              <StatusChip kind="franchisee" status={fr.status} />
              {fr.status === 'franchisee' && <TierBadge tier={fr.tier} />}
              {fr.tier_effective_from && <span className="muted">{t('franchisees.since', { date: formatDate(fr.tier_effective_from) })}</span>}
              {fr.region && <span className="muted">{fr.region}</span>}
              {fr.curator_name && <span className="muted">{t('franchisees.curatorLine', { name: fr.curator_name })}</span>}
              {data?.rating != null && <Badge tone={ratingTone(data.rating)} icon={Trophy}>{t('franchisees.ratingLine', { rating: data.rating })}{data.place ? t('franchisees.placeLine', { place: data.place }) : ''}</Badge>}
            </div>
          </PageHeader>
          <Tabs<Tab> tabs={TABS} value={tab} onChange={setTab} />

          {tab === 'overview' && data && (
            <div className="stack">
              <div className="grid grid--kpi">
                {data.balance != null && <KpiCard icon={Wallet} label={t('franchisees.debt')} value={<Money value={data.balance} />} sub={data.overdue_amount != null ? t('franchisees.overdueSub', { amount: formatMoney(data.overdue_amount) }) : undefined} />}
                {data.commission_due != null && <KpiCard icon={HandCoins} label={t('franchisees.owes')} value={<Money value={data.commission_due} />} sub={data.commission_month != null ? t('franchisees.commissionMonth', { amount: formatMoney(data.commission_month) }) : undefined} />}
                <KpiCard icon={Trophy} label={t('franchisees.planMonth')} value={pct(plan?.plan_percent)} sub={plan ? t('franchisees.planClients', { fact: plan.fact_clients, target: plan.target_clients }) : t('franchisees.planNotSet')} />
              </div>
              <div className="grid grid--2" style={{ alignItems: 'start' }}>
                <PartnerProfileCard fr={fr} />
                <Card white>
                  <CardTitle>{t('franchisees.planAndSales')}</CardTitle>
                  {plan ? (
                    <div className="stack">
                      <div><div className="row row--between"><span>{t('franchisees.newClients')}</span><strong>{t('franchisees.ofTotal', { fact: plan.fact_clients, target: plan.target_clients })}</strong></div><Bar value={plan.target_clients ? plan.fact_clients / plan.target_clients : 0} tone={planTone(plan.plan_percent)} /></div>
                      <div><div className="row row--between"><span>{t('franchisees.revenue')}</span><strong>{t('franchisees.ofTotal', { fact: formatMoney(plan.fact_revenue), target: formatMoney(plan.target_revenue) })}</strong></div><Bar value={toNum(plan.target_revenue) ? toNum(plan.fact_revenue) / toNum(plan.target_revenue) : 0} tone={planTone(plan.plan_percent)} /></div>
                    </div>
                  ) : <p className="muted">{t('franchisees.planMonthEmpty')}</p>}
                  {!!data.sales_by_product?.length && (
                    <div style={{ marginTop: 16 }}>
                      <strong style={{ fontSize: 14 }}>{t('franchisees.salesBySphere')}</strong>
                      <ul className="list">
                        {data.sales_by_product.map((s) => <li className="list__item" key={s.product}><span>{s.sphere || s.name}</span><span><Money value={s.amount} /> · {t('franchisees.pieces', { n: s.count })}</span></li>)}
                      </ul>
                    </div>
                  )}
                </Card>
              </div>
              <div className="grid grid--2" style={{ alignItems: 'start' }}>
                <Card white flush>
                  <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('franchisees.openTasks')}</CardTitle></div>
                  <DataTable rows={data.open_tasks} rowKey={(r) => r.id} emptyTitle={t('franchisees.noOpenTasks')} emptyText=" "
                    columns={[{ key: 't', header: t('franchisees.colTask'), render: (r) => r.title }, { key: 's', header: t('common.status'), render: (r) => <StatusChip kind="task" status={r.status} small /> }, { key: 'd', header: t('franchisees.colDue'), render: (r) => formatDate(r.due_date) }]} />
                </Card>
                <Card white>
                  <CardTitle>{t('franchisees.lastAudit')}</CardTitle>
                  {data.last_audit ? <div className="stack"><div className="row"><Badge tone={ratingTone(data.last_audit.score)}>{data.last_audit.score ?? 0}%</Badge><span className="muted">{formatDate(data.last_audit.date)}</span></div><p>{data.last_audit.summary || t('franchisees.noSummary')}</p></div> : <p className="muted">{t('franchisees.noAudits')}</p>}
                </Card>
              </div>
            </div>
          )}
          {tab === 'analytics' && <PartnerAnalyticsView partner={fid} />}
          {tab === 'history' && (
            <div className="stack">
              <StatusHistory id={fid} />
              <HistoryTab entity="network.Franchisee" id={fid} />
            </div>
          )}
          {tab === 'contracts' && <ContractsList franchisee={fid} embedded />}
          {tab === 'clients' && <ClientsList franchisee={fid} embedded />}
          {tab === 'leads' && <LeadsList franchisee={fid} embedded />}
          {tab === 'money' && <MoneyTabs franchisee={fid} />}
          {tab === 'training' && <EnrollmentsList franchisee={fid} />}
          {tab === 'quality' && (
            <div className="stack">
              <Tabs tabs={[{ value: 't', label: t('franchisees.tickets') }, { value: 'a', label: t('franchisees.audits') }]} value={qTab} onChange={setQTab} />
              {qTab === 't' ? <TicketsList franchisee={fid} embedded /> : <AuditsList franchisee={fid} embedded />}
            </div>
          )}
          {tab === 'tasks' && <TasksList franchisee={fid} embedded />}
          {tab === 'staff' && (
            <Card white flush>
              <DataTable rows={data?.employees} rowKey={(r) => r.id} emptyTitle={t('franchisees.noStaff')} emptyText={t('franchisees.noStaffText')}
                columns={[
                  { key: 'n', header: t('franchisees.colEmployee'), render: (r) => <div><strong>{r.full_name || r.email}</strong><div className="muted" style={{ fontSize: 12 }}>{r.email}</div></div> },
                  { key: 'r', header: t('franchisees.colRole'), render: (r) => ROLES[r.role] ?? r.role },
                  { key: 'p', header: t('common.phone'), render: (r) => formatPhone(r.phone) },
                  { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
                ]} />
            </Card>
          )}
        </>
      )}
      {tierOpen && fr && <TierModal fr={fr} onClose={() => setTierOpen(false)} />}
      {statusDlg === 'close' && fr && <CloseWizard fr={fr} summary={data} onClose={() => setStatusDlg(null)} />}
      {statusDlg === 'reopen' && fr && <ReasonModal title={t('franchisees.reopenTitle')} submitLabel={t('franchisees.reactivate')} hint={t('franchisees.reopenHint')} onClose={() => setStatusDlg(null)} onSubmit={(reason) => act(`franchisees/${fr.id}/reopen/`, { reason }, t('franchisees.reopened'))} />}
      {statusDlg && statusDlg !== 'close' && statusDlg !== 'reopen' && fr && (
        <ReasonModal
          title={statusDlg === 'suspend' ? t('franchisees.suspendTitle') : t('franchisees.reactivateTitle')}
          submitLabel={statusDlg === 'suspend' ? t('franchisees.suspend') : t('franchisees.reactivate')}
          onClose={() => setStatusDlg(null)}
          onSubmit={(reason) => act('partner-status-history/', { partner: fr.id, field: 'status', new: statusDlg === 'suspend' ? 'suspended' : 'franchisee', reason }, t('franchisees.statusChanged'))}
        />
      )}
      {edit && fr && <FranchiseeForm item={fr} onClose={() => setEdit(false)} />}
    </div>
  )
}
