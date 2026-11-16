/** Значение необязательного поля `<name>_ky` из записи API (бэкенд отдаёт сырые значения для редактирования). */
export const kyOf = (item: unknown, key: string): string => {
  const v = (item as Record<string, unknown> | null | undefined)?.[key]
  return typeof v === 'string' ? v : ''
}

/** Русское (базовое) значение для редактирования: API отдаёт локализованное в `<key>`, сырое русское — в `<key>_ru`. */
export const ruOf = (item: unknown, key: string, fallback = ''): string => {
  const o = item as Record<string, unknown> | null | undefined
  const raw = o?.[`${key}_ru`]
  if (typeof raw === 'string') return raw
  const v = o?.[key]
  return typeof v === 'string' ? v : fallback
}
