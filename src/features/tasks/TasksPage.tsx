import { useState } from 'react'
import { AlarmClock, LayoutGrid, Plus, Send, Table2 } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { Task, TaskComment } from '../../api/types'
import { Badge, Button, Card, DataTable, Dl, ErrorAlert, FormModal, Input, Modal, PageHeader, SearchInput, Select, StatusChip, Textarea } from '../../components/ui'
import { formatDate, formatDateTime } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { STATUS, statusOptions } from '../../lib/status'
import { FranchiseeSelect, UserSelect, toId } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { useT } from '../../i18n'

function TaskForm({ task, franchisee, onClose }: { task?: Task; franchisee?: number; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const f = useForm({
    franchisee: String(task?.franchisee ?? franchisee ?? ''), title: task?.title ?? '', description: task?.description ?? '',
    priority: task?.priority ?? 'normal', due_date: task?.due_date ?? '', assignee: String(task?.assignee ?? ''),
  })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.franchisee) e.franchisee = [t('tasks.pickFranchisee')]
    if (!f.v.title.trim()) e.title = [t('tasks.enterTitle')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = { ...f.v, franchisee: Number(f.v.franchisee), due_date: f.v.due_date || null, assignee: toId(f.v.assignee) }
    const r = task ? await act(`tasks/${task.id}/`, body, t('tasks.saved'), 'PATCH') : await act('tasks/', body, t('tasks.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={task ? t('tasks.editTitle') : t('tasks.newTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <FranchiseeSelect value={f.v.franchisee} onChange={(v) => { f.set('franchisee', v); f.set('assignee', '') }} error={f.errors.franchisee} disabled={!!task || !!franchisee} />
      <Input label={t('tasks.title')} value={f.v.title} onChange={(e) => f.set('title', e.target.value)} error={f.errors.title} />
      <Textarea label={t('tasks.description')} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} />
      <div className="form-grid">
        <Select label={t('tasks.priority')} options={statusOptions('taskPriority')} value={f.v.priority} onChange={(e) => f.set('priority', e.target.value)} />
        <Input label={t('tasks.due')} type="date" value={f.v.due_date} onChange={(e) => f.set('due_date', e.target.value)} />
      </div>
      {f.v.franchisee && <UserSelect label={t('tasks.assignee')} franchisee={f.v.franchisee} value={f.v.assignee} onChange={(v) => f.set('assignee', v)} />}
    </FormModal>
  )
}

function TaskModal({ task, onClose, onEdit }: { task: Task; onClose: () => void; onEdit: () => void }) {
  const t = useT()
  const canAct = useCan('taskActions')
  const canCreate = useCan('taskCreate')
  const { act, busy } = useAct()
  const { data: cdata, isLoading } = useOne<TaskComment[] | { results: TaskComment[] }>(`tasks/${task.id}/comments/`)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'done' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')
  const comments: TaskComment[] = Array.isArray(cdata) ? cdata : (cdata?.results ?? [])
  const open = !['done', 'rejected', 'cancelled'].includes(task.status)

  const send = async () => {
    if (!text.trim()) return
    if (await act(`tasks/${task.id}/comments/`, { text: text.trim() })) setText('')
  }
  const finish = async () => {
    if (mode === 'reject' && !comment.trim()) return setErr(t('tasks.rejectReasonRequired'))
    if (await act(`tasks/${task.id}/${mode}/`, { comment: comment.trim() || undefined }, mode === 'done' ? t('tasks.doneMsg') : t('tasks.rejectedMsg'))) onClose()
  }
  return (
    <Modal open wide title={task.title} onClose={onClose} footer={
      <>
        {canCreate && open && <Button variant="secondary" onClick={onEdit}>{t('common.edit')}</Button>}
        {canCreate && open && <Button variant="danger" loading={busy} onClick={async () => { if (await act(`tasks/${task.id}/cancel/`, undefined, t('tasks.cancelledMsg'))) onClose() }}>{t('tasks.cancelTask')}</Button>}
        {canAct && task.status === 'new' && <Button loading={busy} onClick={async () => { if (await act(`tasks/${task.id}/start/`, undefined, t('tasks.startedMsg'))) onClose() }}>{t('tasks.start')}</Button>}
        {canAct && ['new', 'in_progress'].includes(task.status) && <Button variant="dark" onClick={() => { setMode('done'); setErr('') }}>{t('tasks.markDone')}</Button>}
        {canAct && ['new', 'in_progress'].includes(task.status) && <Button variant="danger" onClick={() => { setMode('reject'); setErr('') }}>{t('tasks.reject')}</Button>}
      </>
    }>
      <div className="stack">
        <div className="row"><StatusChip kind="task" status={task.status} /><StatusChip kind="taskPriority" status={task.priority} small />{task.overdue && <Badge tone="error" icon={AlarmClock} small>{t('tasks.overdue')}</Badge>}</div>
        <Dl items={[[t('tasks.franchisee'), task.franchisee_name], [t('tasks.due'), formatDate(task.due_date)], [t('tasks.createdBy'), task.created_by_name], [t('tasks.assignee'), task.assignee_name], [t('tasks.doneAt'), task.done_at ? formatDate(task.done_at) : null]]} />
        {task.description && <p className="msg" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>}
        {mode && (
          <div className="hint-box stack">
            <Textarea label={mode === 'reject' ? t('tasks.rejectReason') : t('tasks.commentOptional')} value={comment} onChange={(e) => { setComment(e.target.value); setErr('') }} error={err} />
            <div className="row"><Button size="sm" loading={busy} onClick={finish}>{mode === 'done' ? t('common.confirm') : t('tasks.reject')}</Button><Button size="sm" variant="secondary" onClick={() => setMode(null)}>{t('common.back')}</Button></div>
          </div>
        )}
        <h3>{t('tasks.comments')}</h3>
        {isLoading ? <span className="skeleton" style={{ height: 40 }} /> : comments.length === 0 ? <p className="muted">{t('tasks.noComments')}</p> : comments.map((c) => (
          <div className="msg" key={c.id}><strong>{c.author_name}</strong> <span className="muted" style={{ fontSize: 12 }}>{formatDateTime(c.created_at)}</span><div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div></div>
        ))}
        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <div style={{ flex: 1 }}><Input label={t('tasks.newComment')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }} /></div>
          <Button icon={Send} loading={busy} onClick={send} aria-label={t('tasks.send')}>{t('tasks.send')}</Button>
        </div>
      </div>
    </Modal>
  )
}

