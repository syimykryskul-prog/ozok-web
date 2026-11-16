import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { Plus, Trash2 } from 'lucide-react'
import { useList } from '../../api/hooks'
import { useSend } from '../../api/hooks'
import type { Deal, DealLine, DealPreview, Equipment, Tariff } from '../../api/types'
import { Badge, Button, Checkbox, ErrorAlert, FormModal, Input, Select, Textarea, useToast } from '../../components/ui'
import { useUser } from '../../app/hooks'
import { errorMessage, splitErrors } from '../../lib/errors'
import { formatMoney, toISODate, toNum } from '../../lib/format'
import { useIsHq } from '../common/useAct'
import { ClientSelect, FranchiseeSelect, ProductSelect, toId, useProducts } from '../common/pickers'

interface Disc { mode: 'percent' | 'amount'; value: string; reason: string }
const noDisc = (): Disc => ({ mode: 'percent', value: '', reason: '' })
interface EqLine { key: number; equipment: string; quantity: string; price: string; serials: string; disc: Disc }

function DiscountFields({ d, onChange, error }: { d: Disc; onChange: (d: Disc) => void; error?: string }) {
  const t = useT()
  const has = toNum(d.value) > 0
  return (
    <div className="form-grid">
      <Select label={t('deals.discount')} options={[{ value: 'percent', label: '%' }, { value: 'amount', label: t('deals.somUnit') }]} value={d.mode} onChange={(e) => onChange({ ...d, mode: e.target.value as Disc['mode'] })} />
      <Input label={t('deals.discountSize')} inputMode="decimal" value={d.value} onChange={(e) => onChange({ ...d, value: e.target.value })} placeholder="0" />
      {has && <div className="span-2"><Input label={t('deals.discountReason')} value={d.reason} error={error} onChange={(e) => onChange({ ...d, reason: e.target.value })} /></div>}
    </div>
  )
}

const discBody = (d: Disc) => (toNum(d.value) > 0
  ? { [d.mode === 'percent' ? 'discount_percent' : 'discount_amount']: d.value.replace(',', '.'), discount_reason: d.reason.trim() }
  : {})

function lineTotals(list: number, d: Disc) {
  const disc = toNum(d.value) > 0 ? (d.mode === 'percent' ? list * toNum(d.value) / 100 : Math.min(list, toNum(d.value))) : 0
  return { list, disc, total: list - disc }
}

let seq = 1

