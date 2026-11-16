import { useEffect, useState } from 'react'
import { t, useT } from '../../i18n'
import { Plus } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { Charge, CommissionRule, Contract, FranchiseOffer, Package, PriceQuote } from '../../api/types'
import { HistoryTab } from '../common/shared'
import {
  Badge, Button, Card, DataTable, Dl, ErrorAlert, FormModal, Input, Modal, Money, PageHeader, SearchInput, Select, StatusChip, Tabs, Textarea, Bar,
} from '../../components/ui'
import { formatDate, formatMoney, toISODate, toNum } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { CHARGE_KINDS, SCHEMES, dictOptions, statusOptions } from '../../lib/status'
import { FranchiseeSelect, useProducts } from '../common/pickers'
import { useAct, useCan, useIsHq } from '../common/useAct'
import { RuleForm, describeCalc, describeScope } from '../settings/RulesPanel'

function Part({ label, paid, total }: { label: string; paid?: string; total: number }) {
  const t = useT()
  if (!(total > 0)) return null
  const p = toNum(paid)
  return (
    <div>
      <div style={{ fontSize: 13 }}>{label}: <strong>{formatMoney(p)}</strong> {t('contracts.of')} {formatMoney(total)}</div>
      <Bar value={total ? p / total : 0} tone={p >= total ? 'success' : 'info'} />
    </div>
  )
}

export function PayoffProgress({ c }: { c: Contract }) {
  const t = useT()
  const hasParts = c.upfront_amount != null || c.installments_total != null || c.remainder_amount != null
  if (hasParts) {
    return (
      <div style={{ minWidth: 220, display: 'grid', gap: 6 }}>
        <Part label={t('contracts.partUpfront')} paid={c.upfront_paid} total={toNum(c.upfront_amount)} />
        <Part label={t('contracts.partInstall')} paid={c.installments_paid} total={toNum(c.installments_total)} />
        <Part label={t('contracts.partWithheld')} paid={c.withheld_paid ?? c.paid_off_amount} total={toNum(c.remainder_amount)} />
        {c.remaining_amount != null && <div className="muted" style={{ fontSize: 12 }}>{t('contracts.totalLeft', { amount: formatMoney(c.remaining_amount) })}</div>}
      </div>
    )
  }
  const paid = toNum(c.paid_off_amount)
  const total = toNum(c.fee_total)
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontSize: 13 }}>{t('contracts.paidOff')} <strong>{formatMoney(paid)}</strong> {t('contracts.of')} {formatMoney(total)}</div>
      <Bar value={total ? paid / total : 0} tone={paid >= total && total > 0 ? 'success' : 'info'} />
      {c.remaining_amount != null && <div className="muted" style={{ fontSize: 12 }}>{t('contracts.left', { amount: formatMoney(c.remaining_amount) })}</div>}
    </div>
  )
}

const presets = () => (['cash', 'prepay', 'per_sale', 'hybrid'] as const).map((value) => ({ value, label: t(`contracts.preset.${value}`) }))

