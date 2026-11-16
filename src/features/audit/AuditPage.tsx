import { useState } from 'react'
import { Card, Input, PageHeader, Select } from '../../components/ui'
import { AUDIT_ACTIONS, dictOptions } from '../../lib/status'
import { AuditTable } from '../common/shared'
import { useT } from '../../i18n'

export default function AuditPage() {
  const t = useT()
  const [f, setF] = useState({ entity: '', entity_id: '', action: '', date_from: '', date_to: '' })
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))
  return (
    <div className="page">
      <PageHeader eyebrow={t('audit.eyebrow')} title={t('audit.title')} />
      <div className="filters">
        <Input label={t('audit.entity')} placeholder={t('audit.entityPh')} value={f.entity} onChange={(e) => set('entity', e.target.value)} />
        <Input label={t('audit.entityId')} value={f.entity_id} onChange={(e) => set('entity_id', e.target.value)} />
        <Select label={t('shared.action')} placeholder={t('common.all')} options={dictOptions(AUDIT_ACTIONS)} value={f.action} onChange={(e) => set('action', e.target.value)} />
        <Input label={t('common.from')} type="date" value={f.date_from} onChange={(e) => set('date_from', e.target.value)} />
        <Input label={t('common.to')} type="date" value={f.date_to} onChange={(e) => set('date_to', e.target.value)} />
      </div>
      <Card white flush>
        <AuditTable showEntity params={{ entity: f.entity || undefined, entity_id: f.entity_id || undefined, action: f.action || undefined, date_from: f.date_from || undefined, date_to: f.date_to || undefined }} />
      </Card>
    </div>
  )
}
