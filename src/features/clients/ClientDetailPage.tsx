import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { ClientCard, ClientSale } from '../../api/types'
import { ActiveChip, Button, Card, CardTitle, DataTable, Dl, ErrorAlert, Money, PageHeader, Tabs } from '../../components/ui'
import { formatDate, formatPhone, toNum } from '../../lib/format'
import { BUSINESS_TYPES, SALE_KINDS } from '../../lib/status'
import { useCan } from '../common/useAct'
import { useT } from '../../i18n'
import { AccountsTable, PaymentHistory } from './accounts'
import { BranchesTab, ContactsTab } from './BranchPanel'
import { ImplementationsList } from '../implementations/ImplementationsPage'
import { TicketsList } from '../quality/QualityPage'
import { SaleModal } from '../sales/SalesPage'
import { ClientForm } from './ClientsPage'

type Tab = 'branches' | 'contacts' | 'subs' | 'pay' | 'impl' | 'sales' | 'tickets'

export default function ClientDetailPage() {
  const t = useT()
  const { id } = useParams()
  const clientId = Number(id)
  const canWrite = useCan('clientsWrite')
  const canSale = useCan('salesWrite')
  const { data: c, isLoading, error } = useOne<ClientCard>(`clients/${id}/`)
  const sales = useList<ClientSale>('client-sales/', { client: clientId, page_size: 50, ordering: '-date' })
  const [tab, setTab] = useState<Tab>('branches')
  const [edit, setEdit] = useState(false)
  const [sale, setSale] = useState(false)

  return (
    <div className="page">
      <Link to="/clients" className="row link-strong"><ArrowLeft size={16} aria-hidden /> {t('clients.allClients')}</Link>
      <ErrorAlert error={error} />
      {isLoading && <span className="skeleton" style={{ height: 80 }} />}
      {c && (
        <>
          <PageHeader eyebrow={BUSINESS_TYPES[c.business_type] ?? t('clients.client')} title={c.business_name} actions={canWrite && <Button variant="secondary" icon={Pencil} onClick={() => setEdit(true)}>{t('common.edit')}</Button>}>
            <div className="row"><ActiveChip active={c.is_active} />{c.franchisee_name && <span className="muted">{c.franchisee_name}</span>}</div>
          </PageHeader>
          <Card>
            <Dl items={[
              [t('clients.contactPerson'), c.contact_name], [t('common.phone'), formatPhone(c.phone)], [t('common.city'), c.city], [t('common.region'), c.region], [t('clients.address'), c.address],
              [t('clients.legalName'), c.legal_name], [t('clients.inn'), c.inn], [t('clients.note'), c.note],
            ]} />
          </Card>
          <Tabs<Tab> tabs={[{ value: 'branches', label: c.branches ? t('clients.tab.branchesN', { n: c.branches.length }) : t('clients.tab.branches') }, { value: 'contacts', label: t('clients.tab.contacts') }, { value: 'subs', label: t('clients.tab.subs') }, { value: 'pay', label: t('clients.tab.pay') }, { value: 'impl', label: t('clients.tab.impl') }, { value: 'sales', label: t('clients.tab.sales') }, { value: 'tickets', label: t('clients.tab.tickets') }]} value={tab} onChange={setTab} />
          {tab === 'branches' && <BranchesTab client={clientId} />}
          {tab === 'contacts' && <ContactsTab client={clientId} />}
          {tab === 'subs' && <Card white flush><AccountsTable accounts={c.accounts} /></Card>}
          {tab === 'pay' && <Card white flush><PaymentHistory client={clientId} /></Card>}
          {tab === 'impl' && <ImplementationsList client={clientId} embedded />}
          {tab === 'sales' && (
            <Card white flush>
              <div style={{ padding: '20px 24px 0' }}>
                <CardTitle actions={canSale && <Button size="sm" icon={Plus} onClick={() => setSale(true)}>{t('clients.addSale')}</Button>}>{t('clients.salesTo')}</CardTitle>
              </div>
              <DataTable
                loading={sales.isLoading} rows={sales.rows} rowKey={(r) => r.id}
                emptyTitle={t('clients.sales.emptyTitle')} emptyText={t('clients.sales.emptyText')}
                columns={[
                  { key: 'd', header: t('common.date'), render: (r) => formatDate(r.date) },
                  { key: 'p', header: t('clients.product'), render: (r) => r.product_name },
                  { key: 'k', header: t('clients.kind'), render: (r) => SALE_KINDS[r.kind] ?? r.kind },
                  { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.amount} /> },
                  { key: 'ca', header: t('clients.reward'), align: 'right', render: (r) => (toNum(r.commission_amount) ? <Money value={r.commission_amount} /> : '—') },
                ]}
              />
            </Card>
          )}
          {tab === 'tickets' && <TicketsList client={clientId} embedded />}
        </>
      )}
      {edit && c && <ClientForm client={c} onClose={() => setEdit(false)} />}
      {sale && <SaleModal client={clientId} onClose={() => setSale(false)} />}
    </div>
  )
}
