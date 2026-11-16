import { useState } from 'react'
import { Calculator, Plus } from 'lucide-react'
import { useList, useOne, useSend } from '../../api/hooks'
import type { CommissionPreview, CommissionRule, Product, Tariff } from '../../api/types'
import { Badge, Button, Card, CardTitle, Checkbox, DataTable, ErrorAlert, FormModal, Input, Money, Select, Textarea } from '../../components/ui'
import { t } from '../../i18n'
import { formatDate, formatMoney, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { FIXED_PER, LEAD_SOURCES, PARTNER_TIERS, RULE_BASE, RULE_KINDS, dictOptions } from '../../lib/status'
import { FranchiseeSelect, useProducts } from '../common/pickers'
import { useToast } from '../../components/ui'
import { addDays } from './ruleDates'

export function describeCalc(r: CommissionRule): string {
  const parts: string[] = []
  if (r.percent != null && r.percent !== '') parts.push(`${toNum(r.percent)}%`)
  if (r.fixed_amount != null && r.fixed_amount !== '' && toNum(r.fixed_amount) > 0) parts.push(`${formatMoney(r.fixed_amount)} ${FIXED_PER[r.fixed_per] ?? ''}`.trim())
  const nbs = r.sale_kind && r.sale_kind !== 'subscription' && r.percent != null && r.percent !== '' ? ` · ${t('settings.rule.ozok_share')} ${100 - toNum(r.percent)}%` : ''
  return (parts.join(' + ') || '—') + (r.base ? ` · ${RULE_BASE[r.base] ?? r.base}` : '') + nbs
}

export function describeScope(r: CommissionRule): string {
  const s = [r.franchisee_name, r.product_name, r.tariff_name, r.sale_kind ? RULE_KINDS[r.sale_kind] ?? r.sale_kind : null, r.partner_tier ? PARTNER_TIERS[r.partner_tier] ?? r.partner_tier : null, r.lead_source ? t('settings.rule.lead_fmt', { v: LEAD_SOURCES[r.lead_source] ?? r.lead_source }) : null].filter(Boolean)
  return s.length ? s.join(' · ') : t('settings.rule.any')
}

/** Версии правила: те же название и область, по датам начала. */
function Versions({ item }: { item: CommissionRule }) {
  const { rows } = useList<CommissionRule>('commission-rules/', { page_size: 100, search: item.name, ordering: '-valid_from' })
  const same = (rows ?? []).filter((r) => r.name === item.name && (r.franchisee ?? null) === (item.franchisee ?? null) && (r.product ?? null) === (item.product ?? null) && (r.tariff ?? null) === (item.tariff ?? null) && (r.sale_kind ?? '') === (item.sale_kind ?? ''))
  return (
    <div className="stack" style={{ gap: 6 }}>
      <strong style={{ fontSize: 14 }}>{t('settings.rule.versions')}</strong>
      <DataTable rows={same} rowKey={(r) => r.id} emptyTitle={t('settings.rule.no_versions')} emptyText=" "
        columns={[
          { key: 'v', header: t('settings.col_valid'), render: (r) => `${r.valid_from ? formatDate(r.valid_from) : '…'} — ${r.valid_to ? formatDate(r.valid_to) : t('settings.rule.until_now')}${r.id === item.id ? ` ${t('settings.rule.this')}` : ''}` },
          { key: 'c', header: t('settings.rule.calc'), render: (r) => describeCalc(r) },
          { key: 'a', header: t('common.status'), render: (r) => <Badge small tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? t('settings.rule.on') : t('settings.rule.off')}</Badge> },
        ]} />
    </div>
  )
}

