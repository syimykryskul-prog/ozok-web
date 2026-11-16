import { useState } from 'react'
import { useSend } from '../../api/hooks'
import { useToast } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { useUser } from '../../app/hooks'
import { canWrite, isNbsRole } from '../../lib/permissions'
import type { WriteKey } from '../../lib/permissions'

/** Выполняет действие API с тостами. Возвращает результат или undefined при ошибке. */
export function useAct() {
  const [send] = useSend()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const act = async <R = unknown>(path: string, body?: unknown, okMsg?: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST'): Promise<R | undefined> => {
    setBusy(true)
    try {
      const r = (await send(path, body, method)) as R
      if (okMsg) toast.success(okMsg)
      return r
    } catch (e) {
      toast.error(errorMessage(e))
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { act, busy }
}

export function useCan(key: WriteKey): boolean {
  const user = useUser()
  return canWrite(user?.role, key)
}

export function useIsHq(): boolean {
  const u = useUser()
  return !!u && (u.is_hq === true || isNbsRole(u.role))
}
