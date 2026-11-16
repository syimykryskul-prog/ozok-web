import { useState } from 'react'
import { AlarmClock, Plus } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Implementation } from '../../api/types'
import { Badge, Button, Card, DataTable, ErrorAlert, FormModal, Input, PageHeader, SearchInput, Select, StatusChip, Textarea } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { statusOptions } from '../../lib/status'
import { ClientSelect, ProductSelect, UserSelect, toId } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useUser } from '../../app/hooks'
import { useT } from '../../i18n'

function ImplForm({ client, onClose }: { client?: number; onClose: () => void }) {
  const t = useT()
  const user = useUser()
  const { act, busy } = useAct()
  const f = useForm({ client: client ? String(client) : '', product: '', planned_launch: '', responsible: '', note: '' })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.client) e.client = [t('impl.pickClient')]
    if (!f.v.product) e.product = [t('impl.pickProduct')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act('implementations/', {
      client: Number(f.v.client), product: toId(f.v.product), stage: 'contract', planned_launch: f.v.planned_launch || null,
      responsible: toId(f.v.responsible), note: f.v.note,
    }, t('impl.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('impl.newTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <div className="span-2"><ClientSelect value={f.v.client} onChange={(v) => f.set('client', v)} error={f.errors.client} disabled={!!client} franchisee={user?.franchisee?.id} /></div>
        <ProductSelect value={f.v.product} onChange={(v) => f.set('product', v)} error={f.errors.product} />
        <Input label={t('impl.plannedLaunch')} type="date" value={f.v.planned_launch} onChange={(e) => f.set('planned_launch', e.target.value)} />
        {user?.franchisee && <div className="span-2"><UserSelect franchisee={user.franchisee.id} value={f.v.responsible} onChange={(v) => f.set('responsible', v)} /></div>}
        <div className="span-2"><Textarea label={t('impl.note')} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} /></div>
      </div>
    </FormModal>
  )
}

export function ImplementationsList({ client, franchisee, embedded }: { client?: number; franchisee?: number; embedded?: boolean }) {
  const t = useT()
  const hq = useIsHq()
  const canWrite = useCan('clientsWrite')
  const { act } = useAct()
  const [creating, setCreating] = useState(false)
  const ls = useListState({ stage: '', overdue: '' })
  const { rows, data, isLoading, error } = useList<Implementation>('implementations/', { ...ls.params, client, franchisee, overdue: ls.filters.overdue })

  return (
    <div className="page">
      {!embedded && <PageHeader eyebrow={t('impl.eyebrow')} title={t('impl.title')} actions={canWrite && <Button icon={Plus} onClick={() => setCreating(true)}>{t('impl.newTitle')}</Button>} />}
      {embedded && canWrite && <div className="row"><Button size="sm" icon={Plus} onClick={() => setCreating(true)}>{t('impl.newTitle')}</Button></div>}
      {!client && (
        <div className="filters">
          <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('impl.clientSearch')} />
          <Select label={t('impl.stage')} options={statusOptions('stage')} placeholder={t('common.all')} value={ls.filters.stage} onChange={(e) => ls.setFilter('stage', e.target.value)} />
          <Select label={t('impl.due')} options={[{ value: 'true', label: t('impl.overdueOnly') }]} placeholder={t('common.all')} value={ls.filters.overdue} onChange={(e) => ls.setFilter('overdue', e.target.value)} />
        </div>
      )}
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id}
          page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('impl.emptyTitle')} emptyText={t('impl.emptyText')}
          columns={[
            { key: 'c', header: t('impl.colClient'), render: (r) => <div><strong>{r.client_name}</strong>{hq && !franchisee && <div className="muted" style={{ fontSize: 12 }}>{r.franchisee_name}</div>}</div> },
            { key: 'p', header: t('impl.colProduct'), render: (r) => r.product_name },
            { key: 's', header: t('impl.stage'), render: (r) => <span className="row" style={{ gap: 6 }}><StatusChip kind="stage" status={r.stage} small />{r.overdue && <Badge tone="error" icon={AlarmClock} small>{t('impl.overdue')}</Badge>}</span> },
            { key: 'pl', header: t('impl.colPlanned'), render: (r) => formatDate(r.planned_launch) },
            { key: 'l', header: t('impl.colLaunched'), render: (r) => formatDate(r.launched_at) },
            { key: 'r', header: t('common.responsible'), render: (r) => r.responsible_name ?? '—' },
            ...(canWrite ? [{
              key: 'a', header: t('impl.changeStage'), render: (r: Implementation) => (
                <Select aria-label={t('impl.changeStage')} className="select--sm" options={statusOptions('stage')} value={r.stage}
                  onChange={(e) => act(`implementations/${r.id}/stage/`, { stage: e.target.value }, t('impl.stageChanged'))} />
              ),
            }] : []),
          ]}
        />
      </Card>
      {creating && <ImplForm client={client} onClose={() => setCreating(false)} />}
    </div>
  )
}

export default function ImplementationsPage() {
  return <ImplementationsList />
}
