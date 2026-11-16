import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { useT } from '../../i18n'
import { cls } from '../../lib/format'

interface FieldProps {
  label?: string
  error?: string
  hint?: string
  wrapperClassName?: string
}

function Wrap({ id, label, error, hint, className, children }: FieldProps & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={cls('field', className)}>
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error" id={`${id}-err`} role="alert">{error}</span>}
    </div>
  )
}

export function Input({ label, error, hint, wrapperClassName, className, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Wrap id={id} label={label} error={error} hint={hint} className={wrapperClassName}>
      <input id={id} className={cls('input', className)} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
    </Wrap>
  )
}

export interface Option { value: string | number; label: string }

export function Select({
  label, error, hint, wrapperClassName, className, options, placeholder, ...rest
}: FieldProps & { options: Option[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Wrap id={id} label={label} error={error} hint={hint} className={wrapperClassName}>
      <select id={id} className={cls('select', className)} aria-invalid={!!error} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Wrap>
  )
}

export function Textarea({ label, error, hint, wrapperClassName, className, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Wrap id={id} label={label} error={error} hint={hint} className={wrapperClassName}>
      <textarea id={id} className={cls('textarea', className)} aria-invalid={!!error} {...rest} />
    </Wrap>
  )
}

export function Checkbox({ label, ...rest }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...rest} />
      {label}
    </label>
  )
}

export function SearchInput({
  value, onChange, placeholder, label,
}: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) {
  const t = useT()
  return (
    <div className="field grow">
      <span className="field__label">{label ?? t('common.search')}</span>
      <div className="input-icon">
        <Search size={18} aria-hidden />
        <input
          className="input" type="search" value={value} placeholder={placeholder ?? t('common.search')} aria-label={label ?? t('common.search')}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
