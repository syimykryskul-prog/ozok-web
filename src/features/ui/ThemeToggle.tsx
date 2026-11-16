import { Sun, Moon, MonitorCog } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useT } from '../../i18n'
import { setTheme } from './uiSlice'
import type { ThemeMode } from './uiSlice'
import { useSavePrefs } from './usePrefs'

const ORDER: ThemeMode[] = ['light', 'dark', 'system']

/** Переключатель темы: день → ночь → как в системе (три состояния). */
export function ThemeToggle() {
  const t = useT()
  const mode = useAppSelector((s) => s.ui.theme)
  const dispatch = useAppDispatch()
  const save = useSavePrefs()
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : MonitorCog
  const change = () => { dispatch(setTheme(next)); save({ theme: next }) }
  return (
    <button type="button" className="icon-btn" onClick={change} title={t('ui.theme.' + mode) + ' → ' + t('ui.theme.' + next)} aria-label={t('ui.theme.label') + ': ' + t('ui.theme.' + mode)}>
      <Icon size={20} aria-hidden />
    </button>
  )
}
