import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useT } from '../../i18n'
import type { Lang } from '../../i18n'
import { setLang } from './uiSlice'
import { useSavePrefs } from './usePrefs'

/** Переключатель «РУС / КЫР». */
export function LangSwitch() {
  const t = useT()
  const lang = useAppSelector((s) => s.ui.lang)
  const dispatch = useAppDispatch()
  const save = useSavePrefs()
  const pick = (l: Lang) => { if (l !== lang) { dispatch(setLang(l)); save({ language: l }) } }
  return (
    <div className="lang-switch" role="group" aria-label={t('ui.lang.label')}>
      <button type="button" className={lang === 'ru' ? 'is-active' : ''} aria-pressed={lang === 'ru'} onClick={() => pick('ru')}>{t('ui.lang.ru')}</button>
      <button type="button" className={lang === 'ky' ? 'is-active' : ''} aria-pressed={lang === 'ky'} onClick={() => pick('ky')}>{t('ui.lang.ky')}</button>
    </div>
  )
}
