import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandCoins, Plus, Wallet } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { CashCategory, Charge, CommissionPayout, Contract, Franchisee, FrDashboard, FrPaymentV3 as FrPayment } from '../../api/types'
import { ReasonModal } from '../common/shared'
import { StatusChip } from '../../components/ui'
import { Badge, Button, Card, CardTitle, DataTable, ErrorAlert, FormModal, Input, KpiCard, Money, PageHeader, Select, Tabs, Textarea } from '../../components/ui'
import { formatDate, formatMoney, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { CHARGE_KINDS, PAY_METHODS, dictOptions } from '../../lib/status'
import { FranchiseeSelect } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { PayoffProgress } from '../contracts/ContractsPage'
import { useUser } from '../../app/hooks'
import { useT } from '../../i18n'

/** Платёж франчайзи OZOK (franchisee-payments/): «За что платёж» — открытое начисление (charge) или статья дохода кассы (income_category). */
function MoneyForm({ path, title, franchisee, onClose }: { path: string; title: string; franchisee?: number; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ franchisee: franchisee ? String(franchisee) : '', amount: '', date: toISODate(new Date()), method: 'bank', purpose: '', comment: '' })
  const charges = useList<Charge>('charges/', { franchisee: f.v.franchisee || undefined, page_size: 100, ordering: 'due_date' }, { skip: !f.v.franchisee })
  const cats = useList<CashCategory>('cash-categories/', { direction: 'in', is_active: true, page_size: 100 })
  const purposeOptions = [
    ...(charges.rows ?? []).map((c) => ({ value: `charge:${c.id}`, label: t('settlements.chargeOpt', { kind: CHARGE_KINDS[c.kind] ?? c.kind, amount: formatMoney(c.amount) }) + (c.due_date ? t('settlements.chargeUntil', { date: formatDate(c.due_date) }) : '') })),
    ...(cats.rows ?? []).map((c) => ({ value: `cat:${c.code ?? ''}`, label: t('settlements.catOpt', { name: c.name }) })),
  ]
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.franchisee) e.franchisee = [t('settlements.err.franchisee')]
    if (!(toNum(f.v.amount) > 0)) e.amount = [t('settlements.err.amount')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body: Record<string, unknown> = { franchisee: Number(f.v.franchisee), amount: f.v.amount.replace(',', '.'), date: f.v.date, method: f.v.method, comment: f.v.comment }
    if (f.v.purpose.startsWith('charge:')) body.charge = Number(f.v.purpose.slice(7))
    else if (f.v.purpose.startsWith('cat:') && f.v.purpose.length > 4) body.income_category = f.v.purpose.slice(4)
    const r = await act(path, body, t('common.saved'))
    if (r) onClose()
  }
  return (
    <FormModal title={title} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <div className="span-2"><FranchiseeSelect value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} error={f.errors.franchisee} disabled={!!franchisee} /></div>
        <Input label={t('settlements.amountSom')} inputMode="decimal" value={f.v.amount} onChange={(e) => f.set('amount', e.target.value)} error={f.errors.amount} />
        <Input label={t('common.date')} type="date" value={f.v.date} onChange={(e) => f.set('date', e.target.value)} />
        <Select label={t('settlements.method')} options={dictOptions({ cash: PAY_METHODS.cash, bank: PAY_METHODS.bank })} value={f.v.method} onChange={(e) => f.set('method', e.target.value)} />
        <Select label={t('settlements.purpose')} placeholder={t('settlements.purposeAuto')} options={purposeOptions} value={f.v.purpose} error={f.errors.charge ?? f.errors.income_category} onChange={(e) => f.set('purpose', e.target.value)} />
        <div className="span-2"><Textarea label={t('common.comment')} value={f.v.comment} onChange={(e) => f.set('comment', e.target.value)} /></div>
      </div>
    </FormModal>
  )
}

type Sub = 'charges' | 'payments' | 'payouts'

