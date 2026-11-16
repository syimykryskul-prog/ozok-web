import { useRef, useState } from 'react'
import { Download, FileUp, Plus, Trash2 } from 'lucide-react'
import { useList, useSend } from '../../api/hooks'
import type { Product, Tariff } from '../../api/types'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Button, DataTable, Input, Modal, Select, Tabs } from '../../components/ui'
import { useToast } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { useForm } from '../../lib/useForm'
import { t, useT } from '../../i18n'
import { useProducts, toId } from '../common/pickers'
import { downloadFile } from '../common/download'

/** «Добавить существующих клиентов» (P0+ п.9): клиенты OZOK, платящие абонплату 100% OZOK (origin=ozok_legacy). */

interface SphereBlock { product: string; tariff: string; monthly_price: string; started_at: string; paid_until: string; external_id: string; elqr_account: string }
const emptySphere = (): SphereBlock => ({ product: '', tariff: '', monthly_price: '', started_at: '', paid_until: '', external_id: '', elqr_account: '' })

function SphereFields({ v, onChange, onRemove, errors }: { v: SphereBlock; onChange: (p: Partial<SphereBlock>) => void; onRemove?: () => void; errors?: Record<string, string> }) {
  const t = useT()
  const products = useProducts()
  const tariffs = useList<Tariff>('tariffs/', { product: v.product || undefined, page_size: 100, is_active: true }, { skip: !v.product })
  return (
    <div className="hint-box stack" style={{ gap: 10 }}>
      <div className="row row--between"><strong>{t('clients.sphere')}</strong>{onRemove && <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={onRemove}>{t('clients.remove')}</Button>}</div>
      <div className="form-grid">
        <Select label={t('clients.product')} placeholder={t('clients.choose')} options={products.map((p: Product) => ({ value: p.id, label: p.sphere || p.name }))} value={v.product} error={errors?.product} onChange={(e) => onChange({ product: e.target.value, tariff: '' })} />
        <Select label={t('clients.tariff')} placeholder={t('clients.ownPrice')} options={(tariffs.rows ?? []).map((t) => ({ value: t.id, label: t.name }))} value={v.tariff} disabled={!v.product} onChange={(e) => onChange({ tariff: e.target.value })} />
        <Input label={t('clients.ownPriceMonth')} inputMode="decimal" value={v.monthly_price} error={errors?.monthly_price} disabled={!!v.tariff} onChange={(e) => onChange({ monthly_price: e.target.value })} hint={t('clients.ifNoTariff')} />
        <Input label={t('clients.clientIdInProduct')} value={v.external_id} error={errors?.external_id} onChange={(e) => onChange({ external_id: e.target.value })} />
        <Input label={t('clients.usingSince')} type="date" value={v.started_at} error={errors?.started_at} onChange={(e) => onChange({ started_at: e.target.value })} />
        <Input label={t('clients.paidUntil')} type="date" value={v.paid_until} error={errors?.paid_until} onChange={(e) => onChange({ paid_until: e.target.value })} />
        <div className="span-2"><Input label={t('clients.elqrTitle')} value={v.elqr_account} error={errors?.elqr_account} onChange={(e) => onChange({ elqr_account: e.target.value })} /></div>
      </div>
    </div>
  )
}

function InlineForm({ onSubmit, saving, error, submitLabel, onClose, children }: { onSubmit: () => void; saving?: boolean; error?: string; submitLabel: string; onClose: () => void; children: ReactNode }) {
  const t = useT()
  return (
    <form noValidate className="stack" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
      {error && <div className="alert alert--error" role="alert"><TriangleAlert size={18} aria-hidden />{error}</div>}
      {children}
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <Button type="button" variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        <Button type="submit" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  )
}

interface DupInfo { client: number | null; business_name?: string; origin?: string; reasons: string[]; can_merge: boolean; merge_blocker?: string }

