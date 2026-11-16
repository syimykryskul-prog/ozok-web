import { baseApi, clean } from './baseApi'
import { canRead } from '../lib/permissions'
import type { ListParams, Paginated } from './types'

/** Универсальные эндпоинты: любой ресурс контракта (раздел 6) читается/пишется через них. */
export const dataApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    get: build.query<unknown, { path: string; params?: ListParams }>({
      query: ({ path, params }) => ({ url: path, params: clean(params) }),
      providesTags: ['Data'],
    }),
    send: build.mutation<unknown, { path: string; method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }>({
      query: ({ path, method = 'POST', body }) => ({ url: path, method, body }),
      invalidatesTags: ['Data'],
    }),
  }),
})

const { useGetQuery, useSendMutation } = dataApi

interface Opts { skip?: boolean }

/** GET-путь → ресурс backend (core/permissions.py). Если ресурс не читается (me.permissions), запрос не отправляется. */
const READ_RESOURCE: [string, string][] = [
  ['reports/sales/', 'sales_report'], ['reports/ledger/', 'ledger'], ['reports/partner-analytics/', 'analytics'], ['reports/sphere-analytics/', 'analytics'],
  ['reports/ozok-clients/', 'analytics'], ['reports/cash/', 'cash_report'], ['reports/rating/', 'reports'],
  ['products/', 'products'], ['packages/', 'packages'], ['tariffs/', 'tariffs'], ['equipment/', 'equipment'], ['commission-rules/', 'commission_rules'],
  ['deals/', 'deals'], ['client-sales/', 'client_sales'], ['contracts/', 'contracts'], ['ledger/', 'ledger'], ['users/', 'users'],
  ['subscriptions/', 'subscriptions'], ['payments/', 'subscription_payments'], ['payouts/', 'payouts'], ['commission-accruals/', 'commission_accruals'],
  ['tickets/', 'tickets'], ['tasks/', 'tasks'], ['leads/', 'leads'], ['clients/', 'clients'], ['branches/', 'branches'], ['courses/', 'courses'],
  ['franchisees/', 'franchisees'], ['change-requests/', 'change_requests'], ['audit-log/', 'audit_log'], ['sales-plans/', 'sales_plans'],
  ['cash-accounts/', 'cash_accounts'], ['cash-transactions/', 'cash_transactions'], ['cash-categories/', 'cash_categories'],
  ['access-roles/', 'access_roles'], ['installations/', 'installations'], ['recruiter-rewards/', 'recruiter_rewards'], ['implementer-accruals/', 'implementer_accruals'],
  ['dashboard/', 'dashboard'], ['charges/', 'charges'], ['franchisee-payments/', 'payments'],
]
const unreadable = (path: string): boolean => {
  const hit = READ_RESOURCE.find(([prefix]) => path.startsWith(prefix))
  return !!hit && !canRead(hit[1])
}

/** Страница списка: `useList<Lead>('leads/', params)`. */
export function useList<T>(path: string, params?: ListParams, opts?: Opts) {
  const r = useGetQuery({ path, params }, { ...opts, skip: opts?.skip || unreadable(path) })
  return { ...r, data: r.data as Paginated<T> | undefined, rows: (r.data as Paginated<T> | undefined)?.results }
}

/** Один объект / произвольный JSON. */
export function useOne<T>(path: string, params?: ListParams, opts?: Opts) {
  const r = useGetQuery({ path, params }, { ...opts, skip: opts?.skip || unreadable(path) })
  return { ...r, data: r.data as T | undefined }
}

/** Мутации: `const [send, {isLoading}] = useSend<Lead>(); await send('leads/1/take/')`. */
export function useSend<R = unknown>() {
  const [run, state] = useSendMutation()
  const send = (path: string, body?: unknown, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST') =>
    run({ path, method, body }).unwrap() as Promise<R>
  return [send, state] as const
}
