import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { RatingRow, SalesPlan } from '../../api/types'
import { Badge, Button, Card, DataTable, ErrorAlert, FormModal, Input, Money, PageHeader, planTone, pct, ratingTone } from '../../components/ui'
import { currentMonth, formatNumber, monthLabel, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useOne } from '../../api/hooks'
import { useAct, useCan } from '../common/useAct'
import { useToast } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { useSend } from '../../api/hooks'
import { useT } from '../../i18n'

function PlansModal({ month, rating, plans, onClose }: { month: string; rating: RatingRow[]; plans: SalesPlan[]; onClose: () => void }) {
  const t = useT()
  const [send] = useSend()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const initial: Record<string, { c: string; r: string }> = {}
  rating.forEach((r) => {
    const p = plans.find((x) => x.franchisee === r.franchisee_id)
    initial[r.franchisee_id] = { c: p ? String(p.target_clients) : '', r: p ? String(toNum(p.target_revenue)) : '' }
  })
  const f = useForm({ rows: initial, allC: '', allR: '' })
  const setRow = (id: number, k: 'c' | 'r', v: string) => f.set('rows', { ...f.v.rows, [id]: { ...f.v.rows[id], [k]: v } })
  const fillAll = () => {
    const rows = { ...f.v.rows }
    rating.forEach((r) => { rows[r.franchisee_id] = { c: f.v.allC || rows[r.franchisee_id].c, r: f.v.allR || rows[r.franchisee_id].r } })
    f.set('rows', rows)
  }
  const submit = async () => {
    setBusy(true)
    let failed = 0
    for (const r of rating) {
      const v = f.v.rows[r.franchisee_id]
      if (!v || (v.c === '' && v.r === '')) continue
      const existing = plans.find((x) => x.franchisee === r.franchisee_id)
      const body = { franchisee: r.franchisee_id, month: `${month}-01`, target_clients: Number(v.c) || 0, target_revenue: (v.r || '0').replace(',', '.') }
      try {
        if (existing) await send(`sales-plans/${existing.id}/`, body, 'PATCH')
        else await send('sales-plans/', body)
      } catch (e) { failed++; toast.error(`${r.name}: ${errorMessage(e)}`) }
    }
    setBusy(false)
    if (!failed) { toast.success(t('plans.saved')); onClose() }
  }
  return (
    <FormModal wide title={t('plans.modalTitle', { month: monthLabel(month) })} onClose={onClose} onSubmit={submit} saving={busy}>
      <div className="hint-box">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <Input label={t('plans.allClients')} type="number" value={f.v.allC} onChange={(e) => f.set('allC', e.target.value)} />
          <Input label={t('plans.allRevenue')} type="number" value={f.v.allR} onChange={(e) => f.set('allR', e.target.value)} />
          <Button type="button" variant="secondary" onClick={fillAll}>{t('plans.applyAll')}</Button>
        </div>
      </div>
      {rating.length === 0 && <p className="muted">{t('plans.noActive')}</p>}
      {rating.map((r) => (
        <div className="form-grid" key={r.franchisee_id} style={{ alignItems: 'end' }}>
          <Input label={r.name} type="number" placeholder={t('plans.clientsPh')} value={f.v.rows[r.franchisee_id]?.c ?? ''} onChange={(e) => setRow(r.franchisee_id, 'c', e.target.value)} />
          <Input label={t('plans.revenueSom')} type="number" value={f.v.rows[r.franchisee_id]?.r ?? ''} onChange={(e) => setRow(r.franchisee_id, 'r', e.target.value)} />
        </div>
      ))}
    </FormModal>
  )
}

export default function PlansPage() {
  const t = useT()
  const navigate = useNavigate()
  const canWrite = useCan('plans')
  const [month, setMonth] = useState(currentMonth())
  const [editing, setEditing] = useState(false)
  const rating = useOne<RatingRow[] | { results: RatingRow[] }>('reports/rating/', { month })
  const plans = useList<SalesPlan>('sales-plans/', { month, page_size: 100 })
  const rows: RatingRow[] = Array.isArray(rating.data) ? rating.data : (rating.data?.results ?? [])
  const planOf = (id: number) => (plans.rows ?? []).find((p) => p.franchisee === id)
  void useAct

  return (
    <div className="page">
      <PageHeader eyebrow={t('plans.eyebrow')} title={t('plans.title')} actions={
        <>
          <input className="month-input" type="month" aria-label={t('plans.month')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          {canWrite && <Button icon={Target} onClick={() => setEditing(true)}>{t('plans.setPlans')}</Button>}
        </>
      } />
      <ErrorAlert error={rating.error ?? plans.error} />
      <Card white flush>
        <DataTable
          loading={rating.isLoading} rows={rows} rowKey={(r) => r.franchisee_id} onRowClick={(r) => navigate(`/franchisees/${r.franchisee_id}`)}
          emptyTitle={t('plans.noData')} emptyText={t('plans.noActiveMonth')}
          columns={[
            { key: 'p', header: '#', width: '48px', render: (r) => <strong>{r.place}</strong> },
            { key: 'n', header: t('plans.franchisee'), render: (r) => <div><strong>{r.name}</strong><div className="muted" style={{ fontSize: 12 }}>{r.city}</div></div> },
            { key: 'cl', header: t('plans.clientsFP'), align: 'right', render: (r) => `${r.new_clients} / ${planOf(r.franchisee_id)?.target_clients ?? '—'}` },
            { key: 'rv', header: t('plans.revenueFP'), align: 'right', render: (r) => <span><Money value={r.revenue} /> / {planOf(r.franchisee_id) ? <Money value={planOf(r.franchisee_id)?.target_revenue} /> : '—'}</span> },
            { key: 'pl', header: t('plans.plan'), render: (r) => <Badge tone={planTone(r.plan_percent)} small>{pct(r.plan_percent)}</Badge> },
            { key: 'tk', header: t('plans.ticketScore'), align: 'right', render: (r) => (r.avg_ticket_rating != null ? formatNumber(r.avg_ticket_rating, 1) : '—') },
            { key: 'au', header: t('plans.audit'), align: 'right', render: (r) => (r.last_audit_score != null ? `${r.last_audit_score}%` : '—') },
            { key: 'tr', header: t('plans.trained'), align: 'right', render: (r) => pct(r.trained_share) },
            { key: 'di', header: t('plans.discipline'), align: 'right', render: (r) => pct(r.payment_discipline) },
            { key: 'r', header: t('plans.rating'), align: 'right', render: (r) => <Badge tone={ratingTone(r.rating)}>{r.rating}</Badge> },
          ]}
        />
      </Card>
      {editing && <PlansModal month={month} rating={rows} plans={plans.rows ?? []} onClose={() => setEditing(false)} />}
    </div>
  )
}
