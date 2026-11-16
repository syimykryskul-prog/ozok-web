import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { AppUser, Franchisee } from '../../api/types'
import { Badge, Button, Card, ErrorAlert, FormModal, Input, PageHeader, SearchInput, Select, StatusChip, Textarea } from '../../components/ui'
import { formatDate, formatPhone } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { CANDIDATE_SOURCES, FUNNEL_STAGES, dictOptions } from '../../lib/status'
import { canRead } from '../../lib/permissions'
import { toId } from '../common/pickers'
import { useAct, useCan } from '../common/useAct'
import { useT } from '../../i18n'

export function useNbsUsers(roles: string[]) {
  const { rows } = useList<AppUser>('users/', { page_size: 100, is_active: true }, { skip: !canRead('users') })
  return (rows ?? []).filter((u) => roles.includes(u.role))
}
export const NBS_STAFF = ['super_admin', 'network_head', 'recruiter', 'hq_admin', 'hq_curator']

function CandidateForm({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const staff = useNbsUsers(NBS_STAFF)
  const recruiters = useNbsUsers(['recruiter', 'super_admin', 'network_head', 'hq_admin', 'hq_curator'])
  const f = useForm({ name: '', phone: '', city: '', region: '', candidate_source: 'instagram', recruited_by: '', responsible: '', note: '' })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.name.trim()) e.name = [t('candidates.nameRequired')]
    if (!f.v.city.trim()) e.city = [t('candidates.cityRequired')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act('franchisees/', {
      ...f.v, full_name: f.v.name.trim(), name: f.v.name.trim(), status: 'candidate', funnel_stage: 'new_application',
      recruited_by: toId(f.v.recruited_by), responsible: toId(f.v.responsible), cities: [f.v.city.trim()],
    }, t('candidates.added'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('candidates.newTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <div className="span-2"><Input label={t('common.fullName')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} /></div>
        <Input label={t('common.phone')} value={f.v.phone} onChange={(e) => f.set('phone', e.target.value)} placeholder="0555 000 000" />
        <Input label={t('common.city')} value={f.v.city} onChange={(e) => f.set('city', e.target.value)} error={f.errors.city} />
        <Select label={t('candidates.source')} options={dictOptions(CANDIDATE_SOURCES)} value={f.v.candidate_source} onChange={(e) => f.set('candidate_source', e.target.value)} />
        <Input label={t('common.region')} value={f.v.region} onChange={(e) => f.set('region', e.target.value)} />
        <Select label={t('candidates.recruitedBy')} placeholder="—" options={recruiters.map((u) => ({ value: u.id, label: u.full_name || u.email }))} value={f.v.recruited_by} onChange={(e) => f.set('recruited_by', e.target.value)} />
        <Select label={t('common.responsible')} placeholder="—" options={staff.map((u) => ({ value: u.id, label: u.full_name || u.email }))} value={f.v.responsible} onChange={(e) => f.set('responsible', e.target.value)} />
        <div className="span-2"><Textarea label={t('candidates.note')} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} /></div>
      </div>
    </FormModal>
  )
}

export default function CandidatesPage() {
  const t = useT()
  const navigate = useNavigate()
  const canWrite = useCan('candidates')
  const { act } = useAct()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [stuck, setStuck] = useState('')
  const [recruiter, setRecruiter] = useState('')
  const staff = useNbsUsers(NBS_STAFF)
  const { rows, isLoading, error } = useList<Franchisee>('franchisees/', { page_size: 200, search: q, recruited_by: recruiter || undefined, stuck_days: stuck || undefined })
  const n = Number(stuck)
  const list = useMemo(() => (rows ?? []).filter((c) => (c.funnel_stage || c.status === 'candidate' || c.status === 'trainee' || c.status === 'manager')
    && (!n || (c.days_in_stage ?? 0) > n)), [rows, n])
  const stages = Object.keys(FUNNEL_STAGES)
  const move = (c: Franchisee, stage: string) => act(`franchisees/${c.id}/`, { funnel_stage: stage }, t('candidates.stageChanged'), 'PATCH')

  return (
    <div className="page">
      <PageHeader eyebrow={t('candidates.eyebrow')} title={t('candidates.title')} actions={canWrite && <Button icon={Plus} onClick={() => setCreating(true)}>{t('candidates.newTitle')}</Button>} />
      <div className="filters">
        <SearchInput value={q} onChange={setQ} placeholder={t('candidates.searchPh')} />
        <Select label={t('candidates.recruitedBy')} placeholder={t('common.all')} options={staff.map((u) => ({ value: u.id, label: u.full_name || u.email }))} value={recruiter} onChange={(e) => setRecruiter(e.target.value)} />
        <Select label={t('candidates.stuck')} placeholder={t('common.all')} value={stuck} onChange={(e) => setStuck(e.target.value)}
          options={[3, 7, 14, 30].map((d) => ({ value: d, label: t('candidates.moreThanDays', { n: d }) }))} />
      </div>
      <ErrorAlert error={error} />
      {isLoading ? <Card><span className="skeleton" style={{ height: 160 }} /></Card> : (
        <div className="kanban">
          {stages.map((s) => {
            const items = list.filter((c) => (c.funnel_stage || 'new_application') === s)
            return (
              <div className="kanban__col" key={s}>
                <div className="kanban__head"><span>{FUNNEL_STAGES[s]}</span><Badge small>{items.length}</Badge></div>
                {items.length === 0 && <span className="muted" style={{ fontSize: 13 }}>{t('candidates.empty')}</span>}
                {items.map((c) => (
                  <div className="kcard" key={c.id} onClick={() => navigate(`/franchisees/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="kcard__title">{c.full_name || c.name}</div>
                    <div className="muted">{[c.city, c.phone && formatPhone(c.phone)].filter(Boolean).join(' · ')}</div>
                    <div className="row" style={{ gap: 6 }}><StatusChip kind="franchisee" status={c.status} small />
                      {c.days_in_stage != null && <Badge small tone={c.days_in_stage > 14 ? 'error' : c.days_in_stage > 7 ? 'warning' : 'neutral'}>{t('candidates.daysInStage', { n: c.days_in_stage })}</Badge>}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{t('candidates.responsibleLine', { name: c.responsible_name ?? '—' })}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{t('candidates.recruiterLine', { name: c.recruited_by_name ?? '—' })}{c.joined_at ? ` · ${formatDate(c.joined_at)}` : ''}</div>
                    {canWrite && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select aria-label={t('candidates.moveAria')} placeholder={t('candidates.movePh')} options={stages.filter((x) => x !== s).map((x) => ({ value: x, label: FUNNEL_STAGES[x] }))} value="" onChange={(e) => e.target.value && move(c, e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
      {creating && <CandidateForm onClose={() => setCreating(false)} />}
    </div>
  )
}
