import { useCallback } from 'react'
import { useAppSelector } from '../app/hooks'
import ruMain from './ru.json'
import kyMain from './ky.json'

export type Lang = 'ru' | 'ky'
export const LANGS: Lang[] = ['ru', 'ky']
export const LANG_KEY = 'ozok.lang'

type Dict = Record<string, string>

const DICTS: Record<Lang, Dict> = { ru: ruMain as Dict, ky: kyMain as Dict }

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === 'ru' || v === 'ky') return v
  } catch { /* ignore */ }
  return 'ru'
}

let current: Lang = loadLang()
export const getLang = (): Lang => current
export function setRuntimeLang(l: Lang): void {
  current = l
  if (typeof document !== 'undefined') document.documentElement.lang = l
}

/** t('ключ', { n: 3 }) — подстановка {n}. Нет ключа в ky → берём ru → сам ключ. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? DICTS.ru[key]
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn('[i18n] missing key', key)
    s = key
  }
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s
}

/** true, если ключ есть в словаре (для необязательных подписей). */
export const hasKey = (key: string): boolean => key in DICTS[current] || key in DICTS.ru

/** Хук: подписывает компонент на смену языка (интерфейс также перемонтируется целиком). */
export function useT() {
  const lang = useAppSelector((s) => s.ui.lang)
  const fn = useCallback((key: string, params?: Record<string, string | number>) => t(key, params), [lang]) // eslint-disable-line react-hooks/exhaustive-deps
  return fn
}
export const useLang = (): Lang => useAppSelector((s) => s.ui.lang)
