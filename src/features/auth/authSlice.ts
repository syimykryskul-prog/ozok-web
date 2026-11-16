import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User } from '../../api/types'

export interface AuthState {
  access: string | null
  refresh: string | null
  user: User | null
}

const KEY = 'ozok_auth'

function load(): AuthState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as AuthState
      return { access: p.access ?? null, refresh: p.refresh ?? null, user: p.user ?? null }
    }
  } catch {
    /* ignore */
  }
  return { access: null, refresh: null, user: null }
}

export function persistAuth(state: AuthState): void {
  try {
    if (state.access || state.refresh) localStorage.setItem(KEY, JSON.stringify(state))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

const slice = createSlice({
  name: 'auth',
  initialState: load(),
  reducers: {
    setCredentials(_s, a: PayloadAction<{ access: string; refresh: string; user: User }>) {
      return a.payload
    },
    setAccess(s, a: PayloadAction<string>) {
      s.access = a.payload
    },
    setUser(s, a: PayloadAction<User>) {
      s.user = a.payload
    },
    logout() {
      return { access: null, refresh: null, user: null }
    },
  },
})

export const { setCredentials, setAccess, setUser, logout } = slice.actions
export default slice.reducer
