import { useCallback, useState } from 'react'
import { splitErrors } from './errors'

export function useForm<T extends object>(initial: T) {
  const [v, setV] = useState<T>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')

  const set = useCallback(<K extends keyof T>(k: K, val: T[K]) => {
    setV((p) => ({ ...p, [k]: val }))
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: '' } : e))
  }, [])

  const fail = useCallback((err: unknown) => {
    const s = splitErrors(err)
    setErrors(s.fields)
    setGeneral(s.general)
  }, [])

  const clear = useCallback(() => { setErrors({}); setGeneral('') }, [])

  return { v, set, setAll: setV, errors, general, fail, clear }
}

export const num = (s: string) => (s.trim() === '' ? '0' : s.replace(',', '.'))