export function RuleForm({ item, franchisee, onClose }: { item?: CommissionRule; franchisee?: number; onClose: () => void }) {
  const [send] = useSend()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const act = async (path: string, body: unknown, ok: string, method: 'POST' | 'PATCH' = 'POST') => {
    setBusy(true)
    try { const r = await send(path, body, method); toast.success(ok); return r } catch (e) { f.fail(e); return undefined } finally { setBusy(false) }
  }
  const products = useProducts()
  const f = useForm({
    name: item?.name ?? '', franchisee: String(item?.franchisee ?? franchisee ?? ''), product: String(item?.product ?? ''), tariff: String(item?.tariff ?? ''),
    sale_kind: item?.sale_kind ?? '', percent: item?.percent != null ? String(toNum(item.percent)) : '', fixed_amount: item?.fixed_amount != null ? String(toNum(item.fixed_amount)) : '',
    fixed_per: item?.fixed_per || 'sale', base: item?.base || 'paid', valid_from: item?.valid_from ?? '', valid_to: item?.valid_to ?? '', is_active: item?.is_active ?? true, note: item?.note ?? '',
    partner_tier: item?.partner_tier ?? '', lead_source: item?.lead_source ?? '', basis: item?.basis ?? '', effective_from: item?.effective_from ?? '',
  })
  const { rows: tariffs } = useList<Tariff>('tariffs/', { page_size: 100, product: f.v.product || undefined }, { skip: !f.v.product })
  const [newFrom, setNewFrom] = useState(addDays(toISODate(new Date()), 1))
  const [reason, setReason] = useState('')
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (item && !reason.trim()) e.reason = [t('settings.rule.err_reason')]
    if (!f.v.name.trim()) e.name = [t('settings.err.name')]
    if (f.v.percent === '' && f.v.fixed_amount === '') e.percent = [t('settings.rule.err_calc')]
    if (!item && !f.v.basis.trim()) e.basis = [t('settings.rule.err_basis')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = {
      name: f.v.name.trim(), franchisee: f.v.franchisee ? Number(f.v.franchisee) : null, product: f.v.product ? Number(f.v.product) : null,
      tariff: f.v.product && f.v.tariff ? Number(f.v.tariff) : null, sale_kind: f.v.sale_kind,
      percent: f.v.percent === '' ? null : f.v.percent.replace(',', '.'), fixed_amount: f.v.fixed_amount === '' ? null : f.v.fixed_amount.replace(',', '.'),
      fixed_per: f.v.fixed_per, base: f.v.base, valid_from: f.v.valid_from || null, valid_to: f.v.valid_to || null, is_active: f.v.is_active, note: f.v.note,
      partner_tier: f.v.partner_tier, lead_source: f.v.lead_source, basis: f.v.basis.trim(), effective_from: f.v.effective_from || null,
    }
    if (item) {
      // изменение используемого правила = новая версия «с даты»; старая закрывается днём раньше
      const r = await act(`commission-rules/${item.id}/new-version/`, {
        reason: reason.trim(), valid_from: newFrom, name: body.name, percent: body.percent, fixed_amount: body.fixed_amount, fixed_per: body.fixed_per, base: body.base, basis: body.basis || undefined, note: body.note,
      }, t('settings.rule.version_created'))
      if (r) onClose()
      return
    }
    const r = await act('commission-rules/', body, t('settings.split.created'))
    if (r) onClose()
  }
  return (
    <FormModal wide title={item ? t('settings.rule.edit_title') : t('settings.rule.new')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <Input label={t('common.name')} value={f.v.name} onChange={(e) => f.set('name', e.target.value)} error={f.errors.name} placeholder={t('settings.rule.name_ph')} />
      <strong style={{ fontSize: 14 }}>{t('settings.rule.scope')}</strong>
      <div className="form-grid">
        <div className="span-2"><FranchiseeSelect label={t('settings.franchisee')} placeholder={t('settings.any_m')} value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} disabled={!!franchisee} /></div>
        <Select label={t('settings.sphere')} placeholder={t('settings.any_f')} value={f.v.product} onChange={(e) => { f.set('product', e.target.value); f.set('tariff', '') }} options={products.map((p) => ({ value: p.id, label: p.sphere || p.name }))} />
        <Select label={t('settings.tariff.col')} placeholder={t('settings.any_m')} disabled={!f.v.product} value={f.v.tariff} onChange={(e) => f.set('tariff', e.target.value)} options={(tariffs ?? []).map((x) => ({ value: x.id, label: x.name }))} />
        <Select label={t('settings.rule.sale_kind')} placeholder={t('settings.any_m')} value={f.v.sale_kind} onChange={(e) => f.set('sale_kind', e.target.value)} options={dictOptions(RULE_KINDS)} />
        <Select label={t('settings.rule.partner_tier')} placeholder={t('settings.any_m')} value={f.v.partner_tier} onChange={(e) => f.set('partner_tier', e.target.value)} options={dictOptions(PARTNER_TIERS)} />
        <Select label={t('settings.rule.lead_source')} placeholder={t('settings.any_m')} value={f.v.lead_source} onChange={(e) => f.set('lead_source', e.target.value)} options={dictOptions(LEAD_SOURCES)} />
      </div>
      <strong style={{ fontSize: 14 }}>{t('settings.rule.income_calc')}</strong>
      <div className="form-grid">
        <Input label={t('settings.rule.percent')} inputMode="decimal" value={f.v.percent} onChange={(e) => f.set('percent', e.target.value)} error={f.errors.percent}
          hint={f.v.sale_kind && f.v.sale_kind !== 'subscription' && f.v.percent !== '' ? t('settings.rule.ozok_pct', { n: 100 - toNum(f.v.percent) }) : undefined} />
        <Input label={t('settings.rule.fixed')} inputMode="decimal" value={f.v.fixed_amount} onChange={(e) => f.set('fixed_amount', e.target.value)} />
        <Select label={t('settings.rule.fixed_per')} options={dictOptions(FIXED_PER)} value={f.v.fixed_per} onChange={(e) => f.set('fixed_per', e.target.value)} />
        <Select label={t('settings.rule.base')} options={dictOptions(RULE_BASE)} value={f.v.base} onChange={(e) => f.set('base', e.target.value)} />
        {item ? <Input label={t('settings.rule.change_from')} type="date" value={newFrom} min={toISODate(new Date())} onChange={(e) => setNewFrom(e.target.value)} error={f.errors.valid_from} hint={t('settings.rule.change_hint')} /> : <Input label={t('settings.valid_from')} type="date" value={f.v.valid_from} error={f.errors.valid_from} onChange={(e) => f.set('valid_from', e.target.value)} />}
        {!item && <Input label={t('settings.valid_to')} type="date" value={f.v.valid_to} error={f.errors.valid_to} onChange={(e) => f.set('valid_to', e.target.value)} />}
      </div>
      {item
        ? <Input label={t('settings.rule.reason_req')} value={reason} onChange={(e) => setReason(e.target.value)} error={f.errors.reason} placeholder={t('settings.rule.basis_ph')} />
        : <Input label={t('settings.rule.basis_req')} value={f.v.basis} onChange={(e) => f.set('basis', e.target.value)} error={f.errors.basis} placeholder={t('settings.rule.basis_ph')} />}
      {item && <Versions item={item} />}
      <Textarea label={t('settings.note')} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} />
      <Checkbox label={t('settings.rule.active')} checked={f.v.is_active} onChange={(e) => f.set('is_active', e.target.checked)} />
    </FormModal>
  )
}

