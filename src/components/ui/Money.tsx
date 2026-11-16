import { useCurrency } from '../../app/hooks'
import { formatMoney } from '../../lib/format'

export function Money({ value, signed, className }: { value: string | number | null | undefined; signed?: boolean; className?: string }) {
  const currency = useCurrency()
  const n = typeof value === 'number' ? value : parseFloat(value ?? '0')
  const cl = signed ? (n > 0 ? 'amount-pos' : n < 0 ? 'amount-neg' : '') : ''
  return <span className={`nowrap ${cl} ${className ?? ''}`}>{formatMoney(value, currency)}</span>
}
