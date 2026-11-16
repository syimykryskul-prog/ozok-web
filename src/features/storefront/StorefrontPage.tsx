import { BadgeCheck, HandHeart } from 'lucide-react'
import { useList } from '../../api/hooks'
import type { Franchisee, Package, Product } from '../../api/types'
import { Badge, Button, Card, ErrorAlert, PageHeader } from '../../components/ui'
import { formatMoney, toNum } from '../../lib/format'
import { iconFor } from '../../lib/icons'
import { useAct, useCan } from '../common/useAct'
import { useT } from '../../i18n'

function Price({ label, value }: { label: string; value?: string }) {
  if (!toNum(value)) return null
  return <div className="list__item"><span className="muted">{label}</span><strong>{formatMoney(value)}</strong></div>
}

export default function StorefrontPage() {
  const t = useT()
  const { act, busy } = useAct()
  const canRequest = useCan('connectRequest')
  const prods = useList<Product>('products/', { page_size: 100, is_active: true, ordering: 'sort_order' })
  const pkgs = useList<Package>('packages/', { page_size: 100, is_active: true })
  const mine = useList<Franchisee>('franchisees/', { page_size: 1 })
  const owned = new Set(mine.rows?.[0]?.products ?? [])
  const products = prods.rows ?? []
  const request = (kind: 'products' | 'packages', id: number) => act(`${kind}/${id}/request/`, undefined, t('storefront.requested'))

  return (
    <div className="page">
      <PageHeader eyebrow={t('storefront.eyebrow')} title={t('storefront.title')}>
        <p className="muted">{t('storefront.intro')}</p>
      </PageHeader>
      <ErrorAlert error={prods.error} />
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        {products.map((p) => {
          const I = iconFor(p.icon)
          const has = owned.has(p.code)
          return (
            <Card white key={p.id}>
              <div className="row row--between">
                <span className="row" style={{ gap: 12 }}>
                  <span className="kpi__icon" style={{ background: p.color || 'var(--turquoise)', color: 'var(--on-navy)' }}><I size={22} aria-hidden /></span>
                  <span><h3>{p.sphere}</h3><span className="muted" style={{ fontSize: 13 }}>{p.name}</span></span>
                </span>
                {has && <Badge tone="success" icon={BadgeCheck}>{t('storefront.connected')}</Badge>}
              </div>
              {p.description && <p className="muted" style={{ margin: '12px 0' }}>{p.description}</p>}
              <ul className="list" style={{ margin: '12px 0' }}>
                <Price label={t('storefront.cash')} value={p.price_cash} />
                <Price label={t('storefront.perSale')} value={p.price_per_sale} />
                <li className="list__item"><span className="muted">{t('storefront.yourReward')}</span><strong>{toNum(p.default_commission_percent)}%</strong></li>
              </ul>
              {!has && canRequest && <Button icon={HandHeart} loading={busy} onClick={() => request('products', p.id)}>{t('storefront.connect')}</Button>}
            </Card>
          )
        })}
      </div>
      {(pkgs.rows ?? []).length > 0 && <h2>{t('storefront.packages')}</h2>}
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        {(pkgs.rows ?? []).map((k) => {
          const codes = k.products.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]
          const has = codes.length > 0 && codes.every((p) => owned.has(p.code))
          return (
            <Card white key={k.id}>
              <div className="row row--between"><h3>{k.name}</h3>{has && <Badge tone="success" icon={BadgeCheck}>{t('storefront.connected')}</Badge>}</div>
              <p className="muted" style={{ margin: '8px 0' }}>{codes.map((p) => p.sphere).join(' · ')}</p>
              <ul className="list" style={{ margin: '12px 0' }}>
                <Price label={t('storefront.cash')} value={k.price_cash} />
                <Price label={t('storefront.prepay', { n: toNum(k.prepay_percent) })} value={k.price_prepay} />
                <Price label={t('storefront.perSale')} value={k.price_per_sale} />
              </ul>
              {!has && canRequest && <Button icon={HandHeart} loading={busy} onClick={() => request('packages', k.id)}>{t('storefront.connect')}</Button>}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