/** Единая форма «Новая продажа»: партнёр и OZOK. */
export function DealForm({ onClose, client, partner }: { onClose: () => void; client?: number; partner?: number }) {
  const t = useT()
  const user = useUser()
  const hq = useIsHq()
  const toast = useToast()
  const [send] = useSend<unknown>()
  const products = useProducts()

  const [partnerId, setPartnerId] = useState(partner ? String(partner) : '')
  const [nbsSale, setNbsSale] = useState(false)
  const [clientId, setClientId] = useState(client ? String(client) : '')
  const [newClient, setNewClient] = useState(false)
  const [nc, setNc] = useState({ business_name: '', contact_name: '', phone: '', city: '' })
  const [product, setProduct] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [comment, setComment] = useState('')
  const [setupOn, setSetupOn] = useState(false)
  const [setupDisc, setSetupDisc] = useState<Disc>(noDisc())
  const [eqOn, setEqOn] = useState(false)
  const [eqLines, setEqLines] = useState<EqLine[]>([{ key: seq++, equipment: '', quantity: '1', price: '', serials: '', disc: noDisc() }])
  const [subOn, setSubOn] = useState(false)
  const [tariff, setTariff] = useState('')
  const [months, setMonths] = useState('1')
  const [subDisc, setSubDisc] = useState<Disc>(noDisc())
  const [dealDisc, setDealDisc] = useState<Disc>(noDisc())
  const [contractNumber, setContractNumber] = useState('')
  const [signedAt, setSignedAt] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<DealPreview | null>(null)
  const [prevErr, setPrevErr] = useState<unknown>(null)

  const frId = hq ? (nbsSale ? undefined : toId(partnerId) ?? undefined) : user?.franchisee?.id ?? user?.partner?.id
  const prod = products.find((p) => String(p.id) === product)
  const { rows: eqs } = useList<Equipment>('equipment/', { page_size: 100, product: product || undefined, is_active: true }, { skip: !eqOn })
  const { rows: tariffs } = useList<Tariff>('tariffs/', { page_size: 100, product: product || undefined, is_active: true }, { skip: !subOn || !product })
  const tr = (tariffs ?? []).find((x) => String(x.id) === tariff)

  const lines = useMemo(() => {
    const out: DealLine[] = []
    if (setupOn) {
      out.push({ kind: 'setup', ...discBody(setupDisc) })
      if (toNum(prod?.training_price) > 0) out.push({ kind: 'training', ...discBody(setupDisc) })
    }
    if (eqOn) eqLines.filter((l) => l.equipment).forEach((l) => out.push({
      kind: 'equipment', equipment: Number(l.equipment), quantity: l.quantity.replace(',', '.'),
      serial_numbers: l.serials.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean), ...discBody(l.disc),
    }))
    if (subOn && tariff) out.push({ kind: 'subscription', tariff: Number(tariff), months: Number(months) || 1, ...discBody(subDisc) })
    return out
  }, [setupOn, setupDisc, eqOn, eqLines, subOn, tariff, months, subDisc, prod])

  const payload = useMemo(() => ({
    client: newClient || nbsSale ? null : toId(clientId), partner: frId ?? null, product: toId(product), date, comment, lines, contract_number: contractNumber.trim(), signed_at: signedAt || null,
    ...(newClient && !nbsSale ? { new_client: { business_name: nc.business_name.trim(), contact_name: nc.contact_name, phone: nc.phone, city: nc.city } } : {}),
    ...(nbsSale ? { client_name: nc.business_name.trim() } : {}),
    ...(toNum(dealDisc.value) > 0 ? { [dealDisc.mode === 'percent' ? 'deal_discount_percent' : 'deal_discount_amount']: dealDisc.value.replace(',', '.'), discount_reason: dealDisc.reason.trim() } : {}),
  }), [clientId, newClient, nbsSale, nc, frId, product, date, comment, lines, dealDisc, contractNumber, signedAt])

  // Живой расчёт: deals/preview/
  const key = JSON.stringify({ ...payload, client: payload.client ?? 0 })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    if (!product || !lines.length) { setPreview(null); setPrevErr(null); return }
    timer.current = setTimeout(async () => {
      try { setPreview((await send('deals/preview/', payload)) as DealPreview); setPrevErr(null) } catch (e) { setPrevErr(e) }
    }, 450)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Локальная оценка (если превью ещё нет)
  const local = useMemo(() => {
    let list = 0, disc = 0
    const add = (l: number, d: Disc) => { const t = lineTotals(l, d); list += t.list; disc += t.disc }
    if (setupOn && prod) add(toNum(prod.setup_price) + toNum(prod.training_price), setupDisc)
    if (eqOn) eqLines.forEach((l) => { const e = (eqs ?? []).find((x) => String(x.id) === l.equipment); if (e) add((toNum(l.price) || toNum(e.price)) * (toNum(l.quantity) || 1), l.disc) })
    if (subOn && tr) add(toNum(tr.current_price ?? tr.monthly_price) * (Number(months) || 1), subDisc)
    const rest = list - disc
    const dd = toNum(dealDisc.value) > 0 ? (dealDisc.mode === 'percent' ? rest * toNum(dealDisc.value) / 100 : Math.min(rest, toNum(dealDisc.value))) : 0
    return { list, disc: disc + dd, total: rest - dd }
  }, [setupOn, setupDisc, eqOn, eqLines, subOn, tr, months, subDisc, dealDisc, prod, eqs])

  const pt = preview?.totals
  const sum = {
    list: pt?.list_total ?? local.list, disc: pt?.discount_total ?? local.disc, total: pt?.total ?? local.total,
    income: pt?.partner_income, nbs: pt?.nbs_income, withheld: pt?.withheld, net: pt?.partner_net,
  }
  const isNbs = hq && nbsSale

  const submit = async () => {
    const e: Record<string, string> = {}
    if (hq && !nbsSale && !partnerId) e.partner = t('deals.err.partner')
    if (nbsSale) { if (!nc.business_name.trim()) e.business_name = t('deals.err.clientName') }
    else if (newClient) { if (!nc.business_name.trim()) e.business_name = t('deals.err.name'); if (!nc.phone.trim()) e.phone = t('deals.err.phone') }
    else if (!clientId) e.client = t('deals.err.client')
    if (!product) e.product = t('deals.err.product')
    if (!lines.length) e.lines = t('deals.err.lines')
    if (eqOn && eqLines.some((l) => !l.equipment)) e.lines = t('deals.err.eqModel')
    if (subOn && !tariff) e.lines = t('deals.err.tariff')
    const needReason = [setupOn && setupDisc, subOn && subDisc, dealDisc, ...(eqOn ? eqLines.map((l) => l.disc) : [])].some((d) => d && toNum(d.value) > 0 && !d.reason.trim())
    if (needReason) e.reason = t('deals.err.reason')
    setErrors(e); setGeneral('')
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const deal = (await send('deals/', payload)) as Deal
      let status = deal.status
      if (status === 'draft') {
        const r = (await send(`deals/${deal.id}/confirm/`)) as Deal | undefined
        status = r?.status ?? 'confirmed'
      }
      if (status === 'pending_approval') toast.show(t('deals.toastApproval'), 'warning')
      else toast.success(t('deals.toastConfirmed'))
      onClose()
    } catch (err) {
      const s = splitErrors(err)
      setErrors(s.fields); setGeneral(s.general || errorMessage(err))
    } finally { setBusy(false) }
  }

  const eqSet = (k: number, patch: Partial<EqLine>) => setEqLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)))

  return (
    <FormModal wide title={t('deals.title')} onClose={onClose} onSubmit={submit} saving={busy} error={general} submitLabel={t('deals.submit')}>
      <div className="form-grid">
        {hq && (
          <>
            <div className="span-2"><Checkbox label={t('deals.nbsSale')} checked={nbsSale} onChange={(e) => setNbsSale(e.target.checked)} /></div>
            {!nbsSale && <div className="span-2"><FranchiseeSelect label={t('deals.partner')} value={partnerId} onChange={setPartnerId} error={errors.partner} /></div>}
          </>
        )}
        {!nbsSale && <div className="span-2">
          <Checkbox label={t('deals.newClient')} checked={newClient} onChange={(e) => setNewClient(e.target.checked)} disabled={!!client} />
        </div>}
        {nbsSale ? (
          <div className="span-2"><Input label={t('deals.clientName')} value={nc.business_name} error={errors.business_name} onChange={(e) => setNc({ ...nc, business_name: e.target.value })} /></div>
        ) : newClient ? (
          <>
            <Input label={t('deals.businessName')} value={nc.business_name} error={errors.business_name} onChange={(e) => setNc({ ...nc, business_name: e.target.value })} />
            <Input label={t('deals.contactPerson')} value={nc.contact_name} onChange={(e) => setNc({ ...nc, contact_name: e.target.value })} />
            <Input label={t('common.phone')} value={nc.phone} error={errors.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} />
            <Input label={t('common.city')} value={nc.city} onChange={(e) => setNc({ ...nc, city: e.target.value })} />
          </>
        ) : (
          <div className="span-2"><ClientSelect value={clientId} onChange={setClientId} error={errors.client} disabled={!!client} franchisee={frId} /></div>
        )}
        <ProductSelect label={t('deals.sphere')} value={product} onChange={(v) => { setProduct(v); setTariff(''); setEqLines((ls) => ls.map((l) => ({ ...l, equipment: '' }))) }} error={errors.product} />
        <Input label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <ErrorAlert error={errors.lines ? { data: { detail: errors.lines } } : undefined} />

      <fieldset className="stack" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <Checkbox label={t('deals.setup')} checked={setupOn} onChange={(e) => setSetupOn(e.target.checked)} />
        {setupOn && <>
          <p className="muted" style={{ margin: 0 }}>{t('deals.byPrice', { amount: prod ? formatMoney(toNum(prod.setup_price) + toNum(prod.training_price)) : t('deals.pickSphere') })}</p>
          <DiscountFields d={setupDisc} onChange={setSetupDisc} />
        </>}
      </fieldset>

      <fieldset className="stack" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <Checkbox label={t('deals.equipment')} checked={eqOn} onChange={(e) => setEqOn(e.target.checked)} />
        {eqOn && <>
          {eqLines.map((l, i) => {
            const e = (eqs ?? []).find((x) => String(x.id) === l.equipment)
            return (
              <div key={l.key} className="stack" style={{ borderTop: i ? '1px dashed var(--border)' : undefined, paddingTop: i ? 12 : 0 }}>
                <div className="form-grid">
                  <Select label={t('deals.model')} placeholder={t('deals.pick')} value={l.equipment} options={(eqs ?? []).map((x) => ({ value: x.id, label: `${x.name} · ${formatMoney(x.price)}` }))}
                    onChange={(ev) => { const m = (eqs ?? []).find((x) => String(x.id) === ev.target.value); eqSet(l.key, { equipment: ev.target.value, price: m ? String(toNum(m.price)) : '' }) }} />
                  <Input label={t('deals.qty')} type="number" min={1} value={l.quantity} onChange={(ev) => eqSet(l.key, { quantity: ev.target.value })} />
                  <Input label={t('deals.unitPrice')} inputMode="decimal" value={l.price} onChange={(ev) => eqSet(l.key, { price: ev.target.value })} hint={e ? t('deals.byPriceHint', { amount: formatMoney(e.price) }) : undefined} />
                  <Textarea label={t('deals.serials')} rows={2} value={l.serials} onChange={(ev) => eqSet(l.key, { serials: ev.target.value })} hint={t('deals.serialsHint')} />
                </div>
                <DiscountFields d={l.disc} onChange={(d) => eqSet(l.key, { disc: d })} />
                {eqLines.length > 1 && <div><Button size="sm" variant="ghost" icon={Trash2} onClick={() => setEqLines((ls) => ls.filter((x) => x.key !== l.key))}>{t('deals.removeLine')}</Button></div>}
              </div>
            )
          })}
          <div><Button size="sm" variant="secondary" icon={Plus} onClick={() => setEqLines((ls) => [...ls, { key: seq++, equipment: '', quantity: '1', price: '', serials: '', disc: noDisc() }])}>{t('deals.addLine')}</Button></div>
        </>}
      </fieldset>

      <fieldset className="stack" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <Checkbox label={t('deals.subscription')} checked={subOn} onChange={(e) => setSubOn(e.target.checked)} />
        {subOn && <>
          <div className="form-grid">
            <Select label={t('deals.tariff')} placeholder={product ? t('deals.pick') : t('deals.firstSphere')} value={tariff} options={(tariffs ?? []).map((x) => ({ value: x.id, label: `${x.name} · ${formatMoney(x.current_price ?? x.monthly_price)}${t('deals.perMonth')}` }))} onChange={(e) => setTariff(e.target.value)} />
            <Input label={t('deals.months')} type="number" min={1} value={months} onChange={(e) => setMonths(e.target.value)} />
          </div>
          <DiscountFields d={subDisc} onChange={setSubDisc} />
        </>}
      </fieldset>

      <div className="stack">
        <strong style={{ fontSize: 14 }}>{t('deals.dealDiscount')}</strong>
        <DiscountFields d={dealDisc} onChange={setDealDisc} error={errors.reason} />
        <div className="form-grid">
          <Input label={t('deals.contractNumber')} value={contractNumber} error={errors.contract_number} onChange={(e) => setContractNumber(e.target.value)} />
          <Input label={t('deals.signedAt')} type="date" value={signedAt} error={errors.signed_at} onChange={(e) => setSignedAt(e.target.value)} />
        </div>
        <Textarea label={t('common.comment')} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      <div className="hint-box" aria-live="polite">
        {subOn && <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>{t('deals.subNote')}</p>}
        <div className="row row--between"><strong>{t('deals.totalTitle')}</strong>{preview?.needs_approval && <Badge tone="warning">{t('deals.onApproval')}</Badge>}</div>
        <div className="grid grid--2" style={{ marginTop: 8 }}>
          <span>{t('deals.listTotal')}: <strong>{formatMoney(sum.list)}</strong></span>
          <span>{t('deals.discountTotal')}: <strong>{formatMoney(sum.disc)}</strong></span>
          <span>{t('deals.toPay')}: <strong>{formatMoney(sum.total)}</strong></span>
          {!isNbs && <span>{t('deals.yourIncome')}: <strong>{sum.income != null ? formatMoney(sum.income) : '—'}</strong></span>}
          <span>{isNbs ? t('deals.nbsIncome') : t('deals.nbsShare')}: <strong>{sum.nbs != null ? formatMoney(sum.nbs) : '—'}</strong></span>
          {!isNbs && <span>{t('deals.withheld')}: <strong>{sum.withheld != null ? formatMoney(sum.withheld) : '—'}</strong></span>}
          {!isNbs && <span>{t('deals.netIncome')}: <strong>{sum.net != null ? formatMoney(sum.net) : '—'}</strong></span>}
        </div>
        {preview?.violations?.map((w) => <p key={w} className="muted" style={{ margin: '4px 0 0' }}>{t('deals.violation', { w })}</p>)}
        {preview?.lines?.filter((l) => l.note).map((l) => <p key={l.kind} className="muted" style={{ margin: '4px 0 0' }}>{l.note}</p>)}
        {prevErr != null && <p className="muted" style={{ margin: '8px 0 0' }}>{t('deals.previewUnavailable', { error: errorMessage(prevErr) })}</p>}
      </div>
    </FormModal>
  )
}