function ContractForm({ contract, franchisee, onClose }: { contract?: Contract; franchisee?: number; onClose: () => void }) {
  const t = useT()
  const hq = useIsHq()
  const { act, busy } = useAct()
  const products = useProducts()
  const { rows: pkgs } = useList<Package>('packages/', { page_size: 100 })
  const { rows: offers } = useList<FranchiseOffer>('franchise-offers/', { page_size: 50, is_active: true })
  const [touched, setTouched] = useState(!!contract)
  const [ruleFor, setRuleFor] = useState(false)
  const f = useForm({
    franchisee: String(contract?.franchisee ?? franchisee ?? ''),
    kind: (contract?.package ? 'package' : 'product') as 'product' | 'package',
    product: String(contract?.product ?? ''), package: String(contract?.package ?? ''),
    payment_scheme: contract?.payment_scheme ?? 'cash',
    signed_at: contract?.signed_at ?? toISODate(new Date()), fee_total: contract?.fee_total ?? '',
    upfront_amount: String(toNum(contract?.upfront_amount)), upfront_due: contract?.upfront_due ?? '',
    installments_total: String(toNum(contract?.installments_total)), installments_count: String(contract?.installments_count ?? 3), installment_step_months: String(contract?.installment_step_months ?? 1),
    withhold_percent: String(contract?.withhold_percent != null ? toNum(contract.withhold_percent) : 30), discount_note: contract?.discount_note ?? '',
    valid_until: contract?.valid_until ?? '', note: contract?.note ?? '',
  })
  const sel = f.v.kind === 'product' ? f.v.product : f.v.package
  const quote = useOne<PriceQuote>('contracts/price-quote/', { [f.v.kind]: sel, scheme: f.v.payment_scheme === 'hybrid' ? 'cash' : f.v.payment_scheme }, { skip: !sel })
  const list = toNum(quote.data?.list_price)
  const rules = useList<CommissionRule>('commission-rules/', { franchisee: f.v.franchisee, page_size: 50 }, { skip: !f.v.franchisee })

  const fee = toNum(f.v.fee_total)
  const up = toNum(f.v.upfront_amount)
  const inst = toNum(f.v.installments_total)
  const remainder = fee - up - inst
  const cnt = Math.max(1, Number(f.v.installments_count) || 1)
  const discount = list > 0 ? list - fee : 0

  const preset = (p: string, feeNow = fee) => {
    f.set('payment_scheme', p)
    if (p === 'cash') { f.set('upfront_amount', String(feeNow)); f.set('installments_total', '0') }
    if (p === 'prepay') { const u = Math.round(feeNow * 0.4); f.set('upfront_amount', String(u)); f.set('installments_total', String(feeNow - u)) }
    if (p === 'per_sale') { f.set('upfront_amount', '0'); f.set('installments_total', '0'); if (!toNum(f.v.withhold_percent)) f.set('withhold_percent', '30') }
  }

  useEffect(() => {
    if (!touched && quote.data) { f.set('fee_total', String(toNum(quote.data.list_price))); preset(f.v.payment_scheme, toNum(quote.data.list_price)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.data])

  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (hq && !contract && !f.v.franchisee) e.franchisee = [t('contracts.err.franchisee')]
    if (!sel) e[f.v.kind] = [t('contracts.err.sel')]
    if (!(fee > 0)) e.fee_total = [t('contracts.err.fee')]
    if (up + inst > fee + 0.001) e.upfront_amount = [t('contracts.err.parts')]
    if (remainder > 0.001 && !(toNum(f.v.withhold_percent) > 0)) e.withhold_percent = [t('contracts.err.withhold')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const body = {
      franchisee: Number(f.v.franchisee) || undefined,
      product: f.v.kind === 'product' ? Number(f.v.product) : null,
      package: f.v.kind === 'package' ? Number(f.v.package) : null,
      payment_scheme: f.v.payment_scheme, signed_at: f.v.signed_at || null, fee_total: f.v.fee_total.replace(',', '.'),
      upfront_amount: f.v.upfront_amount || '0', upfront_due: f.v.upfront_due || null,
      installments_total: f.v.installments_total || '0', installments_count: inst > 0 ? cnt : 0, installment_step_months: Number(f.v.installment_step_months) || 1,
      withhold_percent: f.v.withhold_percent || '0', discount_note: f.v.discount_note,
      valid_until: f.v.valid_until || null, note: f.v.note,
    }
    const r = contract ? await act(`contracts/${contract.id}/`, body, t('contracts.saved'), 'PATCH') : await act('contracts/', body, t('contracts.created'))
    if (r) onClose()
  }

  return (
    <FormModal wide title={contract ? t('contracts.title', { number: contract.number }) : t('contracts.newTitle')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        {hq && <div className="span-2"><FranchiseeSelect value={f.v.franchisee} onChange={(v) => f.set('franchisee', v)} error={f.errors.franchisee} disabled={!!contract || !!franchisee} /></div>}
        <Select label={t('contracts.buys')} options={[{ value: 'product', label: t('contracts.oneSphere') }, { value: 'package', label: t('contracts.pkgSpheres') }]} value={f.v.kind}
          onChange={(e) => { f.set('kind', e.target.value as 'product' | 'package'); setTouched(false) }} />
        {f.v.kind === 'product' ? (
          <Select label={t('contracts.sphere')} placeholder={t('contracts.pickSphere')} error={f.errors.product} value={f.v.product}
            options={products.filter((p) => p.is_active).map((p) => ({ value: p.id, label: `${p.sphere} · ${p.name}` }))}
            onChange={(e) => { f.set('product', e.target.value); setTouched(false) }} />
        ) : (
          <Select label={t('contracts.package')} placeholder={t('contracts.pickPackage')} error={f.errors.package} value={f.v.package}
            options={(pkgs ?? []).filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name }))}
            onChange={(e) => { f.set('package', e.target.value); setTouched(false) }} />
        )}
        <Input label={t('contracts.signedDate')} type="date" value={f.v.signed_at} onChange={(e) => f.set('signed_at', e.target.value)} />
        <Input label={t('contracts.feeSom')} inputMode="decimal" value={f.v.fee_total} error={f.errors.fee_total}
          onChange={(e) => { setTouched(true); f.set('fee_total', e.target.value) }} />
        <div className="span-2">
          <div className="hint-box">
            {!sel ? t('contracts.hintNoSel') : quote.isFetching ? t('contracts.hintCalc') : quote.error ? t('contracts.hintNoPrice') : (
              <>{t('contracts.listPrice')} <strong>{formatMoney(list)}</strong>
                {discount > 0 && <> · {t('contracts.discountWord')} <strong>{formatMoney(discount)}</strong> ({Math.round((discount / list) * 100)}%)</>}
                {discount < 0 && <> · {t('contracts.markupWord')} {formatMoney(-discount)}</>} · {t('contracts.finalSum')} <strong>{formatMoney(fee)}</strong></>
            )}
          </div>
        </div>
        <div className="span-2"><Input label={t('contracts.discountNote')} value={f.v.discount_note} onChange={(e) => f.set('discount_note', e.target.value)} placeholder={t('contracts.discountNotePh')} /></div>

        {!!offers?.length && (
          <div className="span-2 field">
            <span className="field__label">{t('contracts.offerTpl')}</span>
            <div className="multi">
              {offers.map((o) => (
                <button key={o.id} type="button" className="chip" onClick={() => {
                  const total = toNum(o.total), upf = toNum(o.upfront), rest = total - upf
                  setTouched(true)
                  f.set('fee_total', String(total)); f.set('upfront_amount', String(upf)); f.set('installments_total', String(rest))
                  f.set('installments_count', String(o.installments_count || 1)); f.set('installment_step_months', String(o.step_months || 1))
                  f.set('payment_scheme', rest > 0 ? 'hybrid' : 'cash')
                }}>{o.name} · {formatMoney(o.total)}</button>
              ))}
            </div>
          </div>
        )}
        <div className="span-2 field">
          <span className="field__label">{t('contracts.howPays')}</span>
          <div className="multi">
            {presets().map((p) => <button key={p.value} type="button" className={`chip ${f.v.payment_scheme === p.value ? 'chip--active' : ''}`} aria-pressed={f.v.payment_scheme === p.value} onClick={() => preset(p.value)}>{p.label}</button>)}
          </div>
        </div>
        <Input label={t('contracts.upfrontSom')} inputMode="decimal" value={f.v.upfront_amount} error={f.errors.upfront_amount} onChange={(e) => { f.set('upfront_amount', e.target.value); f.set('payment_scheme', 'hybrid') }} />
        <Input label={t('contracts.upfrontDue')} type="date" value={f.v.upfront_due} onChange={(e) => f.set('upfront_due', e.target.value)} hint={t('contracts.upfrontDueHint')} />
        <Input label={t('contracts.installSom')} inputMode="decimal" value={f.v.installments_total} onChange={(e) => { f.set('installments_total', e.target.value); f.set('payment_scheme', 'hybrid') }} />
        <Input label={t('contracts.installCount')} type="number" min={1} value={f.v.installments_count} onChange={(e) => f.set('installments_count', e.target.value)} />
        <Input label={t('contracts.stepMonths')} type="number" min={1} value={f.v.installment_step_months} onChange={(e) => f.set('installment_step_months', e.target.value)} />
        <Input label={t('contracts.withholdPct')} inputMode="decimal" value={f.v.withhold_percent} error={f.errors.withhold_percent} onChange={(e) => f.set('withhold_percent', e.target.value)} hint={t('contracts.withholdHint')} />
        <div className="span-2">
          <div className="hint-box" style={remainder < -0.001 ? { background: 'var(--error-bg)', borderColor: 'var(--error)' } : undefined}>
            {t('contracts.sumNow')} <strong>{formatMoney(up)}</strong> · {t('contracts.sumInstall')} <strong>{formatMoney(inst)}</strong>{inst > 0 && <> {t('contracts.sumInstallDetail', { cnt, amt: formatMoney(inst / cnt), step: f.v.installment_step_months })}</>} · {t('contracts.sumFromSales')} <strong>{formatMoney(Math.max(0, remainder))}</strong>
            {remainder < -0.001 && <><br />{t('contracts.partsOver', { amount: formatMoney(-remainder) })}</>}
          </div>
        </div>
        <Input label={t('contracts.validUntil')} type="date" value={f.v.valid_until} onChange={(e) => f.set('valid_until', e.target.value)} />
        <div className="span-2"><Textarea label={t('contracts.note')} value={f.v.note} onChange={(e) => f.set('note', e.target.value)} /></div>
        {f.v.franchisee && (
          <div className="span-2">
            <div className="hint-box">
              <strong>{t('contracts.rewardTitle')}</strong>
              {(rules.rows ?? []).length === 0 ? <div className="muted">{t('contracts.noRules')}</div> : (
                <ul className="list">{(rules.rows ?? []).map((r) => <li className="list__item" key={r.id}><span>{r.name}</span><span className="muted">{describeScope(r)} · {describeCalc(r)}</span></li>)}</ul>
              )}
              {hq && <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setRuleFor(true)}>{t('contracts.addRule')}</Button>}
            </div>
          </div>
        )}
      </div>
      {ruleFor && <RuleForm franchisee={Number(f.v.franchisee)} onClose={() => setRuleFor(false)} />}
    </FormModal>
  )
}

