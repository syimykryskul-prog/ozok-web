import { t } from '../i18n'

function collect(data: unknown, out: string[]): void {
  if (data == null) return
  if (typeof data === 'string') out.push(data)
  else if (Array.isArray(data)) data.forEach((d) => collect(d, out))
  else if (typeof data === 'object') Object.values(data as Record<string, unknown>).forEach((d) => collect(d, out))
}

function getData(err: unknown): { status?: number | string; data?: unknown } {
  if (err && typeof err === 'object') return err as { status?: number | string; data?: unknown }
  return {}
}

export function errorMessage(err: unknown): string {
  const { status, data } = getData(err)
  if (status === 'FETCH_ERROR') return t('err.network')
  if (typeof status === 'number' && status >= 500) return t('err.server')
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  const out: string[] = []
  collect(data, out)
  const text = out.filter((s) => !s.startsWith('<')).join('\n')
  if (text) return text
  if (status === 403) return t('err.forbidden')
  if (status === 404) return t('err.notFound')
  return t('err.generic')
}

/** Разделяет ошибки на полевые и общие (detail / non_field_errors). */
export function splitErrors(err: unknown): { fields: Record<string, string>; general: string } {
  const fields = fieldErrors(err)
  const general = [fields.detail, fields.non_field_errors].filter(Boolean).join(' ')
  delete fields.detail
  delete fields.non_field_errors
  return { fields, general: general || (Object.keys(fields).length ? '' : errorMessage(err)) }
}

export function fieldErrors(err: unknown): Record<string, string> {
  const { data } = getData(err)
  const res: Record<string, string> = {}
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      const out: string[] = []
      collect(v, out)
      if (out.length) res[k] = out.join(' ')
    }
  }
  return res
}
