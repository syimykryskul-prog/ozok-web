import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { FranchiseOffer, LedgerCategory } from '../../api/types'
import { ActiveChip, Button, Card, CardTitle, Checkbox, DataTable, ErrorAlert, FormModal, Input, Money, Select, Textarea } from '../../components/ui'
import { t } from '../../i18n'
import { toNum } from '../../lib/format'
import { kyOf, ruOf } from '../../lib/kyField'
import { useForm } from '../../lib/useForm'
import { LEDGER_TYPES, dictOptions } from '../../lib/status'
import { useAct } from '../common/useAct'
import { SettingsEditor, matchGroup, useSettings } from './SettingsGroups'

function OfferForm({ item, onClose }: { item?: FranchiseOffer; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({
    name: ruOf(item, 'name'), name_ky: kyOf(item, 'name_ky'), note_ky: kyOf(item, 'note_ky'), total: String(toNum(item?.total) || ''), upfront: String(toNum(item?.upfront) || ''),
    installments_count: String(item?.installments_count ?? 0), step_months: String(item?.step_months ?? 1), note: ruOf(item, 'note'), is_active: item?.is_active ?? true,
  })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.name.trim()) e.name = [t('settings.err.name')]
    if (!(toNum(f.v.total) > 0)) e.total = [t('settings.err.amount')]
    if (toNum(f.v.upfront) > toNum(f.v.total)) e.upfront = [t('settings.offer.err_upfront')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = { ...f.v, total: f.v.total.replace(',', '.'), upfront: f.v.upfront.replace(',', '.') || '0', installments_count: Number(f.v.installments_count) || 0, step_months: Number(f.v.step_months) || 1 }
    const r = item ? await act(`franchise-offers/${item.id}/`, body, t('settings.offer.saved'), 'PATCH') : await act('franchise-offers/', body, t('settings.offer.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('settings.offer.title') : t('settings.offer.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <div className="span-2"><Input label={t('common.name')} value={f.v.name} error={f.errors.name} placeholder={t('settings.offer.name_ph')} onChange={(e) => f.set('name', e.target.value)} /></div>
        <div className="span-2"><Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} /></div>
        <Input label={t('settings.amount_som')} inputMode="decimal" value={f.v.total} error={f.errors.total} onChange={(e) => f.set('total', e.target.value)} />
        <Input label={t('settings.offer.upfront_som')} inputMode="decimal" value={f.v.upfront} error={f.errors.upfront} onChange={(e) => f.set('upfront', e.target.value)} />
        <Input label={t('settings.offer.installments')} type="number" min={0} value={f.v.installments_count} onChange={(e) => f.set('installments_count', e.target.value)} />
        <Input label={t('settings.offer.step')} type="number" min={1} value={f.v.step_months} onChange={(e) => f.set('step_months', e.target.value)} />
        <div className="span-2"><Textarea label={t('settings.note')} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} /></div>
        <div className="span-2"><Textarea label={t('settings.ky.note')} value={f.v.note_ky} onChange={(e) => f.set('note_ky', e.target.value)} /></div>
      </div>
      <Checkbox label={t('settings.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

export function FranchisePanel({ readOnly }: { readOnly?: boolean }) {
  const [form, setForm] = useState<FranchiseOffer | 'new' | null>(null)
  const offers = useList<FranchiseOffer>('franchise-offers/', { page_size: 100 })
  const { list } = useSettings()
  const items = list.filter((s) => matchGroup(s, 'franchise'))
  return (
    <div className="stack">
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}>
          <CardTitle actions={!readOnly && <Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.offer.add')}</Button>}>{t('settings.offer.list_title')}</CardTitle>
        </div>
        <ErrorAlert error={offers.error} />
        <DataTable loading={offers.isLoading} rows={offers.rows} rowKey={(r) => r.id} onRowClick={readOnly ? undefined : setForm}
          emptyTitle={t('settings.offer.empty')} emptyText={t('settings.offer.empty_text')}
          columns={[
            { key: 'n', header: t('common.name'), render: (r) => <strong>{r.name}</strong> },
            { key: 't', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.total} /> },
            { key: 'u', header: t('settings.offer.upfront'), align: 'right', render: (r) => <Money value={r.upfront} /> },
            { key: 'i', header: t('settings.offer.installment'), render: (r) => (r.installments_count ? t('settings.offer.installment_fmt', { n: r.installments_count, m: r.step_months }) : '—') },
            { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
          ]} />
      </Card>
      <SettingsEditor title={t('settings.recruiter.title')} readOnly={readOnly} items={items}
        hint={t('settings.recruiter.hint')} />
      {form && <OfferForm item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  )
}

function CategoryForm({ item, onClose }: { item?: LedgerCategory; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({ type: item?.type ?? 'expense', name: ruOf(item, 'name'), name_ky: kyOf(item, 'name_ky'), is_active: item?.is_active ?? true })
  const submit = async () => {
    if (!f.v.name.trim()) return f.fail({ data: { name: [t('settings.err.name')] } })
    const r = item ? await act(`ledger-categories/${item.id}/`, f.v, t('settings.cat.saved'), 'PATCH') : await act('ledger-categories/', f.v, t('settings.cat.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('settings.cat.title') : t('settings.cat.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Select label={t('common.type')} options={dictOptions(LEDGER_TYPES)} value={f.v.type} disabled={!!item} onChange={(e) => f.set('type', e.target.value as 'income' | 'expense')} />
      <Input label={t('common.name')} value={f.v.name} error={f.errors.name} onChange={(e) => f.set('name', e.target.value)} />
      <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
      <Checkbox label={t('settings.active_f')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

export function CategoriesPanel() {
  const [form, setForm] = useState<LedgerCategory | 'new' | null>(null)
  const { rows, isLoading, error } = useList<LedgerCategory>('ledger-categories/', { page_size: 200 })
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle actions={<Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.cat.add')}</Button>}>{t('settings.cat.list_title')}</CardTitle></div>
      <ErrorAlert error={error} />
      <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={setForm} emptyTitle={t('settings.cat.empty')} emptyText={t('settings.cat.empty_text')}
        columns={[
          { key: 'n', header: t('common.name'), render: (r) => <strong>{r.name}</strong> },
          { key: 't', header: t('common.type'), render: (r) => LEDGER_TYPES[r.type] },
          { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
        ]} />
      {form && <CategoryForm item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  )
}