function OneTab({ onDone }: { onDone: () => void }) {
  const t = useT()
  const [send] = useSend()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [dups, setDups] = useState<DupInfo[]>([])
  const f = useForm({ business_name: '', inn: '', contact_name: '', phone: '', city: '', region: '', address: '' })
  const [spheres, setSpheres] = useState<SphereBlock[]>([emptySphere()])
  const patch = (i: number, p: Partial<SphereBlock>) => setSpheres((s) => s.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const submit = async (mergeInto?: number) => {
    const e: Record<string, string[]> = {}
    if (!f.v.business_name.trim()) e.business_name = [t('clients.companyRequired')]
    if (spheres.some((s) => !s.product)) e.spheres = [t('clients.pickProductPerSphere')]
    if (Object.keys(e).length) return f.fail({ data: e })
    f.clear(); setDups([]); setBusy(true)
    try {
      await send('clients/legacy/', {
        ...f.v, business_name: f.v.business_name.trim(), ...(mergeInto ? { merge_into: mergeInto } : {}),
        spheres: spheres.map((s) => ({
          product: toId(s.product), tariff: toId(s.tariff), ...(s.tariff || !s.monthly_price ? {} : { monthly_price: s.monthly_price.replace(',', '.') }),
          started_at: s.started_at || null, paid_until: s.paid_until || null, external_id: s.external_id.trim(), elqr_account: s.elqr_account.trim(),
        })),
      })
      toast.success(mergeInto ? t('clients.sphereAdded') : t('clients.clientAdded'))
      onDone()
    } catch (err) {
      const d = (err as { data?: { duplicates?: DupInfo[] } }).data
      if (d?.duplicates?.length) setDups(d.duplicates)
      else f.fail(err)
    } finally { setBusy(false) }
  }
  return (
    <InlineForm onSubmit={() => void submit()} saving={busy} error={f.general || f.errors.spheres || (dups.length ? t('clients.dupFound') : '')} onClose={onDone} submitLabel={t('clients.addClientBtn')}>
      {dups.map((d, i) => (
        <div key={i} className="hint-box row row--between" style={{ background: 'var(--warning-bg)' }}>
          <div><strong>{d.business_name ?? t('clients.client')}</strong><div className="muted" style={{ fontSize: 13 }}>{t('clients.match', { reasons: d.reasons.join('; ') })}{!d.can_merge && d.merge_blocker ? ` · ${d.merge_blocker}` : ''}</div></div>
          {d.can_merge && d.client && <Button type="button" size="sm" loading={busy} onClick={() => void submit(d.client as number)}>{t('clients.addSphereToThis')}</Button>}
        </div>
      ))}
      <div className="form-grid">
        <div className="span-2"><Input label={t('clients.companyName')} value={f.v.business_name} error={f.errors.business_name} onChange={(e) => f.set('business_name', e.target.value)} /></div>
        <Input label={t('clients.inn')} value={f.v.inn} error={f.errors.inn} onChange={(e) => f.set('inn', e.target.value)} />
        <Input label={t('clients.contactPerson')} value={f.v.contact_name} error={f.errors.contact_name} onChange={(e) => f.set('contact_name', e.target.value)} />
        <Input label={t('common.phone')} value={f.v.phone} error={f.errors.phone} onChange={(e) => f.set('phone', e.target.value)} />
        <Input label={t('common.city')} value={f.v.city} error={f.errors.city} onChange={(e) => f.set('city', e.target.value)} />
        <Input label={t('common.region')} value={f.v.region} error={f.errors.region} onChange={(e) => f.set('region', e.target.value)} />
        <Input label={t('clients.branchAddress')} value={f.v.address} error={f.errors.address} onChange={(e) => f.set('address', e.target.value)} />
      </div>
      {spheres.map((s, i) => <SphereFields key={i} v={s} onChange={(p) => patch(i, p)} onRemove={spheres.length > 1 ? () => setSpheres((x) => x.filter((_, k) => k !== i)) : undefined} />)}
      <div><Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setSpheres((s) => [...s, emptySphere()])}>{t('clients.addSphere')}</Button></div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('clients.legacyNote')}</p>
    </InlineForm>
  )
}

interface ImportRow {
  line: number; status: 'new' | 'duplicate' | 'error' | 'created' | 'merged' | 'skipped' | string; business_name?: string
  errors?: string[]; message?: string; duplicates?: DupInfo[]; can_merge?: boolean; client?: number | null
}
interface ImportResult { rows?: ImportRow[]; summary?: Record<string, number> }

const ROW: Record<string, { label: string; bg: string; tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  new: { get label() { return t('clients.row.new') }, bg: 'var(--success-bg)', tone: 'success' }, duplicate: { get label() { return t('clients.row.duplicate') }, bg: 'var(--warning-bg)', tone: 'warning' },
  error: { get label() { return t('clients.row.error') }, bg: 'var(--error-bg)', tone: 'error' }, created: { get label() { return t('clients.row.created') }, bg: 'var(--success-bg)', tone: 'success' },
  merged: { get label() { return t('clients.row.merged') }, bg: 'var(--success-bg)', tone: 'info' }, skipped: { get label() { return t('clients.row.skipped') }, bg: 'transparent', tone: 'neutral' },
}

