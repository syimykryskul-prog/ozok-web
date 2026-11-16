import { useMemo, useState } from 'react'
import { BadgeCheck, Wallet } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { RecruiterReward, RecruiterStat } from '../../api/types'
import { Bar, Button, Card, CardTitle, DataTable, ErrorAlert, FormModal, Input, KpiCard, Money, PageHeader, Select, StatusChip } from '../../components/ui'
import { ReasonModal } from '../common/shared'
import { canWrite, hasAction } from '../../lib/permissions'
import { statusOptions } from '../../lib/status'
import { formatDate, formatDateTime, formatMoney, toISODate, toNum } from '../../lib/format'
import { useUser } from '../../app/hooks'
import { useAct, useCan } from '../common/useAct'
import { ConfirmDialog } from '../../components/ui'
import { useT } from '../../i18n'

function normStats(d: unknown): RecruiterStat[] | undefined {
  if (!d) return undefined
  if (Array.isArray(d)) return (d as RecruiterStat[]).map((x) => ({ ...x, recruiter_name: x.recruiter_name ?? x.name, attracted: x.attracted ?? x.recruited ?? 0 }))
  const o = d as { results?: RecruiterStat[]; recruiters?: RecruiterStat[] }
  return o.results ?? o.recruiters
}

export function RewardProgress({ r }: { r: RecruiterReward }) {
  const t = useT()
  const target = toNum(r.target_amount) || 13125
  const acc = toNum(r.accrued_amount)
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontSize: 13 }}>{t('recruiters.ofTarget', { acc: formatMoney(acc), target: formatMoney(target) })}</div>
      <Bar value={target ? acc / target : 0} tone={acc >= target ? 'success' : 'info'} />
    </div>
  )
}

export default function RecruitersPage() {
  const t = useT()
  const stats = useOne<unknown>('recruiter-rewards/report/')
  const rewards = useList<RecruiterReward>('recruiter-rewards/', { page_size: 100, ordering: '-id' })
  const rows = rewards.rows ?? []

  const table = useMemo<RecruiterStat[]>(() => {
    const s = normStats(stats.data)
    if (s) return s
    const m = new Map<number, RecruiterStat>()
    rows.forEach((r) => {
      const c = m.get(r.recruiter) ?? { recruiter: r.recruiter, recruiter_name: r.recruiter_name, attracted: 0, activated: 0, accrued: '0', paid: '0' }
      c.attracted += 1
      if (r.status !== 'accruing') c.activated += 1
      c.accrued = String(toNum(c.accrued) + toNum(r.accrued_amount))
      if (r.status === 'paid') c.paid = String(toNum(c.paid) + toNum(r.target_amount))
      m.set(r.recruiter, c)
    })
    return [...m.values()]
  }, [stats.data, rows])

  const sum = (k: 'attracted' | 'activated' | 'paid_count') => table.reduce((a, s) => a + (s[k] ?? 0), 0)
  const paidAmount = table.reduce((a, s) => a + toNum(s.paid), 0)

  return (
    <div className="page">
      <PageHeader eyebrow={t('recruiters.eyebrow')} title={t('recruiters.title')} />
      <div className="grid grid--kpi">
        <KpiCard icon={BadgeCheck} label={t('recruiters.attracted')} value={sum('attracted')} sub={t('recruiters.activatedSub', { n: sum('activated') })} />
        <KpiCard icon={Wallet} label={t('recruiters.paid')} value={<Money value={paidAmount} />} sub={t('recruiters.paidSub', { n: sum('paid_count') || rows.filter((r) => r.status === 'paid').length })} />
      </div>
      <ErrorAlert error={rewards.error} />
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('recruiters.byRecruiters')}</CardTitle></div>
        <DataTable loading={stats.isLoading && rewards.isLoading} rows={table} rowKey={(r) => r.recruiter}
          emptyTitle={t('recruiters.emptyTitle')} emptyText={t('recruiters.emptyText')}
          columns={[
            { key: 'n', header: t('recruiters.colRecruiter'), render: (r) => <strong>{r.recruiter_name ?? `#${r.recruiter}`}</strong> },
            { key: 'a', header: t('recruiters.attracted'), align: 'right', render: (r) => r.attracted },
            { key: 'b', header: t('recruiters.colActivated'), align: 'right', render: (r) => r.activated },
            { key: 'c', header: t('recruiters.colAccrued'), align: 'right', render: (r) => <Money value={r.accrued ?? 0} /> },
            { key: 'p', header: t('recruiters.paid'), align: 'right', render: (r) => <Money value={r.paid ?? 0} /> },
          ]} />
      </Card>
      <RewardsSection canAct={false} />
    </div>
  )
}

