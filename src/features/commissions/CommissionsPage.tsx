import { useState } from 'react'
import { Banknote, Clock, HandCoins, PauseCircle, Plus, Scale } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { CommissionAccrual, Payout } from '../../api/types'
import { useUser } from '../../app/hooks'
import { Badge, Button, Card, CardTitle, DataTable, Dl, ErrorAlert, FormModal, Input, KpiCard, Modal, Money, PageHeader, Select, StatusChip, Tabs } from '../../components/ui'
import { formatDate, formatDateTime, formatMoney, monthLabel, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { statusOptions } from '../../lib/status'
import { FranchiseeSelect } from '../common/pickers'
import { ReasonModal } from '../common/shared'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useT } from '../../i18n'

interface Summary {
  accrued: string; withheld: string; paid: string; paid_amount?: string; on_hold: string; to_pay: string
  corrections: { id: number; amount: string; reason: string; date: string }[]
}

const firstOfMonth = (d: Date) => toISODate(new Date(d.getFullYear(), d.getMonth(), 1))

export function SummaryBlock({ partner }: { partner?: string }) {
  const t = useT()
  const q = useOne<Summary>('commission-accruals/summary/', { partner })
  const s = q.data
  return (
    <div className="stack">
      <ErrorAlert error={q.error} />
      <div className="grid grid--kpi">
        <KpiCard icon={Banknote} label={t('commissions.accrued')} value={s ? <Money value={s.accrued} /> : '…'} />
        <KpiCard icon={Scale} label={t('commissions.withheldFr')} value={s ? <Money value={s.withheld} /> : '…'} />
        <KpiCard icon={HandCoins} label={t('commissions.paid')} value={s ? <Money value={s.paid_amount ?? s.paid} /> : '…'} />
        <KpiCard icon={Clock} label={t('commissions.toPay')} value={s ? <Money value={s.to_pay} /> : '…'} />
        <KpiCard icon={PauseCircle} label={t('commissions.onHold')} value={s ? <Money value={s.on_hold} /> : '…'} />
      </div>
      {!!s?.corrections?.length && (
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('commissions.corrections')}</CardTitle></div>
          <DataTable rows={s.corrections} rowKey={(c) => c.id} emptyTitle={t('commissions.noCorrections')} emptyText=" "
            columns={[
              { key: 'd', header: t('common.date'), render: (c) => formatDate(c.date) },
              { key: 'a', header: t('common.amount'), align: 'right', render: (c) => <Money value={c.amount} signed /> },
              { key: 'r', header: t('common.reason'), render: (c) => c.reason || '—' },
            ]} />
        </Card>
      )}
    </div>
  )
}