export function MoneyTabs({ franchisee }: { franchisee?: number }) {
  const t = useT()
  const hq = useIsHq()
  const canWrite = useCan('money')
  const [tab, setTab] = useState<Sub>('charges')
  const [form, setForm] = useState<'payment' | null>(null)
  const { act } = useAct()
  const [cancel, setCancel] = useState<{ path: string; label: string } | null>(null)
  const ls = useListState({ overdue: '' }, '-date')
  const ch = useList<Charge>('charges/', { ...ls.params, ordering: '-due_date', franchisee, overdue: ls.filters.overdue }, { skip: tab !== 'charges' })
  const pay = useList<FrPayment>('franchisee-payments/', { ...ls.params, franchisee, overdue: undefined, ordering: '-date' }, { skip: tab !== 'payments' })
  const out = useList<CommissionPayout>('commission-payouts/', { ...ls.params, franchisee, overdue: undefined, ordering: '-date' }, { skip: tab !== 'payouts' })
  const showF = hq && !franchisee
  const change = (v: Sub) => { setTab(v); ls.setPage(1) }
  return (
    <div className="stack">
      <div className="row row--between">
        <Tabs<Sub> tabs={[{ value: 'charges', label: t('settlements.tab.charges') }, { value: 'payments', label: t('settlements.tab.payments') }, { value: 'payouts', label: t('settlements.tab.payouts') }]} value={tab} onChange={change} />
        {canWrite && tab === 'payments' && <Button icon={Plus} size="sm" onClick={() => setForm('payment')}>{t('settlements.addPayment')}</Button>}
      </div>
      {tab === 'charges' && (
        <>
          <div className="filters"><Select label={t('settlements.term')} options={[{ value: 'true', label: t('settlements.overdue') }]} placeholder={t('common.all')} value={ls.filters.overdue} onChange={(e) => ls.setFilter('overdue', e.target.value)} /></div>
          <ErrorAlert error={ch.error} />
          <Card white flush>
            <DataTable loading={ch.isLoading} rows={ch.rows} rowKey={(r) => r.id} page={ls.page} total={ch.data?.count} onPage={ls.setPage}
              emptyTitle={t('settlements.noCharges')} emptyText={t('settlements.noChargesText')}
              columns={[
                { key: 'd', header: t('settlements.term'), render: (r) => (r.due_date ? formatDate(r.due_date) : t('settlements.noDue')) },
                ...(showF ? [{ key: 'f', header: t('settlements.franchisee'), render: (r: Charge) => r.franchisee_name }] : []),
                { key: 'k', header: t('settlements.kind'), render: (r) => <Badge small>{CHARGE_KINDS[r.kind] ?? r.kind}</Badge> },
                { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.amount} /> },
                { key: 'ds', header: t('common.description'), render: (r) => <span className="muted">{r.description}</span> },
              ]} />
          </Card>
        </>
      )}
      {tab === 'payments' && (
        <>
          <ErrorAlert error={pay.error} />
          <Card white flush>
            <DataTable loading={pay.isLoading} rows={pay.rows} rowKey={(r) => r.id} page={ls.page} total={pay.data?.count} onPage={ls.setPage}
              emptyTitle={t('settlements.noPayments')} emptyText={t('settlements.noPaymentsText')}
              columns={[
                { key: 'd', header: t('common.date'), render: (r) => formatDate(r.date) },
                ...(showF ? [{ key: 'f', header: t('settlements.franchisee'), render: (r: FrPayment) => r.franchisee_name }] : []),
                { key: 'm', header: t('settlements.method'), render: (r) => PAY_METHODS[r.method] ?? r.method },
                { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.amount} /> },
                { key: 'c', header: t('common.comment'), render: (r) => <span className="muted">{r.comment}</span> },
                { key: 'st', header: t('common.status'), render: (r) => (r.status ? <div><StatusChip kind="frPayment" status={r.status} small />{r.cancel_reason && <div className="muted" style={{ fontSize: 12 }}>{r.cancel_reason}</div>}</div> : '—') },
                ...(canWrite ? [{ key: 'x', header: '', render: (r: FrPayment) => (
                  <div className="kcard__actions">
                    {r.status && r.status !== 'cancelled' && <Button size="sm" variant="danger" onClick={() => setCancel({ path: `franchisee-payments/${r.id}/cancel/`, label: t('settlements.paymentGen') })}>{t('settlements.cancel')}</Button>}
                  </div>) }] : []),
              ]} />
          </Card>
        </>
      )}
      {tab === 'payouts' && (
        <>
          <ErrorAlert error={out.error} />
          <Card white flush>
            <DataTable loading={out.isLoading} rows={out.rows} rowKey={(r) => r.id} page={ls.page} total={out.data?.count} onPage={ls.setPage}
              emptyTitle={t('settlements.noPayouts')} emptyText={t('settlements.noPayoutsText')}
              columns={[
                { key: 'd', header: t('common.date'), render: (r) => formatDate(r.date) },
                ...(showF ? [{ key: 'f', header: t('settlements.franchisee'), render: (r: CommissionPayout) => r.franchisee_name }] : []),
                { key: 'm', header: t('settlements.method'), render: (r) => PAY_METHODS[r.method] ?? r.method },
                { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.amount} /> },
                { key: 'c', header: t('common.comment'), render: (r) => <span className="muted">{r.comment}</span> },
                { key: 'st', header: t('common.status'), render: (r) => (r.cancelled_at ? <div><Badge small>{t('settlements.cancelledF')}</Badge><div className="muted" style={{ fontSize: 12 }}>{r.cancel_reason}</div></div> : <Badge small tone="success">{t('settlements.posted')}</Badge>) },
              ]} />
          </Card>
        </>
      )}
      {cancel && <ReasonModal title={t('settlements.cancelTitle', { what: cancel.label })} submitLabel={t('settlements.cancel')} hint={t('settlements.cancelHint')} onClose={() => setCancel(null)}
        onSubmit={(reason) => act(cancel.path, { reason }, t('settlements.cancelledOk'))} />}
      {form === 'payment' && <MoneyForm path="franchisee-payments/" title={t('settlements.paymentTitle')} franchisee={franchisee} onClose={() => setForm(null)} />}
    </div>
  )
}

