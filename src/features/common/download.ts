import { store } from '../../app/store'
import { t } from '../../i18n'

/** Скачивает файл с API с токеном (например, `reports/cash/?export=csv`). Бросает Error с текстом ответа. */
export async function downloadFile(path: string, params: Record<string, string>, fallbackName: string): Promise<void> {
  const token = store.getState().auth.access
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/v1/${path}${qs ? `?${qs}` : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) {
    let msg = t('shared.downloadError', { status: res.status })
    try { msg = ((await res.json()) as { detail?: string }).detail ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  const cd = res.headers.get('Content-Disposition') ?? ''
  const name = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? fallbackName
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