export function AccrualsTab({ fixedPartner }: { fixedPartner?: string }) {
  const t = useT()
  const hq = useIsHq()
  const canDecide = useCan('accrualDecide')
  const { act } = useAct()
  const ls = useListState({ status: '', partner: '', date_from: '', date_to: '' }, '-date')
  const partner = fixedPartner ?? ls.filters.partner
  const { rows, data, isLoading, error } = useList<CommissionAccrual>('commission-accruals/', { ...ls.params, partner, cancelled: 'all' })
  const [cancel, setCancel] = useState<CommissionAccrual | null>(null)
  return (
    <div className="stack">
      <div className="filters">
        <Select label={t('common.status')} placeholder={t('common.all')} options={statusOptions('accrual')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        {hq && !fixedPartner && <FranchiseeSelect label={t('commissions.partner')} placeholder={t('commissions.allPartners')} value={ls.filters.partner} onChange={(v) => ls.setFilter('partner', v)} />}
        <Input label={t('common.from')} type="date" value={ls.filters.date_from} onChange={(e) => ls.setFilter('date_from', e.target.value)} />
        <Input label={t('common.to')} type="date" value={ls.filters.date_to} onChange={(e) => ls.setFilter('date_to', e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(a) => a.id} ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('commissions.noAccruals')} emptyText={t('commissions.noAccrualsText')}
          columns={[
            { key: 'd', header: t('commissions.payDate'), sortKey: 'date', render: (a) => formatDate(a.date) },
            ...(hq && !fixedPartner ? [{ key: 'p', header: t('commissions.partner'), render: (a: CommissionAccrual) => a.partner_name }] : []),
            { key: 'c', header: t('commissions.clientBranch'), render: (a) => <div>{a.client_name}<div className="muted" style={{ fontSize: 12 }}>{a.branch_name} · {a.product_code}</div></div> },
            { key: 'b', header: t('commissions.base'), align: 'right', render: (a) => <Money value={a.base_amount ?? 0} /> },
            { key: 'r', header: t('commissions.rate'), align: 'right', render: (a) => (a.rate ? `${toNum(a.rate)}%${toNum(a.adjustment_amount) ? ` ${toNum(a.adjustment_amount) > 0 ? '+' : ''}${toNum(a.adjustment_amount)}` : ''}` : '—') },
            { key: 'a', header: t('commissions.accrued'), sortKey: 'amount', align: 'right', render: (a) => <span className={toNum(a.amount) < 0 ? 'amount-neg' : ''}><Money value={a.amount} signed={toNum(a.amount) < 0} /></span> },
            { key: 'w', header: t('commissions.withheld'), align: 'right', render: (a) => (toNum(a.withheld_amount) ? <Money value={a.withheld_amount} /> : '—') },
            { key: 'n', header: t('commissions.toPay'), align: 'right', render: (a) => <strong><Money value={a.net_amount ?? 0} /></strong> },
            { key: 'pa', header: t('commissions.paid'), align: 'right', render: (a) => (toNum(a.paid_amount) ? <Money value={a.paid_amount ?? 0} /> : '—') },
            { key: 's', header: t('commissions.statusReason'), render: (a) => (
              <div><StatusChip kind="accrual" status={a.cancelled_at ? 'cancelled' : a.status} small />
                {a.reversal_of && <div className="muted" style={{ fontSize: 12 }}>{t('commissions.reversalOf', { n: a.reversal_of ?? '' })}</div>}
                {(a.reason || a.cancel_reason) && <div className="muted" style={{ fontSize: 12 }}>{a.cancel_reason || a.reason}</div>}</div>) },
            ...(canDecide ? [{ key: 'x', header: '', render: (a: CommissionAccrual) => (a.status === 'on_hold' && !a.cancelled_at ? (
              <div className="kcard__actions">
                <Button size="sm" onClick={() => act(`commission-accruals/${a.id}/release/`, undefined, t('commissions.released'))}>{t('commissions.release')}</Button>
                <Button size="sm" variant="danger" onClick={() => setCancel(a)}>{t('commissions.cancel')}</Button>
              </div>) : null) }] : []),
          ]} />
      </Card>
      {cancel && <ReasonModal title={t('commissions.cancelHeldTitle')} submitLabel={t('commissions.cancel')} onClose={() => setCancel(null)} onSubmit={(reason) => act(`commission-accruals/${cancel.id}/cancel/`, { reason }, t('commissions.accrualCancelled'))} />}
    </div>
  )
}

function PayoutForm({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ partner: '', period: firstOfMonth(new Date()), comment: '' })
  const submit = async () => {
    if (!f.v.partner) return f.fail({ data: { partner: [t('commissions.err.partner')] } })
    const r = await act('payouts/', { partner: Number(f.v.partner), period: f.v.period, comment: f.v.comment.trim() }, t('commissions.draftCreated'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('commissions.newPayout')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general} submitLabel={t('commissions.generate')}>
      <FranchiseeSelect value={f.v.partner} onChange={(v) => f.set('partner', v)} error={f.errors.partner} onlyActive />
      <Input label={t('commissions.periodAny')} type="date" value={f.v.period} error={f.errors.period} onChange={(e) => f.set('period', e.target.value)} />
      <Input label={t('common.comment')} value={f.v.comment} onChange={(e) => f.set('comment', e.target.value)} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('commissions.payoutNote')}</p>
    </FormModal>
  )
}

