import { useList } from '../../api/hooks'
import type { ClientAccount, ClientSale } from '../../api/types'
import { Badge, DataTable, ErrorAlert, Money, StatusChip } from '../../components/ui'
import { formatDate, toNum } from '../../lib/format'
import { SALE_KINDS } from '../../lib/status'
import { t, useT } from '../../i18n'

export function paidState(until: string | null): { tone: 'success' | 'warning' | 'error' | 'neutral'; text: string } {
  if (!until) return { tone: 'neutral', text: t('clients.paid.none') }
  const days = Math.ceil((new Date(until).getTime() - Date.now()) / 86400000)
  if (days < 0) return { tone: 'error', text: t('clients.paid.overdue') }
  if (days <= 14) return { tone: 'warning', text: t('clients.paid.soon') }
  return { tone: 'success', text: t('clients.paid.ok') }
}


/** Аккаунты клиента в продуктах (данные приходят из продуктов по интеграции). */
export function AccountsTable({ accounts }: { accounts?: ClientAccount[] }) {
  const t = useT()
  return (
    <DataTable
      rows={accounts ?? []} rowKey={(r) => `${r.product}-${r.external_id}`}
      emptyTitle={t('clients.accounts.emptyTitle')} emptyText={t('clients.accounts.emptyText')}
      columns={[
        { key: 'p', header: t('clients.product'), render: (r) => <strong>{r.product_name}</strong> },
        { key: 'e', header: t('clients.externalId'), render: (r) => <span className="muted">{r.external_id}</span> },
        { key: 's', header: t('common.status'), render: (r) => <StatusChip kind="subscription" status={r.status} small /> },
        { key: 'f', header: t('clients.perMonth'), align: 'right', render: (r) => (r.monthly_fee ? <Money value={r.monthly_fee} /> : '—') },
        { key: 'u', header: t('clients.paidUntil'), render: (r) => { const s = paidState(r.paid_until); return <span className="row" style={{ gap: 6 }}>{formatDate(r.paid_until)}<Badge tone={s.tone} small>{s.text}</Badge></span> } },
      ]}
    />
  )
}

/** История оплат клиента, пришедших из продуктов. */
export function PaymentHistory({ client }: { client: number }) {
  const t = useT()
  const { rows, isLoading, error } = useList<ClientSale>('client-sales/', { client, page_size: 50, ordering: '-date' })
  const items = (rows ?? []).filter((r) => r.source === 'integration' || ['subscription', 'renewal'].includes(r.kind))
  return (
    <div className="stack">
      <ErrorAlert error={error} />
      <DataTable
        loading={isLoading} rows={items} rowKey={(r) => r.id}
        emptyTitle={t('clients.pay.emptyTitle')} emptyText={t('clients.pay.emptyText')}
        columns={[
          { key: 'd', header: t('common.date'), render: (r) => formatDate(r.date) },
          { key: 'p', header: t('clients.product'), render: (r) => r.product_name },
          { key: 'k', header: t('clients.kind'), render: (r) => SALE_KINDS[r.kind] ?? r.kind },
          { key: 'm', header: t('clients.months'), align: 'right', render: (r) => r.months ?? '—' },
          { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <span className={toNum(r.amount) < 0 ? 'amount-neg' : ''}><Money value={r.amount} /></span> },
          { key: 'u', header: t('clients.paidUntil'), render: (r) => formatDate(r.paid_until) },
        ]}
      />
    </div>
  )
}
