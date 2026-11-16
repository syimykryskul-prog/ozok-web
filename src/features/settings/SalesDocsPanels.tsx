import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useList, useSend } from '../../api/hooks'
import type { CashCategory, ChecklistTemplate, ContractTemplate, SetupSplitRule } from '../../api/types'
import { ActiveChip, Button, Card, CardTitle, Checkbox, DataTable, ErrorAlert, FormModal, Input, Money, Select, Textarea } from '../../components/ui'
import { t } from '../../i18n'
import { errorMessage } from '../../lib/errors'
import { formatDate, toNum } from '../../lib/format'
import { kyOf, ruOf } from '../../lib/kyField'
import { useForm } from '../../lib/useForm'
import { ProductSelect, toId } from '../common/pickers'
import { useAct } from '../common/useAct'
import { useToast } from '../../components/ui'

const channelNames = (): Record<string, string> => ({ whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', api_telephony: t('settings.split.api_telephony') })
const kinds = (): Record<string, string> => ({ manager: t('settings.tpl.kind_manager'), franchisee: t('settings.tpl.kind_franchisee'), client: t('settings.tpl.kind_client') })
const conditions = (): Record<string, string> => ({
  channels_connected_and_confirmed: t('settings.split.cond_channels'), act_confirmed: t('settings.split.cond_act'),
})

function TemplateForm({ item, onClose }: { item?: ContractTemplate; onClose: () => void }) {
  const [send] = useSend()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const f = useForm({ kind: item?.kind ?? 'client', name: ruOf(item, 'name'), is_active: item?.is_active ?? true })
  const submit = async () => {
    if (!f.v.name.trim()) return f.fail({ data: { name: [t('settings.err.name')] } })
    setBusy(true)
    try {
      const body = new FormData()
      body.append('kind', f.v.kind); body.append('name', f.v.name.trim()); body.append('is_active', String(f.v.is_active))
      if (file) body.append('file', file)
      await send(item ? `contract-templates/${item.id}/` : 'contract-templates/', body, item ? 'PATCH' : 'POST')
      toast.success(t('settings.tpl.saved'))
      onClose()
    } catch (e) { f.fail(e); toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <FormModal title={item ? t('settings.tpl.title') : t('settings.tpl.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Select label={t('settings.tpl.kind')} options={Object.entries(kinds()).map(([value, label]) => ({ value, label }))} value={f.v.kind} onChange={(e) => f.set('kind', e.target.value)} />
      <Input label={t('common.name')} value={f.v.name} error={f.errors.name} onChange={(e) => f.set('name', e.target.value)} />
      <div className="field"><span className="field__label">{t('settings.tpl.file')}</span><input className="input" type="file" accept=".doc,.docx,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{item?.file && <span className="field__hint">{t('settings.tpl.current_file')}: <a href={item.file} target="_blank" rel="noreferrer">{t('common.open')}</a></span>}</div>
      <Checkbox label={t('settings.tpl.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

/** Настройки → шаблоны договоров (менеджер / франчайзи / клиент). API: contract-templates/ (по плану P6). */
export function ContractTemplatesPanel({ readOnly }: { readOnly?: boolean }) {
  const { rows, isLoading, error } = useList<ContractTemplate>('contract-templates/', { page_size: 100 })
  const [form, setForm] = useState<ContractTemplate | 'new' | null>(null)
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle actions={!readOnly && <Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.tpl.btn')}</Button>}>{t('settings.tab.templates')}</CardTitle></div>
      <ErrorAlert error={error} />
      <DataTable loading={isLoading} rows={rows} rowKey={(x) => x.id} onRowClick={readOnly ? undefined : setForm} emptyTitle={t('settings.tpl.empty')} emptyText={t('settings.tpl.empty_text')}
        columns={[
          { key: 'k', header: t('settings.tpl.kind'), render: (x) => kinds()[x.kind] ?? x.kind },
          { key: 'n', header: t('common.name'), render: (x) => <strong>{x.name}</strong> },
          { key: 'f', header: t('settings.tpl.file_col'), render: (x) => (x.file ? <a href={x.file} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{t('common.open')}</a> : <span className="muted">{t('settings.tpl.no_file')}</span>) },
          { key: 'a', header: t('common.status'), render: (x) => <ActiveChip active={x.is_active} /> },
        ]} />
      {form && <TemplateForm item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  )
}

function SplitForm({ item, onClose }: { item?: SetupSplitRule; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({
    product: String(item?.product ?? ''), total: String(toNum(item?.total) || ''), partner_amount: String(toNum(item?.partner_amount) || ''),
    implementer_amount: String(toNum(item?.implementer_amount) || ''), implementer_condition: item?.implementer_condition ?? 'channels_connected_and_confirmed', is_active: item?.is_active ?? true,
    valid_from: item?.valid_from ?? '', valid_to: item?.valid_to ?? '', channels: item?.technical_channels ?? [],
  })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.product) e.product = [t('settings.err.product')]
    if (!(toNum(f.v.total) > 0)) e.total = [t('settings.err.amount')]
    if (Math.abs(toNum(f.v.partner_amount) + toNum(f.v.implementer_amount) - toNum(f.v.total)) > 0.005) e.partner_amount = [t('settings.split.err_sum')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = { product: toId(f.v.product), total: f.v.total.replace(',', '.'), partner_amount: f.v.partner_amount.replace(',', '.'), implementer_amount: f.v.implementer_amount.replace(',', '.'), implementer_condition: f.v.implementer_condition, is_active: f.v.is_active, technical_channels: f.v.channels, ...(f.v.valid_from ? { valid_from: f.v.valid_from } : {}), valid_to: f.v.valid_to || null }
    const r = item ? await act(`setup-split-rules/${item.id}/`, body, t('settings.split.saved'), 'PATCH') : await act('setup-split-rules/', body, t('settings.split.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('settings.split.title') : t('settings.split.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <ProductSelect value={f.v.product} onChange={(v) => f.set('product', v)} error={f.errors.product} disabled={!!item} />
      <div className="form-grid">
        <Input label={t('settings.split.cost')} inputMode="decimal" value={f.v.total} error={f.errors.total} onChange={(e) => f.set('total', e.target.value)} />
        <span />
        <Input label={t('settings.split.partner')} inputMode="decimal" value={f.v.partner_amount} error={f.errors.partner_amount} onChange={(e) => f.set('partner_amount', e.target.value)} />
        <Input label={t('settings.split.implementer')} inputMode="decimal" value={f.v.implementer_amount} onChange={(e) => f.set('implementer_amount', e.target.value)} />
      </div>
      <Select label={t('settings.split.when')} options={Object.entries(conditions()).map(([value, label]) => ({ value, label }))} value={f.v.implementer_condition} onChange={(e) => f.set('implementer_condition', e.target.value)} />
      <div className="stack" style={{ gap: 6 }}>
        <strong style={{ fontSize: 14 }}>{t('settings.split.channels')}</strong>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(channelNames()).map(([k, label]) => (
            <Checkbox key={k} label={label} checked={f.v.channels.includes(k)} onChange={(e) => f.set('channels', e.target.checked ? [...f.v.channels, k] : f.v.channels.filter((c) => c !== k))} />
          ))}
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{t('settings.split.channels_hint')}</span>
      </div>
      <div className="form-grid">
        <Input label={t('settings.valid_from')} type="date" value={f.v.valid_from} error={f.errors.valid_from} onChange={(e) => f.set('valid_from', e.target.value)} />
        <Input label={t('settings.valid_to')} type="date" value={f.v.valid_to} error={f.errors.valid_to} onChange={(e) => f.set('valid_to', e.target.value)} />
      </div>
      <Checkbox label={t('settings.rule_active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

/** Настройки → распределение дохода за установку между партнёром и внедренцем (P7). API: setup-split-rules/. */
export function SetupSplitPanel({ readOnly }: { readOnly?: boolean }) {
  const { rows, isLoading, error } = useList<SetupSplitRule>('setup-split-rules/', { page_size: 100 })
  const [form, setForm] = useState<SetupSplitRule | 'new' | null>(null)
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle actions={!readOnly && <Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.split.btn')}</Button>}>{t('settings.tab.split')}</CardTitle></div>
      <ErrorAlert error={error} />
      <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={readOnly ? undefined : setForm} emptyTitle={t('settings.split.empty')} emptyText={t('settings.split.empty_text')}
        columns={[
          { key: 'p', header: t('settings.product'), render: (r) => <strong>{r.product_name ?? `№ ${r.product}`}</strong> },
          { key: 't', header: t('settings.split.col_total'), align: 'right', render: (r) => <Money value={r.total} /> },
          { key: 'pa', header: t('settings.split.col_partner'), align: 'right', render: (r) => <Money value={r.partner_amount} /> },
          { key: 'ia', header: t('settings.split.col_implementer'), align: 'right', render: (r) => <Money value={r.implementer_amount} /> },
          { key: 'c', header: t('settings.split.col_cond'), render: (r) => conditions()[r.implementer_condition ?? ''] ?? r.implementer_condition ?? '—' },
          { key: 'ch', header: t('settings.split.col_channels'), render: (r) => (r.technical_channels ?? []).map((c) => channelNames()[c] ?? c).join(', ') || '—' },
          { key: 'v', header: t('settings.col_valid'), render: (r) => `${formatDate(r.valid_from)}${r.valid_to ? ` — ${formatDate(r.valid_to)}` : ''}` },
          { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
        ]} />
      {form && <SplitForm item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  )
}

function CashCategoryForm({ item, onClose }: { item?: CashCategory; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({ name: ruOf(item, 'name'), name_ky: kyOf(item, 'name_ky'), code: item?.code ?? '', direction: item?.direction ?? 'out', manual_allowed: item?.manual_allowed ?? true, is_active: item?.is_active ?? true, sort_order: String(item?.sort_order ?? 0) })
  const system = !!item?.is_system
  const submit = async () => {
    if (!f.v.name.trim()) return f.fail({ data: { name: [t('settings.err.name')] } })
    if (!item && !f.v.code.trim()) return f.fail({ data: { code: [t('settings.cashcat.err_code')] } })
    const body = { name: f.v.name.trim(), name_ky: f.v.name_ky.trim(), is_active: f.v.is_active, sort_order: Number(f.v.sort_order) || 0, ...(system ? {} : { direction: f.v.direction, manual_allowed: f.v.manual_allowed, ...(item ? {} : { code: f.v.code.trim() }) }) }
    const r = item ? await act(`cash-categories/${item.id}/`, body, t('settings.cashcat.saved'), 'PATCH') : await act('cash-categories/', body, t('settings.cashcat.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('settings.cashcat.title') : t('settings.cashcat.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Select label={t('settings.cashcat.direction')} options={[{ value: 'in', label: t('settings.cashcat.in') }, { value: 'out', label: t('settings.cashcat.out') }]} value={f.v.direction} disabled={!!item} onChange={(e) => f.set('direction', e.target.value as 'in' | 'out')} />
      <div className="form-grid">
        <Input label={t('common.name')} value={f.v.name} error={f.errors.name} onChange={(e) => f.set('name', e.target.value)} />
        <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
        <Input label={t('settings.code')} value={f.v.code} disabled={!!item} error={f.errors.code} onChange={(e) => f.set('code', e.target.value)} />
      </div>
      <Input label={t('settings.order')} type="number" value={f.v.sort_order} onChange={(e) => f.set('sort_order', e.target.value)} />
      <Checkbox label={t('settings.cashcat.manual_allowed')} checked={f.v.manual_allowed} disabled={system} onChange={(e) => f.set('manual_allowed', e.target.checked)} />
      <Checkbox label={t('settings.cashcat.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
      {system && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('settings.cashcat.system_note')}</p>}
    </FormModal>
  )
}

/** Настройки → категории кассы (поступления и расходы OZOK). API: cash-categories/ (по плану P0+ п.6). */
export function CashCategoriesPanel({ readOnly }: { readOnly?: boolean }) {
  const { rows, isLoading, error } = useList<CashCategory>('cash-categories/', { page_size: 200 })
  const [form, setForm] = useState<CashCategory | 'new' | null>(null)
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle actions={!readOnly && <Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.cashcat.btn')}</Button>}>{t('settings.cashcat.list_title')}</CardTitle></div>
      <ErrorAlert error={error} />
      <DataTable loading={isLoading} rows={rows} rowKey={(c) => c.id} onRowClick={readOnly ? undefined : setForm} emptyTitle={t('settings.cashcat.empty')} emptyText={t('settings.cashcat.empty_text')}
        columns={[
          { key: 'n', header: t('common.name'), render: (c) => <strong>{c.name}</strong> },
          { key: 'd', header: t('settings.cashcat.direction'), render: (c) => (c.direction === 'in' ? t('settings.cashcat.in') : t('settings.cashcat.out')) },
          { key: 'm', header: t('settings.cashcat.manual'), render: (c) => (c.manual_allowed ? t('common.yes') : t('settings.cashcat.auto')) },
          { key: 'a', header: t('common.status'), render: (c) => <ActiveChip active={c.is_active} /> },
        ]} />
      {form && <CashCategoryForm item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  )
}

function ChecklistForm({ item, onClose }: { item?: ChecklistTemplate; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({ product: String(item?.product ?? ''), name: ruOf(item, 'name', t('settings.checklist.default_name')), name_ky: kyOf(item, 'name_ky'), items: (item?.items ?? []).map((i) => (typeof i === 'string' ? i : i.item)).join('\n'), is_active: item?.is_active ?? true })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.product) e.product = [t('settings.err.product')]
    const items = f.v.items.split('\n').map((x) => x.trim()).filter(Boolean)
    if (!items.length) e.items = [t('settings.checklist.err_items')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = { product: toId(f.v.product), name: f.v.name.trim() || t('settings.checklist.default_name'), name_ky: f.v.name_ky.trim(), items, is_active: f.v.is_active }
    const r = item ? await act(`checklist-templates/${item.id}/`, body, t('settings.tpl.saved'), 'PATCH') : await act('checklist-templates/', body, t('settings.tpl.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('settings.checklist.title') : t('settings.checklist.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <ProductSelect value={f.v.product} onChange={(v) => f.set('product', v)} error={f.errors.product} />
      <Input label={t('common.name')} value={f.v.name} error={f.errors.name} onChange={(e) => f.set('name', e.target.value)} />
      <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
      <Textarea label={t('settings.checklist.items')} rows={8} hint={t('settings.checklist.items_hint')} value={f.v.items} error={f.errors.items} onChange={(e) => f.set('items', e.target.value)} />
      <Checkbox label={t('settings.tpl.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

/** Настройки → чек-листы установки по продуктам. API: checklist-templates/ (создаёт и меняет super_admin). */
export function ChecklistTemplatesPanel({ readOnly }: { readOnly?: boolean }) {
  const { rows, isLoading, error } = useList<ChecklistTemplate>('checklist-templates/', { page_size: 100 })
  const [form, setForm] = useState<ChecklistTemplate | 'new' | null>(null)
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle actions={!readOnly && <Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.checklist.btn')}</Button>}>{t('settings.tab.checklists')}</CardTitle></div>
      <ErrorAlert error={error} />
      <DataTable loading={isLoading} rows={rows} rowKey={(x) => x.id} onRowClick={readOnly ? undefined : setForm} emptyTitle={t('settings.tpl.empty_short')} emptyText={t('settings.checklist.empty_text')}
        columns={[
          { key: 'p', header: t('settings.product'), render: (x) => <strong>{x.product_name ?? `№ ${x.product}`}</strong> },
          { key: 'n', header: t('common.name'), render: (x) => x.name },
          { key: 'i', header: t('settings.checklist.count'), align: 'right', render: (x) => x.items.length },
          { key: 'a', header: t('common.status'), render: (x) => <ActiveChip active={x.is_active} /> },
        ]} />
      {form && <ChecklistForm item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  )
}