function ImportTab({ onDone }: { onDone: () => void }) {
  const t = useT()
  const products = useProducts()
  const [send] = useSend<ImportResult>()
  const toast = useToast()
  const [product, setProduct] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [done, setDone] = useState<ImportResult | null>(null)
  const [dupAction, setDupAction] = useState<Record<string, 'merge' | 'skip'>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const code = products.find((p) => String(p.id) === product)?.code ?? product

  const template = async () => {
    try { await downloadFile('clients/legacy-import/template/', { product: code }, `legacy-clients-${code}.csv`) } catch (e) { toast.error(errorMessage(e)) }
  }
  const body = (f: File) => { const b = new FormData(); b.append('file', f); b.append('product', code); return b }
  const pick = async (f?: File) => {
    if (!f) return
    setFile(f); setPreview(null); setDone(null); setErr('')
    setBusy(true)
    try {
      const r = await send('clients/legacy-import/preview/', body(f))
      setPreview(r)
      setDupAction(Object.fromEntries((r.rows ?? []).filter((x) => x.status === 'duplicate' && x.can_merge).map((x) => [String(x.line), 'skip' as const])))
    } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const rows = (done ?? preview)?.rows ?? []
  const n = rows.filter((r) => r.status === 'new').length + rows.filter((r) => r.status === 'duplicate' && dupAction[String(r.line)] === 'merge').length
  const confirm = async () => {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const b = body(file)
      b.append('duplicates', 'skip')
      b.append('actions', JSON.stringify(dupAction))
      setDone(await send('clients/legacy-import/confirm/', b))
    } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const sum = (done ?? preview)?.summary ?? {}
  return (
    <InlineForm onClose={onDone} saving={busy} error={err} submitLabel={done ? t('common.done') : t('clients.importN', { n })}
      onSubmit={() => { if (done) onDone(); else if (preview && n > 0) void confirm(); else setErr(t('clients.noRows')) }}>
      <div className="form-grid">
        <Select label={t('clients.sphere')} placeholder={t('clients.chooseSphere')} options={products.map((p) => ({ value: p.id, label: p.sphere || p.name }))} value={product} onChange={(e) => { setProduct(e.target.value); setPreview(null); setDone(null); setFile(null) }} />
        <div className="field"><span className="field__label">{t('clients.template')}</span><Button type="button" variant="secondary" icon={Download} disabled={!product} onClick={template}>{t('clients.downloadTemplate')}</Button></div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <Button type="button" variant="secondary" icon={FileUp} disabled={!product} onClick={() => input.current?.click()}>{file ? t('clients.pickOtherFile') : t('clients.uploadFile')}</Button>
        <span className="muted">{file?.name || t('clients.csvHint')}</span>
      </div>
      {(preview || done) && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(sum).map(([k, v]) => <Badge key={k} tone={ROW[k]?.tone ?? 'neutral'}>{ROW[k]?.label ?? k}: {v}</Badge>)}
          </div>
          <DataTable rows={rows} rowKey={(r) => String(r.line)} emptyTitle={t('clients.noRowsTitle')} emptyText=" "
            columns={[
              { key: 'l', header: '№', render: (r) => r.line },
              { key: 'n', header: t('clients.client'), render: (r) => <div style={{ background: ROW[r.status]?.bg, padding: 4, borderRadius: 6 }}><strong>{r.business_name}</strong></div> },
              { key: 's', header: t('clients.result'), render: (r) => (
                <div><Badge small tone={ROW[r.status]?.tone ?? 'neutral'}>{ROW[r.status]?.label ?? r.status}</Badge>
                  {(r.errors ?? []).map((m, i) => <div key={i} className="muted" style={{ fontSize: 12 }}>{m}</div>)}
                  {r.message && <div className="muted" style={{ fontSize: 12 }}>{r.message}</div>}
                  {(r.duplicates ?? []).map((d, i) => <div key={i} className="muted" style={{ fontSize: 12 }}>{d.business_name ? `${d.business_name}: ` : ''}{d.reasons.join('; ')}{!d.can_merge && d.merge_blocker ? ` · ${d.merge_blocker}` : ''}</div>)}
                  {r.status === 'duplicate' && !done && r.can_merge && (
                    <Select aria-label={t('clients.dupActionAria')} options={[{ value: 'skip', label: t('clients.skip') }, { value: 'merge', label: t('clients.merge') }]}
                      value={dupAction[String(r.line)] ?? 'skip'} onChange={(e) => setDupAction((d) => ({ ...d, [String(r.line)]: e.target.value as 'merge' | 'skip' }))} />
                  )}</div>) },
            ]} />
        </>
      )}
    </InlineForm>
  )
}

type Tab = 'one' | 'import'

export function LegacyClientsModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [tab, setTab] = useState<Tab>('one')
  return (
    <Modal open wide title={t('clients.legacyTitle')} onClose={onClose}>
      <Tabs<Tab> tabs={[{ value: 'one', label: t('clients.tab.one') }, { value: 'import', label: t('clients.tab.import') }]} value={tab} onChange={setTab} />
      {tab === 'one' ? <OneTab onDone={onClose} /> : <ImportTab onDone={onClose} />}
    </Modal>
  )
}

