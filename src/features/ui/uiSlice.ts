import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { loadLang } from '../../i18n'
import type { Lang } from '../../i18n'

export type ThemeMode = 'light' | 'dark' | 'system'
export const THEME_KEY = 'ozok.theme'

export function loadTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignore */ }
  return 'system'
}

export interface UiState { theme: ThemeMode; lang: Lang }

const slice = createSlice({
  name: 'ui',
  initialState: { theme: loadTheme(), lang: loadLang() } as UiState,
  reducers: {
    setTheme(s, a: PayloadAction<ThemeMode>) { s.theme = a.payload },
    setLang(s, a: PayloadAction<Lang>) { s.lang = a.payload },
  },
})
export const { setTheme, setLang } = slice.actions
export default slice.reducer
