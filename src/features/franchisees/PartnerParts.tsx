import { useState } from 'react'
import { useList } from '../../api/hooks'
import type { Franchisee, PartnerHistoryItem } from '../../api/types'
import { Badge, Card, CardTitle, DataTable, Dl, FormModal, Input, Select, StatusChip, Textarea } from '../../components/ui'
import { useUser } from '../../app/hooks'
import { formatDate, formatPhone, toISODate } from '../../lib/format'
import { canSeePersonal } from '../../lib/permissions'
import { CANDIDATE_SOURCES, CERT_RESULTS, FUNNEL_STAGES, PARTNER_TIERS, REGIONS, dictOptions } from '../../lib/status'
import { useForm } from '../../lib/useForm'
import { Masked } from '../common/shared'
import { useAct } from '../common/useAct'
import { useT } from '../../i18n'

export function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null
  return <Badge tone={tier === 'growth' ? 'success' : 'info'} small>{PARTNER_TIERS[tier] ?? tier}</Badge>
}

export function PartnerProfileCard({ fr }: { fr: Franchisee }) {
  const t = useT()
  const user = useUser()
  const personal = canSeePersonal(user?.role)
  const mask = (v?: string) => (personal ? v || '—' : <Masked value={v ? '***' : ''} />)
  return (
    <Card white>
      <CardTitle>{t('franchisees.card.title')}</CardTitle>
      <Dl items={[
        [t('franchisees.card.fullOwner'), fr.full_name || fr.owner_name], [t('franchisees.form.legalName'), fr.legal_name],
        [t('franchisees.form.inn'), mask(fr.inn)], [t('franchisees.form.passport'), mask(fr.passport)],
        [t('common.phone'), formatPhone(fr.phone)], [t('common.email'), fr.email],
        [t('common.region'), fr.region ? REGIONS[fr.region] ?? fr.region : '—'], [t('franchisees.card.cities'), (fr.cities ?? []).join(', ')], [t('franchisees.form.address'), fr.address],
        [t('franchisees.card.specialization'), (fr.specialization_names ?? fr.products ?? []).join(', ') || '—'],
        [t('franchisees.form.source'), fr.candidate_source ? CANDIDATE_SOURCES[fr.candidate_source] ?? fr.candidate_source : '—'],
        [t('franchisees.card.recruiter'), fr.recruited_by_name], [t('common.responsible'), fr.responsible_name ?? fr.curator_name],
        [t('franchisees.card.funnelStage'), fr.funnel_stage ? FUNNEL_STAGES[fr.funnel_stage] ?? fr.funnel_stage : '—'],
        [t('franchisees.form.trainingDate'), formatDate(fr.training_date)],
        [t('franchisees.card.certification'), fr.certification_result ? <span>{CERT_RESULTS[fr.certification_result]} · {formatDate(fr.certification_date)}</span> : '—'],
        [t('franchisees.card.joined'), formatDate(fr.joined_at)], [t('franchisees.card.statusReason'), fr.status_reason], [t('franchisees.form.note'), fr.note],
      ]} />
    </Card>
  )
}

export function TierModal({ fr, onClose }: { fr: Franchisee; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ tier: fr.tier ?? 'standard', effective_from: toISODate(new Date()), reason: '' })
  const submit = async () => {
    if (!f.v.reason.trim()) return f.fail({ data: { reason: [t('franchisees.tier.reasonRequired')] } })
    const r = await act('partner-status-history/', { partner: fr.id, field: 'tier', new: f.v.tier, effective_from: f.v.effective_from, reason: f.v.reason.trim() }, t('franchisees.tier.changed'))
    if (r !== undefined) onClose()
  }
  return (
    <FormModal title={t('franchisees.tier.title')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Select label={t('franchisees.form.tier')} options={dictOptions(PARTNER_TIERS)} value={f.v.tier} onChange={(e) => f.set('tier', e.target.value)} />
      <Input label={t('franchisees.tier.fromDate')} type="date" value={f.v.effective_from} onChange={(e) => f.set('effective_from', e.target.value)} error={f.errors.effective_from}
        hint={t('franchisees.tier.hint')} />
      <Textarea label={t('common.reason')} value={f.v.reason} onChange={(e) => f.set('reason', e.target.value)} error={f.errors.reason} />
    </FormModal>
  )
}

export function StatusHistory({ id }: { id: number }) {
  const t = useT()
  const [page, setPage] = useState(1)
  const { rows, data, isLoading } = useList<PartnerHistoryItem>('partner-status-history/', { partner: id, page, page_size: 20, ordering: '-effective_from' })
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('franchisees.hist.title')}</CardTitle></div>
      <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} page={page} total={data?.count} onPage={setPage}
        emptyTitle={t('franchisees.hist.empty')} emptyText=" "
        columns={[
          { key: 'f', header: t('franchisees.hist.field'), render: (r) => (r.field === 'tier' ? t('franchisees.hist.tier') : r.field === 'status' ? t('common.status') : t('franchisees.hist.funnel')) },
          { key: 'o', header: t('franchisees.hist.was'), render: (r) => (r.field === 'status' && r.old ? <StatusChip kind="franchisee" status={r.old} small /> : r.old ? (PARTNER_TIERS[r.old] ?? FUNNEL_STAGES[r.old] ?? r.old) : '—') },
          { key: 'n', header: t('franchisees.hist.became'), render: (r) => (r.field === 'status' ? <StatusChip kind="franchisee" status={r.new} small /> : PARTNER_TIERS[r.new] ?? FUNNEL_STAGES[r.new] ?? r.new) },
          { key: 'e', header: t('franchisees.hist.effective'), render: (r) => formatDate(r.effective_from) },
          { key: 'r', header: t('common.reason'), render: (r) => r.reason || '—' },
          { key: 'u', header: t('franchisees.hist.who'), render: (r) => r.decided_by_name ?? '—' },
          { key: 'c', header: t('common.created'), render: (r) => formatDate(r.created_at) },
        ]} />
    </Card>
  )
}
