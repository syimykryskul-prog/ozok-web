import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useList } from '../../api/hooks'
import { TariffsPanel } from './TariffsPanel'
import type { Equipment, Package, Product } from '../../api/types'
import { ActiveChip, Button, Card, CardTitle, Checkbox, DataTable, ErrorAlert, FormModal, Input, Money, Select, Tabs, Textarea } from '../../components/ui'
import { cls, toNum } from '../../lib/format'
import { t } from '../../i18n'
import { ICON_NAMES, PALETTE, iconFor } from '../../lib/icons'
import { kyOf, ruOf } from '../../lib/kyField'
import { useForm } from '../../lib/useForm'
import { useAct } from '../common/useAct'

function ProductForm({ item, onClose }: { item?: Product; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({
    code: item?.code ?? '', name: ruOf(item, 'name'), sphere: ruOf(item, 'sphere'), description: ruOf(item, 'description'), name_ky: kyOf(item, 'name_ky'), sphere_ky: kyOf(item, 'sphere_ky'), description_ky: kyOf(item, 'description_ky'), icon: item?.icon || 'box',
    color: item?.color || PALETTE[0], price_cash: String(toNum(item?.price_cash)), price_per_sale: String(toNum(item?.price_per_sale)), setup_price: String(toNum(item?.setup_price)),
    default_commission_percent: String(toNum(item?.default_commission_percent ?? 20)), sort_order: String(item?.sort_order ?? 0), is_active: item?.is_active ?? true,
  })
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!item && !/^[a-z0-9_-]+$/.test(f.v.code)) e.code = [t('settings.tariff.err_code')]
    if (!f.v.name.trim()) e.name = [t('settings.err.name')]
    if (!f.v.sphere.trim()) e.sphere = [t('settings.sphere_err')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = { ...f.v, sort_order: Number(f.v.sort_order) || 0 }
    const r = item ? await act(`products/${item.id}/`, body, t('settings.sphere_saved'), 'PATCH') : await act('products/', body, t('settings.sphere_created'))
    if (r) onClose()
  }
  return (
    <FormModal wide title={item ? t('settings.sphere') : t('settings.sphere_new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Input label={t('settings.sphere_code')} value={f.v.code} onChange={(e) => f.set('code', e.target.value.toLowerCase())} error={f.errors.code} disabled={!!item} hint={t('settings.sphere_code_hint')} />
        <Input label={t('settings.product_name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} placeholder="NUR CRM Market" />
        <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
        <Input label={t('settings.sphere')} value={f.v.sphere} onChange={(e) => f.set('sphere', e.target.value)} error={f.errors.sphere} placeholder={t('settings.sphere_ph')} />
        <Input label={t('settings.ky.sphere')} value={f.v.sphere_ky} onChange={(e) => f.set('sphere_ky', e.target.value)} />
        <Input label={t('settings.order')} type="number" value={f.v.sort_order} onChange={(e) => f.set('sort_order', e.target.value)} />
        <Input label={t('settings.sphere_price_cash')} inputMode="decimal" value={f.v.price_cash} onChange={(e) => f.set('price_cash', e.target.value)} error={f.errors.price_cash} />
        <Input label={t('settings.sphere_price_sale')} inputMode="decimal" value={f.v.price_per_sale} onChange={(e) => f.set('price_per_sale', e.target.value)} error={f.errors.price_per_sale} />
        <Input label={t('settings.sphere_setup')} inputMode="decimal" value={f.v.setup_price} onChange={(e) => f.set('setup_price', e.target.value)} error={f.errors.setup_price} />
        <Input label={t('settings.sphere_commission')} inputMode="decimal" value={f.v.default_commission_percent} onChange={(e) => f.set('default_commission_percent', e.target.value)} error={f.errors.default_commission_percent} />
        <div className="field">
          <span className="field__label">{t('settings.sphere_color')}</span>
          <div className="row">
            <input type="color" aria-label={t('settings.color')} value={f.v.color} onChange={(e) => f.set('color', e.target.value)} style={{ width: 50, height: 40, border: 'none', background: 'none' }} />
            {PALETTE.map((c) => <button key={c} type="button" aria-label={c} onClick={() => f.set('color', c)} style={{ width: 24, height: 24, borderRadius: '50%', border: f.v.color === c ? '3px solid var(--text)' : '1px solid var(--border)', background: c }} />)}
          </div>
        </div>
        <div className="span-2 field">
          <span className="field__label">{t('settings.icon')}</span>
          <div className="multi">
            {ICON_NAMES.map((n) => {
              const I = iconFor(n)
              return <button key={n} type="button" className={cls('chip', f.v.icon === n && 'chip--active')} aria-pressed={f.v.icon === n} onClick={() => f.set('icon', n)}><I size={16} aria-hidden />{n}</button>
            })}
          </div>
        </div>
        <div className="span-2"><Textarea label={t('common.description')} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} /></div>
        <div className="span-2"><Textarea label={t('settings.ky.description')} value={f.v.description_ky} onChange={(e) => f.set('description_ky', e.target.value)} /></div>
      </div>
      <Checkbox label={t('settings.sphere_active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

function PackageForm({ item, products, onClose }: { item?: Package; products: Product[]; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({
    name: ruOf(item, 'name'), name_ky: kyOf(item, 'name_ky'), products: item?.products ?? ([] as number[]), price_cash: String(toNum(item?.price_cash)), price_prepay: String(toNum(item?.price_prepay)),
    price_per_sale: String(toNum(item?.price_per_sale)), prepay_percent: String(toNum(item?.prepay_percent) || 40), is_active: item?.is_active ?? true,
  })
  const toggle = (id: number) => f.set('products', f.v.products.includes(id) ? f.v.products.filter((x) => x !== id) : [...f.v.products, id])
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.name.trim()) e.name = [t('settings.err.name')]
    if (f.v.products.length < 1) e.products = [t('settings.pkg.err_spheres')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = { ...f.v, prepay_percent: Number(f.v.prepay_percent) || 40 }
    const r = item ? await act(`packages/${item.id}/`, body, t('settings.pkg.saved'), 'PATCH') : await act('packages/', body, t('settings.pkg.created'))
    if (r) onClose()
  }
  return (
    <FormModal wide title={item ? t('settings.pkg.title') : t('settings.pkg.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t('common.name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} />
      <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
      <div className="field">
        <span className="field__label">{t('settings.pkg.spheres')}</span>
        <div className="multi">
          {products.map((p) => <button key={p.id} type="button" className={cls('chip', f.v.products.includes(p.id) && 'chip--active')} aria-pressed={f.v.products.includes(p.id)} onClick={() => toggle(p.id)}>{p.sphere || p.name}</button>)}
        </div>
        {f.errors.products && <span className="field__error" role="alert">{f.errors.products}</span>}
      </div>
      <div className="form-grid">
        <Input label={t('settings.pkg.price_cash')} inputMode="decimal" value={f.v.price_cash} onChange={(e) => f.set('price_cash', e.target.value)} />
        <Input label={t('settings.pkg.price_prepay')} inputMode="decimal" value={f.v.price_prepay} onChange={(e) => f.set('price_prepay', e.target.value)} />
        <Input label={t('settings.pkg.price_sale')} inputMode="decimal" value={f.v.price_per_sale} onChange={(e) => f.set('price_per_sale', e.target.value)} />
        <Input label={t('settings.pkg.prepay')} type="number" value={f.v.prepay_percent} onChange={(e) => f.set('prepay_percent', e.target.value)} />
      </div>
      <Checkbox label={t('settings.pkg.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

function EquipmentForm({ item, products, defaultProduct, onClose }: { item?: Equipment; products: Product[]; defaultProduct?: number; onClose: () => void }) {
  const { act, busy } = useAct()
  const f = useForm({ name: ruOf(item, 'name'), name_ky: kyOf(item, 'name_ky'), product: String(item?.product ?? defaultProduct ?? ''), price: String(toNum(item?.price)), unit: item?.unit ?? t('settings.eq.unit_default'), sort_order: String(item?.sort_order ?? 0), is_active: item?.is_active ?? true })
  const submit = async () => {
    if (!f.v.name.trim()) return f.fail({ data: { name: [t('settings.err.name')] } })
    const body = { ...f.v, product: f.v.product ? Number(f.v.product) : null, price: f.v.price.replace(',', '.') || '0', sort_order: Number(f.v.sort_order) || 0 }
    const r = item ? await act(`equipment/${item.id}/`, body, t('settings.eq.saved'), 'PATCH') : await act('equipment/', body, t('settings.eq.added'))
    if (r) onClose()
  }
  return (
    <FormModal title={item ? t('settings.tab.equipment') : t('settings.eq.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t('common.name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} />
      <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
      <Select label={t('settings.sphere')} placeholder={t('settings.eq.for_all')} value={f.v.product} onChange={(e) => f.set('product', e.target.value)} options={products.map((p) => ({ value: p.id, label: p.sphere || p.name }))} />
      <div className="form-grid">
        <Input label={t('settings.eq.price')} inputMode="decimal" value={f.v.price} onChange={(e) => f.set('price', e.target.value)} error={f.errors.price} />
        <Input label={t('settings.eq.unit')} value={f.v.unit} onChange={(e) => f.set('unit', e.target.value)} />
        <Input label={t('settings.order')} type="number" value={f.v.sort_order} onChange={(e) => f.set('sort_order', e.target.value)} />
      </div>
      <Checkbox label={t('settings.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

function EquipmentPanel({ product }: { product?: number }) {
  const [form, setForm] = useState<Equipment | 'new' | null>(null)
  const prods = useList<Product>('products/', { page_size: 100, ordering: 'sort_order' })
  const eq = useList<Equipment>('equipment/', { page_size: 100, ordering: 'sort_order', product })
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}><CardTitle actions={<Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('settings.eq.add')}</Button>}>{t('settings.tab.equipment')}</CardTitle></div>
      <ErrorAlert error={eq.error} />
      <DataTable
        loading={eq.isLoading} rows={eq.rows} rowKey={(r) => r.id} onRowClick={setForm}
        emptyTitle={t('settings.eq.empty')} emptyText={t('settings.eq.empty_text')}
        columns={[
          { key: 'n', header: t('common.name'), render: (r) => <strong>{r.name}</strong> },
          { key: 'p', header: t('settings.sphere'), render: (r) => r.product_name ?? t('settings.eq.for_all') },
          { key: 'pr', header: t('settings.price'), align: 'right', render: (r) => <span><Money value={r.price} /> / {r.unit}</span> },
          { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
        ]}
      />
      {form && <EquipmentForm item={form === 'new' ? undefined : form} products={prods.rows ?? []} defaultProduct={product} onClose={() => setForm(null)} />}
    </Card>
  )
}

export function SpheresPanel({ equipmentOnly }: { equipmentOnly?: boolean }) {
  const [tab, setTab] = useState<'spheres' | 'equipment'>('spheres')
  if (equipmentOnly) return <EquipmentPanel />
  return (
    <div className="stack">
      <Tabs tabs={[{ value: 'spheres', label: t('settings.spheres_packages') }, { value: 'equipment', label: t('settings.tab.equipment') }]} value={tab} onChange={setTab} />
      {tab === 'spheres' ? <SpheresInner /> : <EquipmentPanel />}
    </div>
  )
}

function SpheresInner() {
  const [pform, setPform] = useState<Product | 'new' | null>(null)
  const [kform, setKform] = useState<Package | 'new' | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const prods = useList<Product>('products/', { page_size: 100, ordering: 'sort_order' })
  const pkgs = useList<Package>('packages/', { page_size: 100 })
  const nameOf = (id: number) => prods.rows?.find((p) => p.id === id)?.sphere ?? String(id)
  if (editing) return <ProductEditor item={editing} onBack={() => setEditing(null)} />
  return (
    <div className="stack">
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle actions={<Button size="sm" icon={Plus} onClick={() => setPform('new')}>{t('settings.sphere_add')}</Button>}>{t('settings.spheres_prices')}</CardTitle></div>
        <ErrorAlert error={prods.error} />
        <DataTable
          loading={prods.isLoading} rows={prods.rows} rowKey={(r) => r.id} onRowClick={setEditing}
          emptyTitle={t('settings.sphere_empty')} emptyText={t('settings.sphere_empty_text')}
          columns={[
            { key: 'n', header: t('settings.sphere'), render: (r) => { const I = iconFor(r.icon); return <span className="row" style={{ gap: 10 }}><span className="kpi__icon" style={{ width: 36, height: 36, background: r.color || 'var(--turquoise)', color: 'var(--on-navy)' }}><I size={18} aria-hidden /></span><span><strong>{r.sphere}</strong><div className="muted" style={{ fontSize: 12 }}>{r.name} · {r.code}</div></span></span> } },
            { key: 'c', header: t('settings.pkg.price_cash_col'), align: 'right', render: (r) => <Money value={r.price_cash} /> },
            { key: 'p', header: t('settings.pkg.price_sale_col'), align: 'right', render: (r) => <Money value={r.price_per_sale} /> },
            { key: 'su', header: t('settings.sphere_setup_col'), align: 'right', render: (r) => <Money value={r.setup_price ?? 0} /> },
            { key: 'sb', header: t('settings.sphere_sub_from'), align: 'right', render: (r) => (toNum(r.subscription_price) ? <Money value={r.subscription_price} /> : '—') },
            { key: 'k', header: t('settings.sphere_commission_col'), align: 'right', render: (r) => `${toNum(r.default_commission_percent)}%` },
            { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
          ]}
        />
      </Card>
      <Card white flush>
        <div style={{ padding: '20px 24px 0' }}><CardTitle actions={<Button size="sm" icon={Plus} onClick={() => setKform('new')}>{t('settings.pkg.add')}</Button>}>{t('settings.pkg.list_title')}</CardTitle></div>
        <ErrorAlert error={pkgs.error} />
        <DataTable
          loading={pkgs.isLoading} rows={pkgs.rows} rowKey={(r) => r.id} onRowClick={setKform}
          emptyTitle={t('settings.pkg.empty')} emptyText={t('settings.pkg.empty_text')}
          columns={[
            { key: 'n', header: t('settings.pkg.title'), render: (r) => <div><strong>{r.name}</strong><div className="muted" style={{ fontSize: 12 }}>{r.products.map(nameOf).join(', ')}</div></div> },
            { key: 'c', header: t('settings.pkg.price_cash_col'), align: 'right', render: (r) => <Money value={r.price_cash} /> },
            { key: 'pp', header: t('settings.pkg.with_prepay'), align: 'right', render: (r) => <Money value={r.price_prepay} /> },
            { key: 'ps', header: t('settings.pkg.price_sale_col'), align: 'right', render: (r) => <Money value={r.price_per_sale} /> },
            { key: 'a', header: t('common.status'), render: (r) => <ActiveChip active={r.is_active} /> },
          ]}
        />
      </Card>
      {pform && <ProductForm onClose={() => setPform(null)} />}
      {kform && <PackageForm item={kform === 'new' ? undefined : kform} products={prods.rows ?? []} onClose={() => setKform(null)} />}
    </div>
  )
}

type PTab = 'main' | 'franchise' | 'setup' | 'tariffs' | 'equipment'

function ProductEditor({ item, onBack }: { item: Product; onBack: () => void }) {
  const { act, busy } = useAct()
  const [tab, setTab] = useState<PTab>('main')
  const f = useForm({
    name: ruOf(item, 'name'), sphere: ruOf(item, 'sphere'), description: ruOf(item, 'description'), name_ky: kyOf(item, 'name_ky'), sphere_ky: kyOf(item, 'sphere_ky'), description_ky: kyOf(item, 'description_ky'), icon: item.icon || 'box', color: item.color || PALETTE[0],
    price_cash: String(toNum(item.price_cash)), price_per_sale: String(toNum(item.price_per_sale)), setup_price: String(toNum(item.setup_price)),
    sort_order: String(item.sort_order ?? 0), is_active: item.is_active,
    training_price: String(toNum(item.training_price)), min_price: String(toNum(item.min_price)), max_discount_percent: String(toNum(item.max_discount_percent)),
    grace_days: item.grace_days != null ? String(item.grace_days) : '', restrict_after_days: item.restrict_after_days != null ? String(item.restrict_after_days) : '',
    install_checklist: Array.isArray(item.install_checklist) ? item.install_checklist.join('\n') : (item.install_checklist ?? ''),
  })
  const save = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.name.trim()) e.name = [t('settings.err.name')]
    if (!f.v.sphere.trim()) e.sphere = [t('settings.sphere_err')]
    if (Object.keys(e).length) { setTab('main'); return f.fail({ data: e }) }
    const body: Record<string, unknown> = {
      ...f.v, sort_order: Number(f.v.sort_order) || 0,
      grace_days: f.v.grace_days === '' ? null : Number(f.v.grace_days), restrict_after_days: f.v.restrict_after_days === '' ? null : Number(f.v.restrict_after_days),
      install_checklist: f.v.install_checklist.split('\n').map((x) => x.trim()).filter(Boolean),
    }
    await act(`products/${item.id}/`, body, t('common.saved'), 'PATCH')
  }
  const I = iconFor(f.v.icon)
  const saveBtn = <div className="row"><Button loading={busy} onClick={save}>{t('common.save')}</Button></div>
  return (
    <div className="stack">
      <div className="row row--between">
        <Button variant="ghost" onClick={onBack}>{t('settings.back_to_spheres')}</Button>
        <span className="row" style={{ gap: 10 }}><span className="kpi__icon" style={{ width: 36, height: 36, background: f.v.color, color: 'var(--on-navy)' }}><I size={18} aria-hidden /></span><h2>{item.sphere} · {item.name}</h2></span>
      </div>
      <Tabs<PTab> tabs={[{ value: 'main', label: t('settings.ptab.main') }, { value: 'franchise', label: t('settings.tab.franchise') }, { value: 'setup', label: t('settings.ptab.setup') }, { value: 'tariffs', label: t('settings.ptab.tariffs') }, { value: 'equipment', label: t('settings.tab.equipment') }]} value={tab} onChange={setTab} />
      <ErrorAlert error={f.general ? { data: { detail: f.general } } : null} />
      {tab === 'main' && (
        <Card white><div className="form-grid">
          <Input label={t('settings.product_name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} />
          <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
          <Input label={t('settings.sphere')} value={f.v.sphere} onChange={(e) => f.set('sphere', e.target.value)} error={f.errors.sphere} />
          <Input label={t('settings.ky.sphere')} value={f.v.sphere_ky} onChange={(e) => f.set('sphere_ky', e.target.value)} />
          <Input label={t('settings.order')} type="number" value={f.v.sort_order} onChange={(e) => f.set('sort_order', e.target.value)} />
          <div className="field"><span className="field__label">{t('settings.sphere_color')}</span>
            <div className="row">
              <input type="color" aria-label={t('settings.color')} value={f.v.color} onChange={(e) => f.set('color', e.target.value)} style={{ width: 50, height: 40, border: 'none', background: 'none' }} />
              {PALETTE.map((c) => <button key={c} type="button" aria-label={c} onClick={() => f.set('color', c)} style={{ width: 24, height: 24, borderRadius: '50%', border: f.v.color === c ? '3px solid var(--text)' : '1px solid var(--border)', background: c }} />)}
            </div>
          </div>
          <div className="span-2 field"><span className="field__label">{t('settings.icon')}</span>
            <div className="multi">{ICON_NAMES.map((n) => { const Ic = iconFor(n); return <button key={n} type="button" className={cls('chip', f.v.icon === n && 'chip--active')} aria-pressed={f.v.icon === n} onClick={() => f.set('icon', n)}><Ic size={16} aria-hidden />{n}</button> })}</div>
          </div>
          <div className="span-2"><Textarea label={t('common.description')} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} /></div>
          <div className="span-2"><Textarea label={t('settings.ky.description')} value={f.v.description_ky} onChange={(e) => f.set('description_ky', e.target.value)} /></div>
          <Checkbox label={t('settings.sphere_active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
          <div className="span-2">{saveBtn}</div>
        </div></Card>
      )}
      {tab === 'franchise' && (
        <Card white><div className="stack">
          <p className="muted">{t('settings.pf.note')}</p>
          <div className="form-grid">
            <Input label={t('settings.pf.cash')} inputMode="decimal" value={f.v.price_cash} onChange={(e) => f.set('price_cash', e.target.value)} />
            <Input label={t('settings.pf.from_sales')} inputMode="decimal" value={f.v.price_per_sale} onChange={(e) => f.set('price_per_sale', e.target.value)} />
          </div>
          {saveBtn}
        </div></Card>
      )}
      {tab === 'setup' && (
        <Card white><div className="stack">
          <p className="muted">{t('settings.ps.note')}</p>
          <div className="form-grid">
            <Input label={t('settings.ps.setup')} inputMode="decimal" value={f.v.setup_price} onChange={(e) => f.set('setup_price', e.target.value)} />
            <Input label={t('settings.ps.training')} inputMode="decimal" value={f.v.training_price} onChange={(e) => f.set('training_price', e.target.value)} />
            <Input label={t('settings.ps.min_price')} inputMode="decimal" value={f.v.min_price} onChange={(e) => f.set('min_price', e.target.value)} hint={t('settings.ps.min_hint')} />
            <Input label={t('settings.ps.max_discount')} inputMode="decimal" value={f.v.max_discount_percent} onChange={(e) => f.set('max_discount_percent', e.target.value)} />
            <Input label={t('settings.ps.grace')} type="number" min={0} value={f.v.grace_days} onChange={(e) => f.set('grace_days', e.target.value)} hint={t('settings.ps.grace_hint')} />
            <Input label={t('settings.ps.restrict')} type="number" min={0} value={f.v.restrict_after_days} onChange={(e) => f.set('restrict_after_days', e.target.value)} />
            <div className="span-2"><Textarea label={t('settings.ps.checklist')} rows={5} value={f.v.install_checklist} onChange={(e) => f.set('install_checklist', e.target.value)} /></div>
          </div>
          {saveBtn}
        </div></Card>
      )}
      {tab === 'tariffs' && <TariffsPanel product={item.id} />}
      {tab === 'equipment' && <EquipmentPanel product={item.id} />}
    </div>
  )
}
