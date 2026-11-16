import { useList } from '../../api/hooks'
import type { CommissionRule, Contract } from '../../api/types'
import { Badge, Card, CardTitle, DataTable, ErrorAlert, Money, PageHeader, StatusChip } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { SCHEMES } from '../../lib/status'
import { PayoffProgress } from '../contracts/ContractsPage'
import { describeCalc, describeScope } from '../settings/RulesPanel'
import { useT } from '../../i18n'

export default function TermsPage() {
  const t = useT()
  const rules = useList<CommissionRule>('commission-rules/', { page_size: 100, is_active: true })
  const contracts = useList<Contract>('contracts/', { page_size: 50 })
  return (
    <div className="page">
      <PageHeader eyebrow={t('terms.eyebrow')} title={t('terms.title')} />
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('terms.rules')}</CardTitle></div>
        <ErrorAlert error={rules.error} />
        <DataTable
          loading={rules.isLoading} rows={rules.rows} rowKey={(r) => r.id}
          emptyTitle={t('terms.noRules')} emptyText={t('terms.noRulesText')}
          columns={[
            { key: 'n', header: t('terms.colRule'), render: (r) => <strong>{r.name}</strong> },
            { key: 's', header: t('terms.colScope'), render: (r) => describeScope(r) },
            { key: 'c', header: t('terms.colCalc'), render: (r) => describeCalc(r) },
            { key: 'v', header: t('terms.colTerm'), render: (r) => (r.valid_from || r.valid_to ? `${r.valid_from ? formatDate(r.valid_from) : '…'} — ${r.valid_to ? formatDate(r.valid_to) : '…'}` : t('terms.indefinite')) },
          ]}
        />
      </Card>
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('terms.myContracts')}</CardTitle></div>
        <ErrorAlert error={contracts.error} />
        <DataTable
          loading={contracts.isLoading} rows={contracts.rows} rowKey={(r) => r.id}
          emptyTitle={t('terms.noContracts')}
          columns={[
            { key: 'n', header: t('terms.colContract'), render: (r) => <div><strong>{r.number}</strong><div className="muted" style={{ fontSize: 12 }}>{r.package_name ?? r.product_name}</div></div> },
            { key: 's', header: t('terms.colScheme'), render: (r) => SCHEMES[r.payment_scheme] ?? r.payment_scheme },
            { key: 'a', header: t('terms.colFee'), align: 'right', render: (r) => <Money value={r.fee_total} /> },
            { key: 'w', header: t('terms.colWithhold'), render: (r) => (r.withhold_percent != null ? <Badge small>{Number(r.withhold_percent)}%</Badge> : '—') },
            { key: 'st', header: t('common.status'), render: (r) => <StatusChip kind="contract" status={r.status} small /> },
            { key: 'p', header: t('terms.colPayoff'), render: (r) => <PayoffProgress c={r} /> },
          ]}
        />
      </Card>
    </div>
  )
}
