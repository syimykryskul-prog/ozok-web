import { baseApi } from '../../api/baseApi'
import type { User } from '../../api/types'
import { setUser } from './authSlice'
import { setLang, setTheme, THEME_KEY } from '../ui/uiSlice'
import { hasLocal } from '../ui/applyUi'
import { LANG_KEY } from '../../i18n'

export type LoginResult =
  | { access: string; refresh: string; user: User; otp_required?: false }
  | { otp_required: true; otp_token: string; access?: undefined; refresh?: undefined; user?: undefined }

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResult, { email: string; password: string }>({
      query: (body) => ({ url: 'auth/login/', method: 'POST', body }),
    }),
    loginOtp: build.mutation<{ access: string; refresh: string; user: User }, { otp_token: string; code: string }>({
      query: (body) => ({ url: 'auth/login/otp/', method: 'POST', body }),
    }),
    updatePrefs: build.mutation<unknown, { theme?: string; language?: string }>({
      query: (body) => ({ url: 'auth/me/', method: 'PATCH', body }),
    }),
    me: build.query<User, void>({
      query: () => 'auth/me/',
      providesTags: ['Me'],
      async onQueryStarted(_a, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setUser(data))
          // серверные настройки (необязательные поля) — источник истины после входа
          if (!hasLocal(THEME_KEY) && (data.theme === 'light' || data.theme === 'dark' || data.theme === 'system')) dispatch(setTheme(data.theme))
          if (!hasLocal(LANG_KEY) && (data.language === 'ru' || data.language === 'ky')) dispatch(setLang(data.language))
        } catch {
          /* 401 обработает baseQuery */
        }
      },
    }),
  }),
})

export const { useLoginMutation, useLoginOtpMutation, useMeQuery, useUpdatePrefsMutation } = authApi
