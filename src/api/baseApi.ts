import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { logout, setAccess, setUser } from '../features/auth/authSlice'
import type { AuthState } from '../features/auth/authSlice'
import { getLang, t } from '../i18n'
import type { ListParams } from './types'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1/',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.access
    if (token) headers.set('Authorization', `Bearer ${token}`)
    headers.set('Accept-Language', getLang())
    return headers
  },
})

let refreshing: Promise<string | null> | null = null

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra)
  const url = typeof args === 'string' ? args : args.url
  if (result.error?.status === 401 && !url.startsWith('auth/login')) {
    const refresh = (api.getState() as { auth: AuthState }).auth.refresh
    if (refresh) {
      if (!refreshing) {
        refreshing = (async () => {
          const r = await rawBaseQuery({ url: 'auth/refresh/', method: 'POST', body: { refresh } }, api, extra)
          const access = (r.data as { access?: string } | undefined)?.access
          if (access) {
            api.dispatch(setAccess(access))
            return access
          }
          api.dispatch(logout())
          return null
        })().finally(() => {
          refreshing = null
        })
      }
      const access = await refreshing
      if (access) result = await rawBaseQuery(args, api, extra)
    } else {
      api.dispatch(logout())
    }
  }
  // временный пароль: backend отвечает 403 на всё, кроме auth/me/ и auth/change-password/
  if (result.error?.status === 403 && !url.startsWith('auth/')) {
    const detail = (result.error.data as { detail?: string } | undefined)?.detail ?? ''
    const user = (api.getState() as { auth: AuthState }).auth.user
    if (user && !user.must_change_password && new RegExp(t('api.tempPasswordRe'), 'i').test(detail)) api.dispatch(setUser({ ...user, must_change_password: true }))
  }
  return result
}

export const TAGS = ['Me', 'Data'] as const
export type Tag = (typeof TAGS)[number]

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [...TAGS],
  endpoints: () => ({}),
})

/** Убирает пустые значения из query-параметров. */
export function clean(p?: ListParams | void): Record<string, string | number | boolean> | undefined {
  if (!p) return undefined
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out
}
