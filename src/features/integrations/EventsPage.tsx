import { useState } from 'react'
import { Link2, RotateCw } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Client, IntegrationEvent } from '../../api/types'
import { Badge, Button, Card, DataTable, Dl, ErrorAlert, FormModal, Input, PageHeader, Select } from '../../components/ui'
import { t } from '../../i18n'
import { formatDateTime } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { FranchiseeSelect, toId, useProducts } from '../common/pickers'
import { useAct, useCan } from '../common/useAct'
import type { Tone } from '../../lib/status'

const evStatus = (): Record<string, { label: string; tone: Tone }> => ({
  processed: { label: t('events.st.processed'), tone: 'success' }, duplicate: { label: t('events.st.duplicate'), tone: 'neutral' },
  unmatched: { label: t('events.st.unmatched'), tone: 'warning' }, error: { label: t('events.st.error'), tone: 'error' },
})
const evTypes = (): Record<string, string> => ({ 'client.upsert': t('events.type.client'), 'payment.succeeded': t('events.type.payment'), 'payment.refunded': t('events.type.refund') })

function ResolveModal({ ev, onClose }: { ev: IntegrationEvent; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({ franchisee: String(ev.franchisee ?? ''), client: '' })
  const { rows: clients } = useList<Client>('clients/', { page_size: 100, franchisee: f.v.franchisee }, { skip: !f.v.franchisee })
  const submit = async () => {
    if (!f.v.franchisee) return f.fail({ data: { franchisee: [t('events.err.franchisee')] } })
    const r = await act(`integration-events/${ev.id}/resolve/`, { franchisee: Number(f.v.franchisee), client: toId(f.v.client) ?? undefined }, t('events.processed'))
    if (r) onClose()
  }
  return (
    <FormModal wide title={t('events.resolve.title')} onClose={onClose} onSubmit={submit} saving={busy} submitLabel={t('events.resolve.submit')} error={f.general}>
      <Dl items={[[t('events.product'), ev.product_name], [t('common.type'), evTypes()[ev.event_type] ?? ev.event_type], [t('events.received'), formatDateTime(ev.received_at)], [t('common.error'), ev.error]]} />
      <pre style={{ background: 'var(--mist)', padding: 12, borderRadius: 12, overflowX: 'auto', fontSize: 12, margin: 0 }}>{JSON.stringify(ev.payload, null, 2)}</pre>
      <FranchiseeSelect value={f.v.franchisee} onChange={(v) => { f.set('franchisee', v); f.set('client', '') }} error={f.errors.franchisee} />
      {f.v.franchisee && (
        <Select label={t('events.resolve.client')} placeholder={t('events.resolve.auto')} value={f.v.client} onChange={(e) => f.set('client', e.target.value)}
          options={(clients ?? []).map((c) => ({ value: c.id, label: c.business_name }))} />
      )}
      <Input label={t('events.resolve.partner_code')} value={String((ev.payload as { partner_code?: string })?.partner_code ?? '—')} readOnly />
    </FormModal>
  )
}

export default function EventsPage() {
  const canResolve = useCan('integrationsResolve')
  const { act, busy } = useAct()
  const products = useProducts()
  const [res, setRes] = useState<IntegrationEvent | null>(null)
  const ls = useListState({ status: '', product: '', event_type: '' }, '-received_at')
  const { rows, data, isLoading, error } = useList<IntegrationEvent>('integration-events/', ls.params)
  return (
    <div className="page">
      <PageHeader eyebrow={t('events.eyebrow')} title={t('events.title')} actions={<Button variant={ls.filters.status === 'unmatched' ? 'primary' : 'secondary'} onClick={() => ls.setFilter('status', ls.filters.status === 'unmatched' ? '' : 'unmatched')}>{t('events.unmatched')}</Button>} />
      <div className="filters">
        <Select label={t('common.status')} options={Object.entries(evStatus()).map(([value, s]) => ({ value, label: s.label }))} placeholder={t('common.all')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        <Select label={t('events.product')} options={products.map((p) => ({ value: p.code, label: p.name }))} placeholder={t('common.all')} value={ls.filters.product} onChange={(e) => ls.setFilter('product', e.target.value)} />
        <Select label={t('common.type')} options={Object.entries(evTypes()).map(([value, label]) => ({ value, label }))} placeholder={t('common.all')} value={ls.filters.event_type} onChange={(e) => ls.setFilter('event_type', e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id}
          ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('events.empty')} emptyText={t('events.empty_text')}
          columns={[
            { key: 'd', header: t('events.received'), sortKey: 'received_at', render: (r) => formatDateTime(r.received_at) },
            { key: 'p', header: t('events.source'), render: (r) => (r.provider === 'elqr' ? t('events.elqr') : r.product_name ?? '—') },
            { key: 't', header: t('events.event'), render: (r) => evTypes()[r.event_type] ?? r.event_type },
            { key: 'c', header: t('events.client_franchisee'), render: (r) => <div>{r.client_name ?? <span className="muted">—</span>}<div className="muted" style={{ fontSize: 12 }}>{r.franchisee_name ?? ''}</div></div> },
            { key: 's', header: t('common.status'), render: (r) => { const s = evStatus()[r.status]; return <Badge tone={s?.tone} small>{s?.label ?? r.status}</Badge> } },
            { key: 'e', header: t('common.error'), render: (r) => <span className="muted">{r.error ?? ''}</span> },
            { key: 'a', header: '', render: (r) => (canResolve && ['unmatched', 'error'].includes(r.status) ? (
              <div className="kcard__actions">
                {r.status === 'unmatched' && <Button size="sm" icon={Link2} onClick={() => setRes(r)}>{t('events.link')}</Button>}
                <Button size="sm" variant="secondary" icon={RotateCw} loading={busy} onClick={() => act(`integration-events/${r.id}/retry/`, undefined, t('events.retried'))}>{t('events.retry')}</Button>
              </div>) : null) },
          ]}
        />
      </Card>
      {res && <ResolveModal ev={res} onClose={() => setRes(null)} />}
    </div>
  )
}
