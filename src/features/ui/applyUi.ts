import { LANG_KEY, setRuntimeLang } from '../../i18n'
import type { Lang } from '../../i18n'
import { THEME_KEY } from './uiSlice'
import type { ThemeMode } from './uiSlice'

const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

export const resolveTheme = (m: ThemeMode): 'light' | 'dark' => (m === 'system' ? (mq?.matches ? 'dark' : 'light') : m)

/** data-theme на <html> всегда light|dark; выбранный режим — в data-theme-mode. */
export function applyTheme(m: ThemeMode, persist = false): void {
  const r = document.documentElement
  r.dataset.theme = resolveTheme(m)
  r.dataset.themeMode = m
  if (persist) try { localStorage.setItem(THEME_KEY, m) } catch { /* ignore */ }
}

export function applyLang(l: Lang, persist = false): void {
  setRuntimeLang(l)
  if (persist) try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ }
}

/** Следит за prefers-color-scheme, пока выбран режим «как в системе». */
/** Есть ли локальный выбор (иначе берём настройки из профиля). */
export const hasLocal = (key: string): boolean => { try { return localStorage.getItem(key) !== null } catch { return false } }

export function watchSystemTheme(getMode: () => ThemeMode): void {
  mq?.addEventListener('change', () => { if (getMode() === 'system') applyTheme('system') })
}
