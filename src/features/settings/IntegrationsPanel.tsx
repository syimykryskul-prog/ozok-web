import { useState } from 'react'
import { Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Product } from '../../api/types'
import { Badge, Button, Card, CardTitle, Checkbox, ConfirmDialog, ErrorAlert } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { t } from '../../i18n'
import { iconFor } from '../../lib/icons'
import { useAct } from '../common/useAct'

const docs = () => `${t('settings.int.docs.header')}: X-OZOK-Key: <${t('settings.int.docs.key')}>
POST /api/v1/integrations/events/   (${t('settings.int.docs.post')})
GET  /api/v1/integrations/ping/     → {"product": "<code>", "ok": true}

client.upsert — ${t('settings.int.docs.upsert')}
{ "type": "client.upsert", "event_id": "c-1001", "external_client_id": "42",
  "partner_code": "OSH-01", "business_name": "Shop Altyn",
  "business_type": "shop", "contact_name": "...", "phone": "0555000000",
  "city": "Osh", "status": "active", "connected_at": "2026-11-01" }

payment.succeeded — ${t('settings.int.docs.succeeded')}
{ "type": "payment.succeeded", "event_id": "p-5001", "external_payment_id": "5001",
  "external_client_id": "42", "amount": "1500.00", "months": 1,
  "paid_until": "2026-12-01", "paid_at": "2026-11-01T10:00:00+06:00" }

payment.refunded — ${t('settings.int.docs.refunded')}
{ "type": "payment.refunded", "event_id": "r-77", "external_payment_id": "5001", "amount": "1500.00" }

${t('settings.int.docs.response')}: {"results": [{"event_id": "...", "status": "processed|duplicate|unmatched|error", "error": null}]}
${t('settings.int.docs.dup')}
${t('settings.int.docs.unmatched')}`

function ProductRow({ p }: { p: Product }) {
  const { act, busy } = useAct()
  const [show, setShow] = useState(false)
  const [key, setKey] = useState<string | undefined>(undefined)
  const [confirm, setConfirm] = useState(false)
  const I = iconFor(p.icon)
  const apiKey = key ?? p.api_key
  const rotate = async () => {
    const r = await act<Product>(`products/${p.id}/rotate-key/`, undefined, t('settings.int.rotated'))
    if (r) { setKey(r.api_key); setShow(true); setConfirm(false) }
  }
  return (
    <Card white>
      <div className="row row--between">
        <span className="row" style={{ gap: 10 }}>
          <span className="kpi__icon" style={{ width: 40, height: 40, background: p.color || 'var(--turquoise)', color: 'var(--on-navy)' }}><I size={18} aria-hidden /></span>
          <span><strong>{p.name}</strong><div className="muted" style={{ fontSize: 12 }}>{p.sphere} · {p.code}</div></span>
        </span>
        <span className="row">
          {p.integration_enabled ? <Badge tone="success" small>{t('settings.int.on')}</Badge> : <Badge small>{t('settings.int.off')}</Badge>}
          <Checkbox label={t('settings.int.enabled')} checked={!!p.integration_enabled} disabled={busy}
            onChange={(e) => act(`products/${p.id}/`, { integration_enabled: e.target.checked }, e.target.checked ? t('settings.int.enabled_toast') : t('settings.int.disabled_toast'), 'PATCH')} />
        </span>
      </div>
      <div className="stack" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 8 }}>
          <KeyRound size={18} aria-hidden />
          <code style={{ background: 'var(--mist)', padding: '8px 12px', borderRadius: 8, wordBreak: 'break-all' }}>
            {apiKey ? (show ? apiKey : '•'.repeat(24)) : t('settings.int.no_key')}
          </code>
          {apiKey && <Button size="sm" variant="secondary" icon={show ? EyeOff : Eye} onClick={() => setShow((v) => !v)}>{show ? t('settings.int.hide') : t('settings.int.show')}</Button>}
          <Button size="sm" variant="danger" icon={RefreshCw} onClick={() => setConfirm(true)}>{t('settings.int.rotate')}</Button>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{t('settings.int.last_event')}: {p.last_event_at ? formatDateTime(p.last_event_at) : t('settings.int.never')}</span>
      </div>
      <ConfirmDialog open={confirm} danger title={t('settings.int.rotate_q')} text={t('settings.int.rotate_text')} confirmLabel={t('settings.int.rotate')} loading={busy} onConfirm={rotate} onClose={() => setConfirm(false)} />
    </Card>
  )
}

export function IntegrationsPanel() {
  const { rows, isLoading, error } = useList<Product>('products/', { page_size: 100, ordering: 'sort_order' })
  return (
    <div className="stack">
      <ErrorAlert error={error} />
      {isLoading && <span className="skeleton" style={{ height: 100 }} />}
      {(rows ?? []).map((p) => <ProductRow key={p.id} p={p} />)}
      <Card white>
        <CardTitle>{t('settings.int.format')}</CardTitle>
        <p className="muted" style={{ marginBottom: 12 }}>{t('settings.int.intro')}</p>
        <pre style={{ background: 'var(--hero-bg)', color: 'var(--on-navy)', padding: 16, borderRadius: 12, overflowX: 'auto', fontSize: 13, margin: 0 }}>{docs()}</pre>
      </Card>
    </div>
  )
}