function Preview() {
  const products = useProducts()
  const f = useForm({ franchisee: '', product: '', tariff: '', sale_kind: 'subscription', amount: '1000', months: '1', date: toISODate(new Date()) })
  const { rows: tariffs } = useList<Tariff>('tariffs/', { page_size: 100, product: f.v.product || undefined }, { skip: !f.v.product })
  const ready = !!f.v.franchisee && toNum(f.v.amount) > 0
  const res = useOne<CommissionPreview>('commission-rules/preview/', {
    franchisee: f.v.franchisee, product: f.v.product || undefined, tariff: f.v.tariff || undefined, sale_kind: f.v.sale_kind, amount: f.v.amount, months: f.v.months, date: f.v.date,
  }, { skip: !ready })
  const p = res.data
  return (
    <Card white>
      <CardTitle><span className="row"><Calculator size={20} aria-hidden /> {t('settings.calc.title')}</span></CardTitle>
      <div className="form-grid">
        <FranchiseeSelect value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} />
        <Select label={t('settings.sphere')} placeholder={t('settings.any_f')} value={f.v.product} onChange={(e) => { f.set('product', e.target.value); f.set('tariff', '') }} options={products.map((x) => ({ value: x.id, label: x.sphere || x.name }))} />
        <Select label={t('settings.tariff.col')} placeholder={t('settings.any_m')} disabled={!f.v.product} value={f.v.tariff} onChange={(e) => f.set('tariff', e.target.value)} options={(tariffs ?? []).map((x) => ({ value: x.id, label: x.name }))} />
        <Select label={t('settings.calc.kind')} options={dictOptions(RULE_KINDS)} value={f.v.sale_kind} onChange={(e) => f.set('sale_kind', e.target.value)} />
        <Input label={t('settings.amount_som')} inputMode="decimal" value={f.v.amount} onChange={(e) => f.set('amount', e.target.value)} />
        <Input label={t('settings.calc.months')} type="number" min={1} value={f.v.months} onChange={(e) => f.set('months', e.target.value)} />
        <Input label={t('settings.calc.on_date')} type="date" value={f.v.date} onChange={(e) => f.set('date', e.target.value)} />
      </div>
      <div style={{ marginTop: 16 }}>
        <ErrorAlert error={res.error} />
        {!ready ? <p className="muted">{t('settings.calc.pick')}</p> : res.isFetching ? <span className="skeleton" style={{ height: 40 }} /> : p && (
          <div className="hint-box">
            {t('settings.calc.income')}: <strong><Money value={p.income} /></strong><br />
            {p.rule ? <>{t('settings.calc.rule')}: <strong>{p.rule.name}</strong> ({describeCalc(p.rule)})</> : t('settings.calc.no_rule')}
          </div>
        )}
      </div>
    </Card>
  )
}

