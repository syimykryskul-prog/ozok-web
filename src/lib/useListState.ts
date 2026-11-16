import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounced } from '../app/hooks'
import type { ListParams } from '../api/types'

export const PAGE_SIZE = 20

/** Состояние списка: страница, поиск, сортировка, фильтры. Начальный поиск берётся из ?q=. */
export function useListState<F extends Record<string, string>>(initialFilters: F, defaultOrdering = '') {
  const [sp] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(sp.get('q') ?? '')
  const [ordering, setOrderingRaw] = useState(defaultOrdering)
  const [filters, setFilters] = useState<F>(initialFilters)
  const debounced = useDebounced(search)
  const q = sp.get('q')

  useEffect(() => { setSearch(q ?? '') }, [q])
  useEffect(() => { setPage(1) }, [debounced])

  const setFilter = useCallback(<K extends keyof F>(k: K, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    setPage(1)
  }, [])
  const setOrdering = useCallback((o: string) => { setOrderingRaw(o); setPage(1) }, [])

  const params: ListParams = { page, page_size: PAGE_SIZE, search: debounced, ordering, ...filters }
  return { page, setPage, search, setSearch, ordering, setOrdering, filters, setFilter, params }
}
