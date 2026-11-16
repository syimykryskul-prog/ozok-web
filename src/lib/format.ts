import { getLang, t } from '../i18n'

/** Названия месяцев (именительный, строчные) из словаря. */
const months = () => Array.from({ length: 12 }, (_, i) => t('fmt.m' + (i + 1)))

export function toNum(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : parseFloat(v ?? '')
  return Number.isNaN(n) ? 0 : n
}

export function formatNumber(v: string | number | null | undefined, digits = 2): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(toNum(v))
}

export function formatQty(v: string | number | null | undefined): string {
  return formatNumber(v, 3)
}

export function currencyLabel(code?: string | null): string {
  return !code || code === 'KGS' ? t('fmt.som') : code
}

export function formatMoney(v: string | number | null | undefined, currency?: string | null): string {
  return `${formatNumber(v, 2)} ${currencyLabel(currency)}`
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatDate(s?: string | null): string {
  if (!s) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return s
  return getLang() === 'ky' ? `${Number(m[3])}-${months()[Number(m[2]) - 1]} ${m[1]}` : `${m[3]}.${m[2]}.${m[1]}`
}

export function formatDateTime(s?: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  const date = getLang() === 'ky' ? `${d.getDate()}-${months()[d.getMonth()]} ${d.getFullYear()}` : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

export function shortDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return s
  return getLang() === 'ky' ? `${Number(m[3])}-${months()[Number(m[2]) - 1].slice(0, 3)}` : `${m[3]}.${m[2]}`
}

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthLabel(m?: string | null): string {
  const r = /^(\d{4})-(\d{2})/.exec(m ?? '')
  return r ? `${months()[Number(r[2]) - 1]} ${r[1]}` : '—'
}
export function shortMonth(m: string): string {
  const r = /^(\d{4})-(\d{2})/.exec(m)
  return r ? months()[Number(r[2]) - 1].slice(0, 3) : m
}

export function compactMoney(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e6) return `${formatNumber(n / 1e6, 1)} ${t('fmt.mln')}`
  if (a >= 1e3) return `${formatNumber(n / 1e3, 0)} ${t('fmt.thousand')}`
  return formatNumber(n, 0)
}

export function formatPhone(p?: string | null): string {
  const d = (p ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('996')) return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
  if (d.length === 10 && d.startsWith('0')) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return p || '—'
}