export function HqSettlements({ embedded }: { embedded?: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const ls = useListState({}, '-balance')
  const { rows, data, isLoading, error } = useList<Franchisee>('franchisees/', { ...ls.params, ordering: undefined })
  const all = useList<Franchisee>('franchisees/', { page_size: 100 })
  const sum = (k: 'balance' | 'overdue_amount' | 'commission_due') => (all.rows ?? []).reduce((a, r) => a + toNum(r[k]), 0)
  return (
    <div className={embedded ? 'stack' : 'page'}>
      {!embedded && <PageHeader eyebrow={t('settlements.eyebrow')} title={t('settlements.title')} />}
      <div className="grid grid--kpi">
        <KpiCard icon={Wallet} label={t('settlements.hq.owe')} value={<Money value={sum('balance')} />} sub={t('settlements.overdueSub', { v: formatMoney(sum('overdue_amount')) })} />
        <KpiCard icon={HandCoins} label={t('settlements.hq.owed')} value={<Money value={sum('commission_due')} />} sub={t('settlements.hq.owedSub')} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('settlements.hq.balances')}</CardTitle></div>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/franchisees/${r.id}`)}
          page={ls.page} total={data?.count} onPage={ls.setPage}
          columns={[
            { key: 'n', header: t('settlements.franchisee'), render: (r) => <div><strong>{r.name}</strong><div className="muted" style={{ fontSize: 12 }}>{r.city}</div></div> },
            { key: 'b', header: t('settlements.hq.dueToNbs'), align: 'right', render: (r) => (r.balance != null ? <Money value={r.balance} /> : '—') },
            { key: 'o', header: t('settlements.hq.overdueCol'), align: 'right', render: (r) => (toNum(r.overdue_amount) > 0 ? <Badge tone="error" small>{formatMoney(r.overdue_amount)}</Badge> : '—') },
            { key: 'c', header: t('settlements.hq.nbsOwes'), align: 'right', render: (r) => (r.commission_due != null ? <Money value={r.commission_due} /> : '—') },
          ]}
        />
      </Card>
      <MoneyTabs />
    </div>
  )
}

export function FrSettlements({ embedded }: { embedded?: boolean }) {
  const t = useT()
  const user = useUser()
  const dash = useOne<FrDashboard>('dashboard/')
  const contracts = useList<Contract>('contracts/', { page_size: 50, status: 'active' })
  const d = dash.data
  const tracked = (contracts.rows ?? []).filter((c) => c.payment_scheme === 'per_sale' || c.paid_off_amount != null)
  return (
    <div className={embedded ? 'stack' : 'page'}>
      {!embedded && <PageHeader eyebrow={user?.franchisee?.name} title={t('settlements.fr.title')} />}
      <ErrorAlert error={dash.error} />
      <div className="grid grid--2">
        {(!d || d.balance != null) && <KpiCard icon={Wallet} label={t('settlements.fr.owe')} value={d ? <Money value={d.balance} /> : '…'} sub={d?.overdue_amount != null ? t('settlements.overdueSub', { v: formatMoney(d.overdue_amount) }) : undefined} />}
        {(!d || d.commission_due != null) && <KpiCard icon={HandCoins} label={t('settlements.fr.owed')} value={d ? <Money value={d.commission_due} /> : '…'} sub={t('settlements.fr.owedSub')} />}
      </div>
      {tracked.length > 0 && (
        <Card white>
          <CardTitle>{t('settlements.fr.payoff')}</CardTitle>
          <div className="stack">
            {tracked.map((c) => (
              <div key={c.id}><div className="row row--between"><strong>{c.number} · {c.package_name ?? c.product_name}</strong></div><PayoffProgress c={c} /></div>
            ))}
          </div>
        </Card>
      )}
      <MoneyTabs />
    </div>
  )
}

export default function SettlementsPage() {
  return useIsHq() ? <HqSettlements /> : <FrSettlements />
}