function PayModal({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const [date, setDate] = useState(toISODate(new Date()))
  const [ref, setRef] = useState('')
  return (
    <FormModal title={t('commissions.payModalTitle', { partner: payout.partner_name ?? '', period: monthLabel(payout.period.slice(0, 7)) })} onClose={onClose} saving={busy} submitLabel={t('commissions.doPay')}
      onSubmit={async () => { if (await act(`payouts/${payout.id}/pay/`, { date, payment_ref: ref.trim() }, t('commissions.paidOk'))) onClose() }}>
      <p style={{ margin: 0 }}><span>{t('commissions.payAmount')}</span> <strong>{formatMoney(payout.amount)}</strong></p>
      <Input label={t('commissions.payoutDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input label={t('commissions.payRef')} value={ref} onChange={(e) => setRef(e.target.value)} />
    </FormModal>
  )
}

function PayoutDetail({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const t = useT()
  const q = useOne<Payout>(`payouts/${payout.id}/`)
  const p = q.data ?? payout
  return (
    <Modal open wide title={t('commissions.detailTitle', { id: payout.id })} onClose={onClose}>
      <div className="stack">
        <Dl items={[
          [t('commissions.partner'), p.partner_name], [t('common.period'), monthLabel(p.period.slice(0, 7))], [t('common.amount'), <Money value={p.amount} />], [t('common.status'), <StatusChip kind="payout" status={p.cancelled_at ? 'cancelled' : p.status} small />],
          [t('commissions.verifiedBy'), p.verified_by_name ? `${p.verified_by_name}, ${formatDateTime(p.verified_at)}` : null], [t('commissions.paidBy'), p.paid_by_name ? `${p.paid_by_name}, ${formatDateTime(p.paid_at)}` : null],
          [t('commissions.payRefShort'), p.payment_ref], [t('commissions.cancelReason'), p.cancel_reason],
        ]} />
        <DataTable rows={p.accruals} rowKey={(a) => a.id} emptyTitle={t('commissions.noAccruals')} emptyText=" "
          columns={[
            { key: 'd', header: t('common.date'), render: (a) => formatDate(a.date) },
            { key: 'a', header: t('commissions.accrued'), align: 'right', render: (a) => <Money value={a.amount} signed /> },
            { key: 'w', header: t('commissions.withheld'), align: 'right', render: (a) => <Money value={a.withheld} /> },
            { key: 'n', header: t('common.total'), align: 'right', render: (a) => <Money value={a.net} signed /> },
            { key: 'r', header: t('common.reason'), render: (a) => a.reason || (a.reversal_of ? t('commissions.reversalShort', { n: a.reversal_of }) : '—') },
          ]} />
      </div>
    </Modal>
  )
}

export function PayoutsTab({ fixedPartner }: { fixedPartner?: string }) {
  const t = useT()
  const hq = useIsHq()
  const me = useUser()
  const canCreate = useCan('payoutCreate')
  const canVerify = useCan('payoutVerify')
  const canPay = useCan('payoutPay')
  const canCancel = useCan('payoutCancel')
  const canFin = canVerify || canPay || canCancel
  const { act } = useAct()
  const ls = useListState({ status: '', partner: '' }, '-period')
  const partner = fixedPartner ?? ls.filters.partner
  const { rows, data, isLoading, error } = useList<Payout>('payouts/', { ...ls.params, partner })
  const [form, setForm] = useState(false)
  const [pay, setPay] = useState<Payout | null>(null)
  const [cancel, setCancel] = useState<Payout | null>(null)
  const [detail, setDetail] = useState<Payout | null>(null)
  return (
    <div className="stack">
      <div className="filters">
        <Select label={t('common.status')} placeholder={t('common.all')} options={statusOptions('payout')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        {hq && !fixedPartner && <FranchiseeSelect label={t('commissions.partner')} placeholder={t('commissions.allPartners')} value={ls.filters.partner} onChange={(v) => ls.setFilter('partner', v)} />}
        {canCreate && <Button icon={Plus} onClick={() => setForm(true)}>{t('commissions.newPayoutBtn')}</Button>}
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(p) => p.id} onRowClick={setDetail} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('commissions.noPayouts')} emptyText={t('commissions.noPayoutsText')}
          columns={[
            { key: 'pr', header: t('common.period'), render: (p) => monthLabel(p.period.slice(0, 7)) },
            ...(hq && !fixedPartner ? [{ key: 'p', header: t('commissions.partner'), render: (p: Payout) => p.partner_name }] : []),
            { key: 'a', header: t('common.amount'), align: 'right', render: (p) => <Money value={p.amount} /> },
            { key: 's', header: t('common.status'), render: (p) => <div><StatusChip kind="payout" status={p.cancelled_at ? 'cancelled' : p.status} small />{p.cancel_reason && <div className="muted" style={{ fontSize: 12 }}>{p.cancel_reason}</div>}</div> },
            { key: 'v', header: t('commissions.verifiedBy'), render: (p) => p.verified_by_name ?? '—' },
            { key: 'pd', header: t('commissions.paidBy'), render: (p) => (p.paid_by_name ? <div>{p.paid_by_name}<div className="muted" style={{ fontSize: 12 }}>{formatDate(p.paid_date)} {p.payment_ref}</div></div> : '—') },
            ...(canFin ? [{ key: 'x', header: '', render: (p: Payout) => (
              <div className="kcard__actions" onClick={(e) => e.stopPropagation()}>
                {canVerify && p.status === 'draft' && !p.cancelled_at && <Button size="sm" onClick={() => act(`payouts/${p.id}/verify/`, undefined, t('commissions.verified'))}>{t('commissions.verify')}</Button>}
                {canPay && p.status === 'verified' && (p.verified_by === me?.id
                  ? <span className="muted" style={{ fontSize: 12 }}>{t('commissions.otherPays')}</span>
                  : <Button size="sm" variant="dark" onClick={() => setPay(p)}>{t('commissions.post')}</Button>)}
                {canCancel && ['draft', 'verified'].includes(p.status) && !p.cancelled_at && <Button size="sm" variant="danger" onClick={() => setCancel(p)}>{t('commissions.cancel')}</Button>}
              </div>) }] : []),
          ]} />
      </Card>
      {form && <PayoutForm onClose={() => setForm(false)} />}
      {pay && <PayModal payout={pay} onClose={() => setPay(null)} />}
      {cancel && <ReasonModal title={t('commissions.cancelPayout')} submitLabel={t('commissions.cancelPayout')} hint={t('commissions.cancelPayoutHint')} onClose={() => setCancel(null)} onSubmit={(reason) => act(`payouts/${cancel.id}/cancel/`, { reason }, t('commissions.payoutCancelled'))} />}
      {detail && <PayoutDetail payout={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

type Tab = 'accruals' | 'payouts'

/** OZOK: начисления и выплаты по всем партнёрам. Партнёр: «Комиссии» — начислено / удержано / выплачено / корректировки. */
export default function CommissionsPage() {
  const t = useT()
  const hq = useIsHq()
  const [tab, setTab] = useState<Tab>('accruals')
  const [partner, setPartner] = useState('')
  return (
    <div className="page">
      <PageHeader eyebrow={hq ? t('commissions.eyebrowHq') : t('commissions.eyebrowFr')} title={t('commissions.title')} />
      {hq && <div className="filters"><FranchiseeSelect label={t('commissions.summaryFor')} placeholder={t('commissions.wholeNetwork')} value={partner} onChange={setPartner} /></div>}
      <SummaryBlock partner={hq ? partner || undefined : undefined} />
      <Tabs<Tab> tabs={[{ value: 'accruals', label: t('commissions.tab.accruals') }, { value: 'payouts', label: t('commissions.tab.payouts') }]} value={tab} onChange={setTab} />
      {tab === 'accruals' ? <AccrualsTab /> : <PayoutsTab />}
      <Badge small tone="neutral">{t('commissions.allKgs')}</Badge>
    </div>
  )
}
