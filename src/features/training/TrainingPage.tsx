import { useState } from 'react'
import { ExternalLink, Plus } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Course, Enrollment } from '../../api/types'
import { ActiveChip, Badge, Button, Card, Checkbox, DataTable, ErrorAlert, FormModal, Input, PageHeader, SearchInput, Select, StatusChip, Tabs, Textarea } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { statusOptions } from '../../lib/status'
import { FranchiseeSelect, ProductSelect, UserSelect, toId } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useUser } from '../../app/hooks'
import { useT } from '../../i18n'
import { kyOf, ruOf } from '../../lib/kyField'

function CourseForm({ course, onClose }: { course?: Course; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({
    title: ruOf(course, 'title'), title_ky: kyOf(course, 'title_ky'), description_ky: kyOf(course, 'description_ky'), product: String(course?.product ?? ''), description: ruOf(course, 'description'), materials_url: course?.materials_url ?? '',
    pass_score: String(course?.pass_score ?? 80), validity_months: String(course?.validity_months ?? 12), is_active: course?.is_active ?? true,
  })
  const submit = async () => {
    if (!f.v.title.trim()) return f.fail({ data: { title: [t('training.enterTitle')] } })
    const body = { ...f.v, product: toId(f.v.product), pass_score: Number(f.v.pass_score), validity_months: Number(f.v.validity_months) }
    const r = course ? await act(`courses/${course.id}/`, body, t('training.courseSaved'), 'PATCH') : await act('courses/', body, t('training.courseCreated'))
    if (r) onClose()
  }
  return (
    <FormModal title={course ? t('training.course') : t('training.newCourse')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t('common.name')} value={f.v.title} onChange={(e) => f.set('title', e.target.value)} error={f.errors.title} />
      <Input label={t('settings.ky.name')} value={f.v.title_ky} onChange={(e) => f.set('title_ky', e.target.value)} />
      <ProductSelect label={t('training.sphereOpt')} placeholder={t('training.generalCourse')} value={f.v.product} onChange={(v) => f.set('product', v)} />
      <Input label={t('training.materialsUrl')} value={f.v.materials_url} onChange={(e) => f.set('materials_url', e.target.value)} placeholder="https://" />
      <div className="form-grid">
        <Input label={t('training.passScore')} type="number" value={f.v.pass_score} onChange={(e) => f.set('pass_score', e.target.value)} />
        <Input label={t('training.certTerm')} type="number" value={f.v.validity_months} onChange={(e) => f.set('validity_months', e.target.value)} />
      </div>
      <Textarea label={t('common.description')} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} />
      <Textarea label={t('settings.ky.description')} value={f.v.description_ky} onChange={(e) => f.set('description_ky', e.target.value)} />
      <Checkbox label={t('training.courseActive')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

function EnrollForm({ franchisee, onClose }: { franchisee?: number; onClose: () => void }) {
  const t = useT()
  const user = useUser(); const isHq = useIsHq()
  const { act, busy } = useAct()
  const { rows: courses } = useList<Course>('courses/', { page_size: 100, is_active: true })
  const f = useForm({ course: '', franchisee: String(franchisee ?? user?.franchisee?.id ?? ''), user: '' })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.course) e.course = [t('training.pickCourse')]
    if (!f.v.user) e.user = [t('training.pickEmployee')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act('enrollments/', { course: Number(f.v.course), user: Number(f.v.user) }, t('training.courseAssigned'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('training.assignCourse')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Select label={t('training.course')} placeholder={t('training.pickCourse')} value={f.v.course} error={f.errors.course} options={(courses ?? []).map((c) => ({ value: c.id, label: c.title }))} onChange={(e) => f.set('course', e.target.value)} />
      {isHq && !franchisee && <FranchiseeSelect value={f.v.franchisee} onChange={(v) => { f.set('franchisee', v); f.set('user', '') }} />}
      {f.v.franchisee ? <UserSelect label={t('training.employee')} placeholder={t('training.pickEmployee')} franchisee={f.v.franchisee} value={f.v.user} error={f.errors.user} onChange={(v) => f.set('user', v)} /> : <p className="muted">{t('training.pickFrFirst')}</p>}
    </FormModal>
  )
}

function CompleteModal({ e, onClose }: { e: Enrollment; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({ score: '' })
  const submit = async () => {
    const n = Number(f.v.score)
    if (f.v.score === '' || n < 0 || n > 100) return f.fail({ data: { score: [t('training.scoreRange')] } })
    const r = await act(`enrollments/${e.id}/complete/`, { score: n }, t('training.resultSaved'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('training.resultTitle', { name: e.user_name ?? '' })} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <p className="muted">{e.course_title}</p>
      <Input label={t('training.scoreLabel')} type="number" min={0} max={100} value={f.v.score} onChange={(ev) => f.set('score', ev.target.value)} error={f.errors.score} />
    </FormModal>
  )
}

export function EnrollmentsList({ franchisee }: { franchisee?: number }) {
  const t = useT()
  const hq = useIsHq()
  const canCreate = useCan('enrollCreate')
  const canComplete = useCan('enrollComplete')
  const canStart = useCan('enrollStart')
  const { act } = useAct()
  const [creating, setCreating] = useState(false)
  const [done, setDone] = useState<Enrollment | null>(null)
  const ls = useListState({ status: '', expired: '' })
  const { rows, data, isLoading, error } = useList<Enrollment>('enrollments/', { ...ls.params, franchisee })
  return (
    <div className="stack">
      {canCreate && <div className="row"><Button size="sm" icon={Plus} onClick={() => setCreating(true)}>{t('training.assignCourse')}</Button></div>}
      <div className="filters">
        <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('training.employeeName')} />
        <Select label={t('common.status')} options={statusOptions('enrollment')} placeholder={t('common.all')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        <Select label={t('training.certificate')} options={[{ value: 'true', label: t('training.expired') }]} placeholder={t('common.all')} value={ls.filters.expired} onChange={(e) => ls.setFilter('expired', e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('training.noAssignments')} emptyText={t('training.noAssignmentsText')}
          columns={[
            { key: 'u', header: t('training.employee'), render: (r) => <div><strong>{r.user_name}</strong>{hq && !franchisee && <div className="muted" style={{ fontSize: 12 }}>{r.franchisee_name}</div>}</div> },
            { key: 'c', header: t('training.course'), render: (r) => r.course_title },
            { key: 's', header: t('common.status'), render: (r) => <span className="row" style={{ gap: 6 }}><StatusChip kind="enrollment" status={r.status} small />{r.expired && <Badge tone="error" small>{t('training.certExpired')}</Badge>}</span> },
            { key: 'sc', header: t('training.score'), align: 'right', render: (r) => r.score ?? '—' },
            { key: 'cd', header: t('training.completed'), render: (r) => formatDate(r.completed_at) },
            { key: 'e', header: t('training.validUntil'), render: (r) => formatDate(r.expires_at) },
            {
              key: 'a', header: '', render: (r) => (
                <div className="kcard__actions">
                  {canStart && r.status === 'assigned' && <Button size="sm" onClick={() => act(`enrollments/${r.id}/start/`, undefined, t('training.courseStarted'))}>{t('training.start')}</Button>}
                  {canComplete && ['assigned', 'in_progress'].includes(r.status) && <Button size="sm" variant="secondary" onClick={() => setDone(r)}>{t('training.enterResult')}</Button>}
                </div>
              ),
            },
          ]}
        />
      </Card>
      {creating && <EnrollForm franchisee={franchisee} onClose={() => setCreating(false)} />}
      {done && <CompleteModal e={done} onClose={() => setDone(null)} />}
    </div>
  )
}

function CoursesList() {
  const t = useT()
  const canWrite = useCan('courses')
  const [form, setForm] = useState<Course | 'new' | null>(null)
  const { rows, isLoading, error } = useList<Course>('courses/', { page_size: 100 })
  return (
    <div className="stack">
      {canWrite && <div className="row"><Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('training.newCourse')}</Button></div>}
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={canWrite ? setForm : undefined}
          emptyTitle={t('training.noCourses')}
          columns={[
            { key: 't', header: t('training.course'), render: (r) => <div><strong>{r.title}</strong>{r.materials_url && <div><a href={r.materials_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink size={12} style={{ display: 'inline' }} aria-hidden /> {t('training.materials')}</a></div>}</div> },
            { key: 'p', header: t('training.passScore'), align: 'right', render: (r) => r.pass_score },
            { key: 'v', header: t('training.certificate'), render: (r) => t('training.months', { n: r.validity_months }) },
            { key: 'e', header: t('training.enrolled'), align: 'right', render: (r) => r.enrolled_count ?? 0 },
            { key: 'ps', header: t('training.passed'), align: 'right', render: (r) => r.passed_count ?? 0 },
            { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
          ]}
        />
      </Card>
      {form && <CourseForm course={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  )
}

export default function TrainingPage() {
  const t = useT()
  const [tab, setTab] = useState<'enr' | 'courses'>('enr')
  return (
    <div className="page">
      <PageHeader eyebrow={t('training.eyebrow')} title={t('training.title')} />
      <Tabs tabs={[{ value: 'enr', label: t('training.assignments') }, { value: 'courses', label: t('training.courses') }]} value={tab} onChange={setTab} />
      {tab === 'enr' ? <EnrollmentsList /> : <CoursesList />}
    </div>
  )
}