/** Очередь вознаграждений рекрутёров: начислено, проверено, выплачено (проверяет и платит разные сотрудники). */
export function RewardsSection({ canAct: allow = true }: { canAct?: boolean }) {
  const t = useT()
  const user = useUser()
  const canVerify = useCan('rewardVerify')
  const canPay = useCan('rewardPay')
  const canCancel = hasAction('recruiter_rewards.cancel') ?? canWrite(user?.role, 'rewardVerify')
  const { act, busy } = useAct()
  const [status, setStatus] = useState('')
  const [dlg, setDlg] = useState<{ r: RecruiterReward; kind: 'verify' | 'pay' | 'cancel' } | null>(null)
  const rewards = useList<RecruiterReward>('recruiter-rewards/', { page_size: 100, status: status || undefined, ordering: '-id' })
  const rows = rewards.rows ?? []
  const canAct = allow && (canVerify || canPay || canCancel)
  const verify = async () => {
    if (!dlg) return
    const ok = await act(`recruiter-rewards/${dlg.r.id}/verify/`, undefined, t('recruiters.verified'))
    if (ok !== undefined) setDlg(null)
  }

  return (
    <div className="stack">
      <div className="filters">
        <Select label={t('recruiters.statusFilter')} placeholder={t('common.all')} options={statusOptions('reward')} value={status} onChange={(e) => setStatus(e.target.value)} />
      </div>
      <ErrorAlert error={rewards.error} />
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('recruiters.rewards')}</CardTitle></div>
        <DataTable loading={rewards.isLoading} rows={rows} rowKey={(r) => r.id}
          emptyTitle={t('recruiters.noRewards')} emptyText={t('recruiters.noRewardsText')}
          columns={[
            { key: 'p', header: t('recruiters.colPartner'), render: (r) => <div><strong>{r.partner_name}</strong>{!!user && <div className="muted" style={{ fontSize: 12 }}>{r.recruiter_name}</div>}</div> },
            { key: 'pr', header: t('recruiters.colProgress'), render: (r) => <RewardProgress r={r} /> },
            { key: 's', header: t('common.status'), render: (r) => <div><StatusChip kind="reward" status={r.status} small />{r.cancel_reason && <div className="muted" style={{ fontSize: 12 }}>{r.cancel_reason}</div>}</div> },
            { key: 'v', header: t('recruiters.colVerified'), render: (r) => (r.verified_at ? formatDateTime(r.verified_at) : '—') },
            { key: 'pd', header: t('recruiters.paid'), render: (r) => (r.paid_at ? <div><Money value={r.paid_amount ?? 0} /><div className="muted" style={{ fontSize: 12 }}>{formatDate(r.paid_date)} {r.payment_ref}</div></div> : '—') },
            ...(canAct ? [{
              key: 'ac', header: '', render: (r: RecruiterReward) => (
                <div className="kcard__actions">
                  {canVerify && r.status === 'accrued' && <Button size="sm" onClick={() => setDlg({ r, kind: 'verify' })}>{t('recruiters.verify')}</Button>}
                  {canPay && r.status === 'verified' && (r.verified_by === user?.id
                    ? <span className="muted" style={{ fontSize: 12 }}>{t('recruiters.otherPays')}</span>
                    : <Button size="sm" variant="dark" onClick={() => setDlg({ r, kind: 'pay' })}>{t('recruiters.pay')}</Button>)}
                  {canCancel && !['paid', 'cancelled'].includes(r.status) && <Button size="sm" variant="danger" onClick={() => setDlg({ r, kind: 'cancel' })}>{t('recruiters.cancel')}</Button>}
                </div>),
            }] : []),
          ]} />
      </Card>
      <ConfirmDialog open={dlg?.kind === 'verify'} title={t('recruiters.verifyTitle')} loading={busy}
        text={dlg ? t('recruiters.verifyText', { who: dlg.r.recruiter_name ?? t('recruiters.recruiterFallback'), partner: dlg.r.partner_name ?? '', amount: formatMoney(dlg.r.accrued_amount) }) : ''}
        onConfirm={verify} onClose={() => setDlg(null)} />
      {dlg?.kind === 'pay' && <RewardPayModal reward={dlg.r} onClose={() => setDlg(null)} />}
      {dlg?.kind === 'cancel' && <ReasonModal title={t('recruiters.cancelTitle')} submitLabel={t('recruiters.cancel')} onClose={() => setDlg(null)} onSubmit={(reason) => act(`recruiter-rewards/${dlg.r.id}/cancel/`, { reason }, t('recruiters.cancelled'))} />}
    </div>
  )
}

function RewardPayModal({ reward, onClose }: { reward: RecruiterReward; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const [date, setDate] = useState(toISODate(new Date()))
  const [ref, setRef] = useState('')
  return (
    <FormModal title={t('recruiters.payTitle', { partner: reward.partner_name ?? '' })} onClose={onClose} saving={busy} submitLabel={t('recruiters.doPay')}
      onSubmit={async () => { if (await act(`recruiter-rewards/${reward.id}/pay/`, { date, payment_ref: ref.trim() }, t('recruiters.paidDone'))) onClose() }}>
      <p style={{ margin: 0 }}>{t('recruiters.toPay')} <strong>{formatMoney(reward.accrued_amount)}</strong></p>
      <Input label={t('recruiters.payDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input label={t('recruiters.payRef')} value={ref} onChange={(e) => setRef(e.target.value)} />
    </FormModal>
  )
}
