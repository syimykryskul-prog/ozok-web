import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { useT } from '../../i18n'
import { cls } from '../../lib/format'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sortKey?: string
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface Props<T> {
  columns: Column<T>[]
  rows?: T[]
  loading?: boolean
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  ordering?: string
  onOrdering?: (o: string) => void
  page?: number
  pageSize?: number
  total?: number
  onPage?: (p: number) => void
  emptyTitle?: string
  emptyText?: string
  emptyAction?: ReactNode
}

const alignCls = (a?: string) => (a === 'right' ? 'num' : a === 'center' ? 'center' : undefined)

export function DataTable<T>({
  columns, rows, loading, rowKey, onRowClick, ordering, onOrdering, page = 1, pageSize = 20, total, onPage,
  emptyTitle, emptyText, emptyAction,
}: Props<T>) {
  const t = useT()
  const toggle = (key: string) => {
    if (!onOrdering) return
    if (ordering === key) onOrdering(`-${key}`)
    else if (ordering === `-${key}`) onOrdering('')
    else onOrdering(key)
  }

  const pages = total ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const empty = !loading && (!rows || rows.length === 0)

  return (
    <div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => {
                const sorted = c.sortKey && (ordering === c.sortKey ? 'asc' : ordering === `-${c.sortKey}` ? 'desc' : null)
                return (
                  <th
                    key={c.key} className={alignCls(c.align)} style={{ width: c.width }}
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                  >
                    {c.sortKey && onOrdering ? (
                      <button className="th-sort" onClick={() => toggle(c.sortKey!)}>
                        {c.header}
                        {sorted === 'asc' ? <ArrowUp /> : sorted === 'desc' ? <ArrowDown /> : <ArrowUpDown style={{ opacity: .4 }} />}
                      </button>
                    ) : c.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk${i}`}>
                {columns.map((c) => (
                  <td key={c.key}><span className="skeleton" style={{ width: `${50 + ((i * 17 + c.key.length * 13) % 45)}%` }} /></td>
                ))}
              </tr>
            ))}
            {!loading && rows?.map((r) => (
              <tr
                key={rowKey(r)} className={cls(onRowClick && 'is-click')}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r) } : undefined}
              >
                {columns.map((c) => <td key={c.key} className={alignCls(c.align)}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {empty && (
        <div className="empty">
          <div className="empty__icon"><Inbox size={26} aria-hidden /></div>
          <h3>{emptyTitle ?? t('ui.emptyTitle')}</h3>
          <p>{emptyText ?? t('ui.emptyText')}</p>
          {emptyAction}
        </div>
      )}
      {!!total && total > 0 && onPage && (
        <div className="pagination">
          <span>{t('ui.pageInfo', { total, page, pages })}</span>
          <div className="row">
            <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>{t('common.back')}</Button>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
              {t('common.next')} <ChevronRight size={18} aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
