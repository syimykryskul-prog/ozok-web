import { useRef, useState } from 'react'
import { useList, useOne } from '../../api/hooks'
import { useDebounced } from '../../app/hooks'
import type { AppUser, Client, Franchisee, Package, Product } from '../../api/types'
import { Select } from '../../components/ui'
import { canRead } from '../../lib/permissions'
import type { Option } from '../../components/ui'
import { useT } from '../../i18n'

type PickerProps = {
  value: string | number | null | undefined
  onChange: (v: string) => void
  label?: string
  error?: string
  placeholder?: string
  disabled?: boolean
}

export function useProducts() {
  const { rows } = useList<Product>('products/', { page_size: 100 })
  return rows ?? []
}

function SearchSelect<T extends { id: number }>({
  path, params, toLabel, value, onChange, label, error, placeholder, disabled, skip,
}: PickerProps & { path: string; params?: Record<string, string | number | boolean | undefined>; toLabel: (t: T) => string; skip?: boolean }) {
  const t = useT()
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const { rows } = useList<T>(path, { page_size: 50, search: dq, ...params }, { skip })
  const known = useRef(new Map<string, string>())
  const need = value !== '' && value != null && !known.current.has(String(value)) && !(rows ?? []).some((r) => String(r.id) === String(value))
  const one = useOne<T>(`${path}${value}/`, undefined, { skip: !need || skip })
  ;(rows ?? []).forEach((r) => known.current.set(String(r.id), toLabel(r)))
  if (one.data) known.current.set(String(value), toLabel(one.data))
  const options: Option[] = (rows ?? []).map((r) => ({ value: r.id, label: toLabel(r) }))
  if (value !== '' && value != null && !options.some((o) => String(o.value) === String(value))) {
    options.unshift({ value: value as string | number, label: known.current.get(String(value)) ?? t('shared.numberSign', { id: value }) })
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Select label={label} error={error} options={options} placeholder={placeholder} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {!disabled && <input className="input input--sm" type="search" placeholder={t('shared.searchByName')} aria-label={t('shared.searchAria', { label: label ?? '' })} value={q} onChange={(e) => setQ(e.target.value)} />}
    </div>
  )
}

export function FranchiseeSelect({ value, onChange, label, error, placeholder, disabled, onlyActive }: PickerProps & { onlyActive?: boolean }) {
  const t = useT()
  label ??= t('shared.franchisee'); placeholder ??= t('shared.pickFranchisee')
  return <SearchSelect<Franchisee> path="franchisees/" params={{ status: onlyActive ? 'franchisee' : undefined }} toLabel={(f) => `${f.name} · ${f.city}`} {...{ value, onChange, label, error, placeholder, disabled }} />
}

export function ClientSelect({ value, onChange, label, error, placeholder, franchisee, disabled }: PickerProps & { franchisee?: number | string }) {
  const t = useT()
  label ??= t('shared.client'); placeholder ??= t('shared.pickClient')
  return <SearchSelect<Client> path="clients/" params={{ franchisee }} toLabel={(c) => `${c.business_name}${c.city ? ` · ${c.city}` : ''}`} {...{ value, onChange, label, error, placeholder, disabled }} />
}
export function BranchSelect({ value, onChange, label, error, placeholder, disabled }: PickerProps) {
  const t = useT()
  label ??= t('shared.branch'); placeholder ??= t('shared.pickBranch')
  return <SearchSelect<{ id: number; name: string; client_name?: string }> path="branches/" toLabel={(b) => `${b.client_name ?? ''} / ${b.name}`} {...{ value, onChange, label, error, placeholder, disabled }} />
}
export function ProductSelect({ value, onChange, label, error, placeholder, disabled }: PickerProps) {
  const t = useT()
  label ??= t('shared.product'); placeholder ??= t('shared.pickProduct')
  const products = useProducts()
  const options: Option[] = products.map((p) => ({ value: p.id, label: p.name }))
  return <Select label={label} error={error} options={options} placeholder={placeholder} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}

export function UserSelect({ value, onChange, label, error, placeholder, franchisee, disabled }: PickerProps & { franchisee?: number | string }) {
  const t = useT()
  label ??= t('shared.responsible'); placeholder ??= t('shared.notAssigned')
  return <SearchSelect<AppUser> path="users/" params={{ franchisee, is_active: true }} skip={!franchisee && franchisee !== undefined} toLabel={(u) => u.full_name || u.email} {...{ value, onChange, label, error, placeholder, disabled }} />
}
/** Значение select -> число или null для API. */
export const toId = (v: string | number | null | undefined): number | null => (v === '' || v == null ? null : Number(v))

/** Подпись продукта по значению Lead.product: код сферы, `package:<id>`, `help` или пусто. */
export function useProductLabel() {
  const t = useT()
  const products = useProducts()
  const { rows: pkgs } = useList<Package>('packages/', { page_size: 100 })
  return (v?: string | null): string => {
    if (!v) return '—'
    if (v === 'help') return t('shared.helpChoosing')
    if (v.startsWith('package:')) return (pkgs ?? []).find((p) => `package:${p.id}` === v)?.name ?? t('shared.package')
    const p = products.find((x) => x.code === v)
    return p ? p.sphere || p.name : v
  }
}

export function useProductOptionsByCode(): Option[] {
  return useProducts().filter((p) => p.is_active !== false).map((p) => ({ value: p.code, label: p.sphere ? `${p.sphere} · ${p.name}` : p.name }))
}

/** Сотрудник OZOK (пользователь без партнёра). */
export function NbsUserSelect({ value, onChange, label, error, placeholder, disabled }: PickerProps) {
  const t = useT()
  label ??= t('shared.nbsUser'); placeholder ??= t('shared.pick')
  const { rows } = useList<AppUser>('users/', { page_size: 100, is_active: true }, { skip: !canRead('users') })
  const options: Option[] = (rows ?? []).filter((u) => u.franchisee == null).map((u) => ({ value: u.id, label: u.full_name || u.email }))
  return <Select label={label} error={error} options={options} placeholder={placeholder} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}
