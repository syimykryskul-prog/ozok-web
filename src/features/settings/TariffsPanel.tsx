import { useState } from 'react'
import { History, Plus } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Tariff } from '../../api/types'
import { ActiveChip, Button, Card, CardTitle, Checkbox, DataTable, ErrorAlert, FormModal, Input, Money, Textarea } from '../../components/ui'
import { formatDate, toISODate, toNum } from '../../lib/format'
import { t } from '../../i18n'
import { kyOf, ruOf } from '../../lib/kyField'
import { useForm } from '../../lib/useForm'
import { useAct } from '../common/useAct'

function TariffForm({ item, product, onClose }: { item?: Tariff; product: number; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({
    code: item?.code ?? '', name: ruOf(item, 'name'), name_ky: kyOf(item, 'name_ky'), description_ky: kyOf(item, 'description_ky'), monthly_price: String(toNum(item?.current_price ?? item?.monthly_price)),
    description: ruOf(item, 'description'), sort_order: String(item?.sort_order ?? 0), is_active: item?.is_active ?? true,
  })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!item && !/^[a-z0-9_-]+$/.test(f.v.code)) e.code = [t('settings.tariff.err_code')]
    if (!f.v.name.trim()) e.name = [t('settings.err.name')]
    if (!item && !(toNum(f.v.monthly_price) > 0)) e.monthly_price = [t('settings.err.price')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body: Record<string, unknown> = { ...f.v, product, sort_order: Number(f.v.sort_order) || 0, monthly_price: f.v.monthly_price.replace(',', '.') }
    if (item) delete body.monthly_price
    const r = item ? await act(`tariffs/${item.id}/`, body, t('settings.tariff.saved'), 'PATCH') : await act('tariffs/', body, t('settings.tariff.created'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('settings.tariff.title') : t('settings.tariff.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Input label={t('settings.tariff.code')} value={f.v.code} onChange={(e) => f.set('code', e.target.value.toLowerCase())} error={f.errors.code} disabled={!!item} />
        <Input label={t('common.name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} placeholder={t('settings.tariff.name_ph')} />
        <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
        {!item && <Input label={t('settings.tariff.monthly_som')} inputMode="decimal" value={f.v.monthly_price} onChange={(e) => f.set('monthly_price', e.target.value)} error={f.errors.monthly_price} />}
        <Input label={t('settings.order')} type="number" value={f.v.sort_order} onChange={(e) => f.set('sort_order', e.target.value)} />
        <div className="span-2"><Textarea label={t('common.description')} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} /></div>
        <div className="span-2"><Textarea label={t('settings.ky.description')} value={f.v.description_ky} onChange={(e) => f.set('description_ky', e.target.value)} /></div>
      </div>
      <Checkbox label={t('settings.tariff.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
      {item && <p className="muted" style={{ fontSize: 13 }}>{t('settings.tariff.price_note')}</p>}
    </FormModal>
  )
}

function PriceModal({ tariff, onClose }: { tariff: Tariff; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({ monthly_price: String(toNum(tariff.current_price)), valid_from: toISODate(new Date()) })
  const submit = async () => {
    if (!(toNum(f.v.monthly_price) > 0)) return f.fail({ data: { monthly_price: [t('settings.err.price')] } })
    const r = await act(`tariffs/${tariff.id}/set-price/`, { monthly_price: f.v.monthly_price.replace(',', '.'), valid_from: f.v.valid_from }, t('settings.tariff.price_changed'))
    if (r) onClose()
  }
  return (
    <FormModal title={t('settings.tariff.new_price', { name: tariff.name })} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t('settings.tariff.monthly_som')} inputMode="decimal" value={f.v.monthly_price} onChange={(e) => f.set('monthly_price', e.target.value)} error={f.errors.monthly_price} />
      <Input label={t('settings.valid_from')} type="date" value={f.v.valid_from} onChange={(e) => f.set('valid_from', e.target.value)} error={f.errors.valid_from} hint={t('settings.tariff.price_hint')} />
    </FormModal>
  )
}

export function TariffsPanel({ product }: { product: number }) {
  const [form, setForm] = useState<Tariff | 'new' | null>(null)
  const [price, setPrice] = useState<Tariff | null>(null)
  const [hist, setHist] = useState<number | null>(null)
  const { rows, isLoading, error } = useList<Tariff>('tariffs/', { product, page_size: 100, ordering: 'sort_order' })
  const open = rows?.find((r) => r.id === hist)
  return (
    <div className="stack">
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle actions={<Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.tariff.add')}</Button>}>{t('settings.tariff.list_title')}</CardTitle></div>
        <ErrorAlert error={error} />
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={setForm}
          emptyTitle={t('settings.tariff.empty')} emptyText={t('settings.tariff.empty_text')}
          columns={[
            { key: 'n', header: t('settings.tariff.col'), render: (r) => <div><strong>{r.name}</strong><div className="muted" style={{ fontSize: 12 }}>{r.code}</div></div> },
            { key: 'p', header: t('settings.tariff.now_monthly'), align: 'right', render: (r) => (r.current_price != null ? <Money value={r.current_price} /> : '—') },
            { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
            {
              key: 'x', header: '', render: (r) => (
                <div className="kcard__actions" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="secondary" onClick={() => setPrice(r)}>{t('settings.tariff.change_price')}</Button>
                  <Button size="sm" variant="ghost" icon={History} onClick={() => setHist(hist === r.id ? null : r.id)}>{t('settings.tariff.history')}</Button>
                </div>
              ),
            },
          ]}
        />
      </Card>
      {open && (
        <Card white flush>
          <div style={{ padding: '20px 24px 0' }}><CardTitle>{t('settings.tariff.history_of', { name: open.name })}</CardTitle></div>
          <DataTable
            rows={[...(open.prices ?? [])].sort((a, b) => b.valid_from.localeCompare(a.valid_from))} rowKey={(r) => `${r.valid_from}`}
            emptyTitle={t('settings.tariff.history_empty')} emptyText=" "
            columns={[
              { key: 'p', header: t('settings.tariff.price_monthly'), align: 'right', render: (r) => <Money value={r.monthly_price} /> },
              { key: 'f', header: t('common.from'), render: (r) => formatDate(r.valid_from) },
              { key: 't', header: t('common.to'), render: (r) => (r.valid_to ? formatDate(r.valid_to) : t('settings.tariff.current')) },
            ]}
          />
        </Card>
      )}
      {form && <TariffForm item={form === 'new' ? undefined : form} product={product} onClose={() => setForm(null)} />}
      {price && <PriceModal tariff={price} onClose={() => setPrice(null)} />}
    </div>
  )
}
