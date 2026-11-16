import { useAppSelector } from '../../app/hooks'
import { authApi } from '../auth/authApi'

/** Сохраняет тему/язык в профиле (PATCH auth/me/). Поля User.theme/language на backend необязательны — ошибки игнорируем. */
export function useSavePrefs() {
  const token = useAppSelector((s) => s.auth.access)
  const [patch] = authApi.useUpdatePrefsMutation()
  return (body: { theme?: string; language?: string }) => {
    if (token) void patch(body).unwrap().catch(() => undefined)
  }
}