export function RulesPanel() {
  const products = useProducts()
  const [form, setForm] = useState<CommissionRule | 'new' | null>(null)
  const [fil, setFil] = useState({ product: '', franchisee: '', sale_kind: '', active_on: '' })
  const { rows, isLoading, error } = useList<CommissionRule>('commission-rules/', { page_size: 100, ...fil })
  return (
    <div className="stack">
      <div className="filters">
        <Select label={t('settings.sphere')} placeholder={t('common.all')} options={products.map((p) => ({ value: p.id, label: p.sphere || p.name }))} value={fil.product} onChange={(e) => setFil({ ...fil, product: e.target.value })} />
        <FranchiseeSelect label={t('settings.franchisee')} placeholder={t('common.all')} value={fil.franchisee} onChange={(v) => setFil({ ...fil, franchisee: v })} />
        <Select label={t('settings.calc.kind')} placeholder={t('common.all')} options={dictOptions(RULE_KINDS)} value={fil.sale_kind} onChange={(e) => setFil({ ...fil, sale_kind: e.target.value })} />
        <Input label={t('settings.rule.active_on')} type="date" value={fil.active_on} onChange={(e) => setFil({ ...fil, active_on: e.target.value })} />
        <Button icon={Plus} onClick={() => setForm('new')}>{t('settings.rule.add')}</Button>
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={setForm}
          emptyTitle={t('settings.split.empty')} emptyText={t('settings.rule.empty_text')}
          columns={[
            { key: 'n', header: t('settings.rule.col'), render: (r) => <strong>{r.name}</strong> },
            { key: 's', header: t('settings.rule.col_scope'), render: (r) => describeScope(r) },
            { key: 'c', header: t('settings.rule.calc'), render: (r) => describeCalc(r) },
            { key: 'v', header: t('settings.rule.col_term'), render: (r) => (r.valid_from || r.valid_to ? `${r.valid_from ? formatDate(r.valid_from) : '…'} — ${r.valid_to ? formatDate(r.valid_to) : '…'}` : t('settings.rule.unlimited')) },
            { key: 'a', header: t('common.status'), render: (r) => <Badge tone={r.is_active ? 'success' : 'neutral'} small>{r.is_active ? t('settings.rule.on') : t('settings.rule.off')}</Badge> },
          ]}
        />
      </Card>
      <Preview />
      {form && <RuleForm item={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  )
}

export type { Product }
