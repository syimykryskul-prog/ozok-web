import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useT } from '../../i18n'

import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info' | 'warning'
interface ToastItem { id: number; tone: ToastTone; text: string }
interface ToastApi {
  show: (text: string, tone?: ToastTone) => void
  success: (text: string) => void
  error: (text: string) => void
}

const Ctx = createContext<ToastApi | null>(null)
let seq = 0

const ICONS = { success: CircleCheck, error: CircleX, info: Info, warning: TriangleAlert }

export function ToastProvider({ children }: { children: ReactNode }) {
  const tr = useT()
  const [items, setItems] = useState<ToastItem[]>([])
  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const show = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = ++seq
    setItems((l) => [...l, { id, tone, text }])
    setTimeout(() => remove(id), tone === 'error' ? 8000 : 4500)
  }, [remove])
  const api = useMemo<ToastApi>(() => ({
    show,
    success: (t) => show(t, 'success'),
    error: (t) => show(t, 'error'),
  }), [show])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div key={t.id} className={`toast toast--${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={20} aria-hidden />
              <span className="toast__text">{t.text}</span>
              <button onClick={() => remove(t.id)} aria-label={tr('common.close')}><X size={18} /></button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('ToastProvider missing')
  return c
}
