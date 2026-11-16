import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../api/baseApi'
import uiReducer from '../features/ui/uiSlice'
import { applyLang, applyTheme, watchSystemTheme } from '../features/ui/applyUi'
import authReducer, { persistAuth } from '../features/auth/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (gdm) => gdm().concat(baseApi.middleware),
})

applyTheme(store.getState().ui.theme)
applyLang(store.getState().ui.lang)
watchSystemTheme(() => store.getState().ui.theme)
let lastUi = store.getState().ui
let last = store.getState().auth
store.subscribe(() => {
  const ui = store.getState().ui
  if (ui !== lastUi) {
    if (ui.theme !== lastUi.theme) applyTheme(ui.theme, true)
    if (ui.lang !== lastUi.lang) applyLang(ui.lang, true)
    lastUi = ui
  }
  const cur = store.getState().auth
  if (cur !== last) {
    last = cur
    persistAuth(cur)
    if (!cur.access && !cur.refresh) store.dispatch(baseApi.util.resetApiState())
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
