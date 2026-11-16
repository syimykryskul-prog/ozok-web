import { useState } from 'react'
import { t, useT } from '../../i18n'
import { useList } from '../../api/hooks'
import type { Deal } from '../../api/types'
import { Badge, Button, Card, CardTitle, DataTable, ErrorAlert, Input, Money, Select, StatusChip } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { DEAL_LINE_KINDS, statusOptions } from '../../lib/status'
import { ReasonModal } from '../common/shared'
import { FranchiseeSelect } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'

const payStatus = (): Record<string, { label: string; tone: 'error' | 'warning' | 'success' }> => ({ unpaid: { label: t('deals.pay.unpaid'), tone: 'error' }, partial: { label: t('deals.pay.partial'), tone: 'warning' }, paid: { label: t('deals.pay.paid'), tone: 'success' } })

export function DealsList({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const t = useT()
  const PAY_STATUS = payStatus()
  const hq = useIsHq()
  const canConfirm = useCan('dealConfirm')
  const canCancel = useCan('dealCancel')
  const canMarkPaid = useCan('markDealPaid')
  const { act } = useAct()
  const [f, setF] = useState({ status: '', partner: '', nbs: '', date_from: dateFrom ?? '', date_to: dateTo ?? '' })
  const [page, setPage] = useState(1)
  const [cancel, setCancel] = useState<Deal | null>(null)
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); setPage(1) }
  const { rows, data, isLoading, error } = useList<Deal>('deals/', {
    page, page_size: 20, ordering: '-date', status: f.status, partner: f.partner || undefined, nbs_direct: f.nbs === 'true' ? 'true' : undefined, date_from: f.date_from, date_to: f.date_to,
  })
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('deals.listTitle')}</CardTitle></div>
      <div className="filters" style={{ padding: '0 24px' }}>
        <Select label={t('common.status')} placeholder={t('common.all')} options={statusOptions('deal')} value={f.status} onChange={(e) => set('status', e.target.value)} />
        <Input label={t('common.from')} type="date" value={f.date_from} onChange={(e) => set('date_from', e.target.value)} />
        <Input label={t('common.to')} type="date" value={f.date_to} onChange={(e) => set('date_to', e.target.value)} />
        {hq && <FranchiseeSelect label={t('deals.partner')} placeholder={t('common.all')} value={f.partner} onChange={(v) => set('partner', v)} />}
        {hq && <Select label={t('common.type')} placeholder={t('common.all')} options={[{ value: 'true', label: t('deals.onlyNbs') }]} value={f.nbs} onChange={(e) => set('nbs', e.target.value)} />}
      </div>
      <ErrorAlert error={error} />
      <DataTable
        loading={isLoading} rows={rows} rowKey={(r) => r.id} page={page} total={data?.count} onPage={setPage}
        emptyTitle={t('deals.empty')} emptyText={t('deals.emptyText')}
        columns={[
          { key: 'd', header: t('common.date'), render: (r) => formatDate(r.date) },
          { key: 'c', header: t('deals.colClient'), render: (r) => <div><strong>{r.client_title ?? r.client_name}</strong>{hq && <div className="muted" style={{ fontSize: 12 }}>{r.partner_name ?? t('deals.nbsLabel')}</div>}</div> },
          { key: 'p', header: t('deals.colContent'), render: (r) => <div>{r.product_name}<div className="muted" style={{ fontSize: 12 }}>{(r.items ?? []).map((l) => DEAL_LINE_KINDS[l.kind] ?? l.kind).join(', ')}</div></div> },
          { key: 'l', header: t('deals.colList'), align: 'right', render: (r) => <Money value={r.list_total ?? 0} /> },
          { key: 'ds', header: t('deals.colDiscount'), align: 'right', render: (r) => <Money value={r.discount_total ?? 0} /> },
          { key: 't', header: t('deals.colToPay'), align: 'right', render: (r) => <strong><Money value={r.total ?? 0} /></strong> },
          { key: 'i', header: t('deals.colPartnerIncome'), align: 'right', render: (r) => (r.partner ? <div><Money value={r.partner_income_total ?? 0} />{(r.items ?? []).some((l) => l.kind === 'subscription') && <div className="muted" style={{ fontSize: 12 }}>{t('deals.subIncomeNote')}</div>}</div> : <Badge small>OZOK</Badge>) },
          { key: 's', header: t('common.status'), render: (r) => (
            <div><StatusChip kind="deal" status={r.status} small />{r.cancel_reason && <div className="muted" style={{ fontSize: 12 }}>{r.cancel_reason}</div>}</div>) },
          { key: 'pay', header: t('deals.colPayment'), render: (r) => (r.payment_status ? <Badge small tone={PAY_STATUS[r.payment_status]?.tone}>{PAY_STATUS[r.payment_status]?.label ?? r.payment_status}</Badge> : '—') },
          { key: 'ct', header: t('deals.colContract'), render: (r) => (r.contract_number || r.signed_at ? <div>{r.contract_number || '—'}<div className="muted" style={{ fontSize: 12 }}>{r.signed_at ? t('deals.signedOn', { date: formatDate(r.signed_at) }) : t('deals.notSigned')}</div></div> : <span className="muted">—</span>) },
          { key: 'a', header: '', render: (r) => (
            <div className="kcard__actions">
              {canConfirm && ['draft', 'pending_approval'].includes(r.status) && (hq || r.status === 'draft') && <Button size="sm" onClick={() => act(`deals/${r.id}/confirm/`, undefined, t('deals.toastConfirmed'))}>{t('deals.confirm')}</Button>}
              {canMarkPaid && r.status === 'confirmed' && r.payment_status !== 'paid' && <Button size="sm" variant="secondary" onClick={() => act(`deals/${r.id}/mark-paid/`, undefined, t('deals.markedPaid'))}>{t('deals.markPaid')}</Button>}
              {canCancel && r.status !== 'cancelled' && <Button size="sm" variant="danger" onClick={() => setCancel(r)}>{t('deals.cancel')}</Button>}
            </div>) },
        ]}
      />
      {cancel && <ReasonModal title={t('deals.cancelTitle')} submitLabel={t('deals.cancelBtn')} hint={t('deals.cancelHint')} onClose={() => setCancel(null)}
        onSubmit={(reason) => act(`deals/${cancel.id}/cancel/`, { reason }, t('deals.cancelled'))} />}
    </Card>
  )
}