function ContractModal({ contract, onClose, onEdit }: { contract: Contract; onClose: () => void; onEdit: () => void }) {
  const t = useT()
  const canWrite = useCan('contracts')
  const { act, busy } = useAct()
  const { data: fresh } = useOne<Contract>(`contracts/${contract.id}/`)
  const c = fresh ?? contract
  const charges = useList<Charge>('charges/', { contract: c.id, page_size: 100, ordering: 'due_date' })
  const [tab, setTab] = useState<'main' | 'history'>('main')
  return (
    <Modal open wide title={t('contracts.title', { number: c.number })} onClose={onClose} footer={
      <>
        {canWrite && c.status === 'draft' && <Button variant="secondary" onClick={onEdit}>{t('common.edit')}</Button>}
        {canWrite && c.status === 'draft' && <Button loading={busy} onClick={async () => { if (await act(`contracts/${c.id}/activate/`, undefined, t('contracts.activated'))) onClose() }}>{t('contracts.activate')}</Button>}
        {canWrite && c.status === 'active' && <Button variant="danger" loading={busy} onClick={async () => { if (await act(`contracts/${c.id}/close/`, undefined, t('contracts.closed'))) onClose() }}>{t('contracts.closeBtn')}</Button>}
        <Button variant="secondary" onClick={onClose}>{t('common.done')}</Button>
      </>
    }>
      <div className="stack">
        <Tabs tabs={[{ value: 'main', label: t('contracts.tabMain') }, { value: 'history', label: t('contracts.tabHistory') }]} value={tab} onChange={setTab} />
        {tab === 'history' && <HistoryTab entity="network.Contract" id={c.id} />}
        {tab === 'main' && <>
        <Dl items={[
          [t('contracts.franchisee'), c.franchisee_name],
          [t('common.status'), <StatusChip key="s" kind="contract" status={c.status} small />],
          [t('contracts.sphereOrPkg'), c.package_name ?? c.product_name],
          [t('contracts.scheme'), SCHEMES[c.payment_scheme] ?? c.payment_scheme],
          [t('contracts.signed'), formatDate(c.signed_at)],
          [t('contracts.validUntil'), formatDate(c.valid_until)],
          [t('contracts.price'), c.list_price ? formatMoney(c.list_price) : '—'],
          [t('contracts.fee'), formatMoney(c.fee_total)],
          [t('contracts.reward'), `${toNum(c.commission_percent)}%`],
          ...(c.payment_scheme === 'prepay' ? [[t('contracts.prepay'), t('contracts.prepayValue', { pct: toNum(c.prepay_percent), n: c.installments })] as [string, string]] : []),
        ]} />
        <PayoffProgress c={c} />
        {c.note && <p className="msg">{c.note}</p>}
        <h3>{t('contracts.scheduleTitle')}</h3>
        {c.status === 'draft' ? <p className="muted">{t('contracts.scheduleDraft')}</p> : (
          <DataTable
            loading={charges.isLoading} rows={charges.rows} rowKey={(r) => r.id}
            emptyTitle={t('contracts.chargesEmpty')} emptyText={c.payment_scheme === 'per_sale' ? t('contracts.chargesEmptyPerSale') : t('contracts.chargesEmptyText')}
            columns={[
              { key: 'd', header: t('contracts.colDue'), render: (r) => formatDate(r.due_date) },
              { key: 'k', header: t('contracts.colKind'), render: (r) => CHARGE_KINDS[r.kind] ?? r.kind },
              { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.amount} /> },
              { key: 'ds', header: t('common.description'), render: (r) => <span className="muted">{r.description}</span> },
            ]}
          />
        )}
        </>}
      </div>
    </Modal>
  )
}