export function TasksList({ franchisee, embedded }: { franchisee?: number; embedded?: boolean }) {
  const t = useT()
  const hq = useIsHq()
  const canCreate = useCan('taskCreate')
  const [view, setView] = useState<'list' | 'kanban'>(embedded ? 'list' : 'kanban')
  const [open, setOpen] = useState<Task | null>(null)
  const [form, setForm] = useState<Task | 'new' | null>(null)
  const ls = useListState({ status: '', priority: '', overdue: '' })
  const kan = view === 'kanban'
  const { rows, data, isLoading, error } = useList<Task>('tasks/', { ...ls.params, franchisee, ...(kan ? { page: 1, page_size: 100, status: '' } : {}) })
  const cols = Object.keys(STATUS.task)
  const card = (tk: Task) => (
    <div className="kcard" key={tk.id} onClick={() => setOpen(tk)} style={{ cursor: 'pointer' }}>
      <div className="kcard__title">{tk.title}</div>
      <div className="row"><StatusChip kind="taskPriority" status={tk.priority} small />{tk.overdue && <Badge tone="error" icon={AlarmClock} small>{t('tasks.overdue')}</Badge>}</div>
      <div className="muted" style={{ fontSize: 13 }}>{hq && !franchisee ? `${tk.franchisee_name} · ` : ''}{t('tasks.dueUntil', { date: formatDate(tk.due_date) })}{tk.comments_count ? ` · 💬 ${tk.comments_count}` : ''}</div>
    </div>
  )
  return (
    <div className="page">
      {!embedded && (
        <PageHeader eyebrow={t('tasks.eyebrow')} title={t('tasks.pageTitle')} actions={
          <>
            <div className="tabs" role="group" aria-label={t('tasks.view')}>
              <button className="tab" aria-selected={view === 'kanban'} onClick={() => setView('kanban')}><LayoutGrid size={16} style={{ display: 'inline', verticalAlign: '-3px' }} aria-hidden /> {t('tasks.kanban')}</button>
              <button className="tab" aria-selected={view === 'list'} onClick={() => setView('list')}><Table2 size={16} style={{ display: 'inline', verticalAlign: '-3px' }} aria-hidden /> {t('tasks.list')}</button>
            </div>
            {canCreate && <Button icon={Plus} onClick={() => setForm('new')}>{t('tasks.add')}</Button>}
          </>
        } />
      )}
      {embedded && canCreate && <div className="row"><Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('tasks.add')}</Button></div>}
      <div className="filters">
        <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('tasks.namePlaceholder')} />
        {!kan && <Select label={t('common.status')} options={statusOptions('task')} placeholder={t('common.all')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />}
        <Select label={t('tasks.priority')} options={statusOptions('taskPriority')} placeholder={t('common.all')} value={ls.filters.priority} onChange={(e) => ls.setFilter('priority', e.target.value)} />
        <Select label={t('tasks.due')} options={[{ value: 'true', label: t('tasks.overdueOnly') }]} placeholder={t('common.all')} value={ls.filters.overdue} onChange={(e) => ls.setFilter('overdue', e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      {kan ? (
        isLoading ? <Card><span className="skeleton" style={{ height: 160 }} /></Card> : (
          <div className="kanban">
            {cols.map((s) => {
              const info = STATUS.task[s]
              const items = (rows ?? []).filter((tk) => tk.status === s)
              return (
                <div className="kanban__col" key={s}>
                  <div className="kanban__head"><span className="row" style={{ gap: 6 }}><info.icon size={16} aria-hidden />{info.label}</span><Badge small>{items.length}</Badge></div>
                  {items.length === 0 && <span className="muted" style={{ fontSize: 13 }}>{t('tasks.empty')}</span>}
                  {items.map(card)}
                </div>
              )
            })}
          </div>
        )
      ) : (
        <Card white flush>
          <DataTable
            loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={setOpen}
            ordering={ls.ordering} onOrdering={ls.setOrdering} page={ls.page} total={data?.count} onPage={ls.setPage}
            emptyTitle={t('tasks.emptyTitle')} emptyText={t('tasks.emptyText')}
            columns={[
              { key: 't', header: t('tasks.colTask'), render: (r) => <div><strong>{r.title}</strong>{hq && !franchisee && <div className="muted" style={{ fontSize: 12 }}>{r.franchisee_name}</div>}</div> },
              { key: 'p', header: t('tasks.priority'), render: (r) => <StatusChip kind="taskPriority" status={r.priority} small /> },
              { key: 's', header: t('common.status'), render: (r) => <span className="row" style={{ gap: 6 }}><StatusChip kind="task" status={r.status} small />{r.overdue && <Badge tone="error" small>{t('tasks.overdue')}</Badge>}</span> },
              { key: 'd', header: t('tasks.due'), sortKey: 'due_date', render: (r) => formatDate(r.due_date) },
              { key: 'a', header: t('tasks.assignee'), render: (r) => r.assignee_name ?? '—' },
              { key: 'c', header: t('tasks.colComments'), align: 'right', render: (r) => r.comments_count ?? 0 },
            ]}
          />
        </Card>
      )}
      {open && <TaskModal task={open} onClose={() => setOpen(null)} onEdit={() => { setForm(open); setOpen(null) }} />}
      {form && <TaskForm task={form === 'new' ? undefined : form} franchisee={franchisee} onClose={() => setForm(null)} />}
    </div>
  )
}

export default function TasksPage() {
  return <TasksList />
}
