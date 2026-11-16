import { useState } from 'react'
import { useT } from '../../i18n'
import { BadgeCheck, ShieldQuestion } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Lead, LeadActivity } from '../../api/types'
import { Badge, Button, Dl, ErrorAlert, FormModal, Modal, Select, StatusChip, Tabs, Textarea } from '../../components/ui'
import { formatDate, formatDateTime, formatPhone } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { ACTIVITY_TYPES, CR_FIELDS, LEAD_INTERESTS, LEAD_SOURCES, STATUS, dictOptions } from '../../lib/status'
import { isPartnerRole } from '../../lib/permissions'
import { useUser } from '../../app/hooks'
import { HistoryTab, NameOf } from '../common/shared'
import { FranchiseeSelect, UserSelect, toId, useProductLabel } from '../common/pickers'
import { useAct, useCan } from '../common/useAct'

export function OwnerBadge({ lead }: { lead: Lead }) {
  const t = useT()
  if (lead.owner_confirmed === undefined) return null
  return lead.owner_confirmed
    ? <Badge tone="success" icon={BadgeCheck} small>{t('leads.ownerConfirmed')}</Badge>
    : <Badge tone="warning" icon={ShieldQuestion} small>{t('leads.ownerPending')}</Badge>
}

function ChangeRequestModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ field: 'source', value: '', reason: '' })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.value) e.value = [t('leads.err.newValue')]
    if (!f.v.reason.trim()) e.reason = [t('leads.err.crReason')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const nv = f.v.field === 'source' ? f.v.value : toId(f.v.value)
    const r = await act(`leads/${lead.id}/change-request/`, { field: f.v.field, value: nv, reason: f.v.reason.trim() }, t('leads.crSent'))
    if (r !== undefined) onClose()
  }
  return (
    <FormModal title={t('leads.crTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general} submitLabel={t('leads.send')}>
      <p className="muted">{t('leads.crNote')}</p>
      <Select label={t('leads.crWhat')} options={[{ value: 'source', label: CR_FIELDS.source }, { value: 'franchisee', label: CR_FIELDS.franchisee }, { value: 'implementer', label: CR_FIELDS.implementer }]}
        value={f.v.field} onChange={(e) => { f.set('field', e.target.value); f.set('value', '') }} />
      {f.v.field === 'source'
        ? <Select label={t('leads.newSource')} placeholder={t('leads.pick')} options={dictOptions(LEAD_SOURCES)} value={f.v.value} error={f.errors.value} onChange={(e) => f.set('value', e.target.value)} />
        : f.v.field === 'franchisee' ? <FranchiseeSelect label={t('leads.newPartner')} value={f.v.value} error={f.errors.value} onChange={(v) => f.set('value', v)} />
        : <UserSelect label={t('leads.newValue')} placeholder={t('leads.pick')} value={f.v.value} error={f.errors.value} onChange={(v) => f.set('value', v)} franchisee={lead.franchisee ?? undefined} />}
      <Textarea label={t('common.reason')} value={f.v.reason} error={f.errors.reason} onChange={(e) => f.set('reason', e.target.value)} />
    </FormModal>
  )
}

function Timeline({ leadId }: { leadId: number }) {
  const t = useT()
  const { act, busy } = useAct()
  const { rows, isLoading, error } = useList<LeadActivity>(`leads/${leadId}/activities/`, { page_size: 100, ordering: '-created_at' })
  const f = useForm({ type: 'call', text: '' })
  const add = async () => {
    if (!f.v.text.trim()) return f.fail({ data: { text: [t('leads.err.activity')] } })
    const r = await act(`leads/${leadId}/activities/`, { type: f.v.type, text: f.v.text.trim() }, t('leads.activityAdded'))
    if (r !== undefined) f.set('text', '')
  }
  return (
    <div className="stack">
      <div className="form-grid">
        <Select label={t('common.type')} options={Object.entries(ACTIVITY_TYPES).filter(([k]) => ['call', 'meeting', 'demo', 'proposal', 'note'].includes(k)).map(([value, label]) => ({ value, label }))} value={f.v.type} onChange={(e) => f.set('type', e.target.value)} />
        <div className="span-2"><Textarea label={t('leads.whatDone')} rows={2} value={f.v.text} error={f.errors.text} onChange={(e) => f.set('text', e.target.value)} /></div>
        <div><Button loading={busy} onClick={add}>{t('common.add')}</Button></div>
      </div>
      <ErrorAlert error={error} />
      {isLoading ? <span className="skeleton" style={{ height: 80 }} /> : (
        <ul className="list">
          {(rows ?? []).length === 0 && <li className="muted">{t('leads.noActivity')}</li>}
          {(rows ?? []).map((a) => (
            <li className="list__item" key={a.id} style={{ alignItems: 'flex-start' }}>
              <span><Badge small>{ACTIVITY_TYPES[a.type] ?? a.type}</Badge> {a.text}</span>
              <span className="muted nowrap" style={{ fontSize: 12 }}>{a.user_name ?? ''} · {formatDateTime(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type T = 'info' | 'activity' | 'history'

export function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const t = useT()
  const user = useUser()
  const canConfirm = useCan('leadConfirmOwner')
  const canAssign = useCan('leadAssign')
  const { act } = useAct()
  const prodLabel = useProductLabel()
  const [tab, setTab] = useState<T>('info')
  const [cr, setCr] = useState(false)
  const partner = isPartnerRole(user?.role)
  const flow = ['new', 'in_progress', 'demo', 'proposal', 'contract', 'paid', 'lost']
  const setStatus = (status: string) => act(`leads/${lead.id}/status/`, { status }, t('leads.statusChanged'))
  return (
    <Modal open wide title={lead.company_name || lead.name} onClose={onClose}>
      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <StatusChip kind="lead" status={lead.status} />
          <OwnerBadge lead={lead} />
          {canConfirm && lead.owner_confirmed === false && <Button size="sm" onClick={() => act(`leads/${lead.id}/confirm-owner/`, undefined, t('leads.ownerConfirmedDone'))}>{t('leads.confirmOwner')}</Button>}
          {partner && <Button size="sm" variant="secondary" onClick={() => setCr(true)}>{t('leads.crTitle')}</Button>}
        </div>
        <Tabs<T> tabs={[{ value: 'info', label: t('leads.tabInfo') }, { value: 'activity', label: t('leads.tabActivity') }, { value: 'history', label: t('leads.tabHistory') }]} value={tab} onChange={setTab} />
        {tab === 'info' && (
          <div className="stack">
            <Dl items={[
              [t('leads.company'), lead.company_name], [t('leads.contactPerson'), lead.contact_name || lead.name], [t('common.phone'), formatPhone(lead.phone)], [t('common.city'), lead.city], [t('common.region'), lead.region],
              [t('leads.source'), LEAD_SOURCES[lead.source] ?? lead.source], [t('leads.interest'), LEAD_INTERESTS[lead.interest] ?? lead.interest], [t('leads.product'), prodLabel(lead.product)],
              [t('leads.partner'), lead.franchisee_name ?? t('leads.notAssigned')], [t('leads.implementer'), lead.implementer ? <NameOf path="users/" id={lead.implementer} field="full_name" /> : null],
              [t('leads.nextContact'), formatDateTime(lead.next_contact_at)], [t('leads.created'), formatDate(lead.created_at)], [t('common.comment'), lead.comment], [t('leads.lostReason'), lead.lost_reason],
            ]} />
            {!partner && lead.status !== 'lost' && (
              <Select label={t('leads.changeStatus')} placeholder={t('leads.pickEllipsis')} options={flow.map((s) => ({ value: s, label: STATUS.lead[s].label }))} value="" onChange={(e) => e.target.value && setStatus(e.target.value)} />
            )}
            {canAssign && <p className="muted" style={{ fontSize: 13 }}>{t('leads.assignNote')}</p>}
          </div>
        )}
        {tab === 'activity' && <Timeline leadId={lead.id} />}
        {tab === 'history' && <HistoryTab entity="leads.Lead" id={lead.id} />}
      </div>
      {cr && <ChangeRequestModal lead={lead} onClose={() => setCr(false)} />}
    </Modal>
  )
}