export function ContractsList({ franchisee, embedded }: { franchisee?: number; embedded?: boolean }) {
  const t = useT()
  const hq = useIsHq()
  const canWrite = useCan('contracts')
  const [form, setForm] = useState<Contract | 'new' | null>(null)
  const [view, setView] = useState<Contract | null>(null)
  const ls = useListState({ status: '', payment_scheme: '' }, '-created_at')
  const { rows, data, isLoading, error } = useList<Contract>('contracts/', { ...ls.params, franchisee })
  return (
    <div className="page">
      {!embedded && <PageHeader eyebrow={t('contracts.eyebrow')} title={t('contracts.pageTitle')} actions={canWrite && <Button icon={Plus} onClick={() => setForm('new')}>{t('contracts.newTitle')}</Button>} />}
      {embedded && canWrite && <div className="row"><Button size="sm" icon={Plus} onClick={() => setForm('new')}>{t('contracts.newTitle')}</Button></div>}
      <div className="filters">
        <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('contracts.searchPh')} />
        <Select label={t('common.status')} options={statusOptions('contract')} placeholder={t('common.all')} value={ls.filters.status} onChange={(e) => ls.setFilter('status', e.target.value)} />
        <Select label={t('contracts.scheme')} options={dictOptions(SCHEMES)} placeholder={t('common.all')} value={ls.filters.payment_scheme} onChange={(e) => ls.setFilter('payment_scheme', e.target.value)} />
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable
          loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={setView}
          page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('contracts.empty')} emptyText={t('contracts.emptyText')}
          columns={[
            { key: 'n', header: t('contracts.colNumber'), render: (r) => <strong>{r.number}</strong> },
            ...(hq && !franchisee ? [{ key: 'f', header: t('contracts.franchisee'), render: (r: Contract) => r.franchisee_name }] : []),
            { key: 'p', header: t('contracts.sphereOrPkg'), render: (r) => r.package_name ?? r.product_name ?? '—' },
            { key: 's', header: t('contracts.scheme'), render: (r) => SCHEMES[r.payment_scheme] ?? r.payment_scheme },
            { key: 'a', header: t('common.amount'), align: 'right', render: (r) => <Money value={r.fee_total} /> },
            { key: 'k', header: t('contracts.colWithheld'), align: 'right', render: (r) => (r.withhold_percent != null ? <Badge small>{toNum(r.withhold_percent)}%</Badge> : '—') },
            { key: 'st', header: t('common.status'), render: (r) => <StatusChip kind="contract" status={r.status} small /> },
            { key: 'sg', header: t('contracts.signed'), render: (r) => formatDate(r.signed_at) },
          ]}
        />
      </Card>
      {view && <ContractModal contract={view} onClose={() => setView(null)} onEdit={() => { setForm(view); setView(null) }} />}
      {form && <ContractForm contract={form === 'new' ? undefined : form} franchisee={franchisee} onClose={() => setForm(null)} />}
    </div>
  )
}

export default function ContractsPage() {
  return <ContractsList />
}
