export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type ListParams = Record<string, string | number | boolean | null | undefined>

export type Role = import('../lib/permissions').Role | import('../lib/permissions').LegacyRole

export interface FranchiseeRef { id: number; name: string; city: string; status: string }

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  role: Role | string
  is_hq?: boolean
  franchisee: FranchiseeRef | null
  partner?: FranchiseeRef | null
  region?: string
  otp_enabled?: boolean
  two_factor_enabled?: boolean
  /** Итоговые права (backend P0+ п.8): модуль → none|read|write; особые права. */
  permissions?: Record<string, 'none' | 'read' | 'write'>
  /** Раздел меню → none|read|write. */
  modules?: Record<string, 'none' | 'read' | 'write'>
  /** Защищённые действия «resource.action» и имена групп особых прав. */
  actions?: string[]
  must_change_password?: boolean
  theme?: 'light' | 'dark' | 'system'
  language?: 'ru' | 'ky'
  scope?: string
  access_role?: { id: number; code: string; name: string } | number | string | null
}

export interface AppUser {
  id: number
  last_login?: string | null
  must_change_password?: boolean
  access_role?: number | null
  region?: string
  email: string
  first_name: string
  last_name: string
  full_name?: string
  phone: string
  role: string
  franchisee: number | null
  franchisee_name?: string | null
  client?: number | null
  is_active: boolean
  password?: string
}

export interface Product {
  /** Кто присылает оплаты абонплаты: manual — вручную/выписка, elqr, product — автоматически. */
  payment_source?: 'manual' | 'elqr' | 'product' | string
  id: number
  code: string
  name: string
  franchise_fee?: string
  sphere: string
  description: string
  icon: string
  color: string
  price_cash: string
  price_per_sale: string
  setup_price?: string
  subscription_price?: string
  default_commission_percent: string | number
  sort_order: number
  is_active: boolean
  min_price?: string
  training_price?: string
  max_discount_percent?: string | number
  grace_days?: number | null
  restrict_after_days?: number | null
  install_checklist?: string[] | string
  integration_enabled?: boolean
  api_key?: string
  last_event_at?: string | null
}

export interface Equipment {
  id: number
  name: string
  product: number | null
  product_name?: string | null
  price: string
  unit: string
  sort_order: number
  is_active: boolean
}

export interface Package {
  id: number
  name: string
  products: number[]
  price_cash: string
  price_prepay: string
  price_per_sale: string
  prepay_percent: string | number
  is_active: boolean
}

export interface PriceQuote { list_price: string; prepay_percent?: number; installments_hint?: number }

export interface Franchisee {
  id: number
  name: string
  legal_name: string
  inn: string
  city: string
  cities: string[]
  address: string
  phone: string
  email: string
  owner_name: string
  status: string
  curator: number | null
  curator_name?: string | null
  joined_at: string | null
  note: string
  balance?: string | null
  overdue_amount?: string | null
  rating?: number | null
  employees_count?: number
  clients_count?: number
  products?: string[]
  partner_code?: string
  commission_due?: string | null
  commission_month?: string | null
  sales_by_product?: SalesByProduct[]
  // P1/P2
  full_name?: string
  passport?: string
  region?: string
  specialization?: number[]
  specialization_names?: string[]
  candidate_source?: string
  recruited_by?: number | null
  recruited_by_name?: string | null
  responsible?: number | null
  responsible_name?: string | null
  funnel_stage?: string
  funnel_stage_since?: string | null
  days_in_stage?: number | null
  training_date?: string | null
  certification_result?: 'passed' | 'failed' | null
  certification_date?: string | null
  tier?: 'standard' | 'growth' | string
  tier_effective_from?: string | null
  quality_rating?: number | null
  suspended_at?: string | null
  closed_at?: string | null
  status_reason?: string
}

export interface Contract {
  id: number
  franchisee: number
  franchisee_name?: string
  number: string
  signed_at: string | null
  products: number[]
  product_codes?: string[]
  product: number | null
  product_name?: string | null
  package: number | null
  package_name?: string | null
  list_price?: string
  remaining_amount?: string
  payment_scheme: string
  fee_total: string
  prepay_percent: string | number
  installments: number
  commission_percent?: string | number
  withhold_percent?: string | number
  upfront_amount?: string
  upfront_due?: string | null
  installments_total?: string
  installments_count?: number
  installment_step_months?: number
  discount_note?: string
  remainder_amount?: string
  upfront_paid?: string
  installments_paid?: string
  withheld_paid?: string
  status: string
  valid_until: string | null
  note: string
  paid_off_amount?: string
  charges_total?: string
}

export interface Lead {
  id: number
  source: string
  interest: string
  /** код сферы, `package:<id>`, `help` или пусто */
  product: string
  name: string
  company_name: string
  contact_name: string
  phone: string
  city: string
  region: string
  comment: string
  status: 'new' | 'in_progress' | 'demo' | 'proposal' | 'contract' | 'paid' | 'lost' | string
  franchisee: number | null
  franchisee_name?: string | null
  implementer: number | null
  next_contact_at: string | null
  owner_confirmed: boolean
  owner_confirmed_by?: number | null
  owner_confirmed_at: string | null
  assigned_at: string | null
  taken_at: string | null
  closed_at: string | null
  lost_reason: string
  client_id: number | null
  overdue: boolean
  created_at: string
}

export type ClientOrigin = 'partner' | 'ozok_legacy' | 'ozok_direct'

export interface Client {
  id: number
  /** Источник клиента (P0+ п.9); по умолчанию partner. */
  origin?: ClientOrigin
  franchisee: number
  franchisee_name?: string
  business_name: string
  business_type: string
  contact_name: string
  phone: string
  city: string
  address: string
  lead: number | null
  note: string
  is_active: boolean
  products?: string[]
  accounts?: ClientAccount[]
  last_paid_until?: string | null
  implementations_count?: number
}

export interface Implementation {
  id: number
  client: number
  client_name?: string
  franchisee_name?: string
  product: number
  product_name?: string
  stage: string
  started_at: string | null
  planned_launch: string | null
  launched_at: string | null
  responsible: number | null
  responsible_name?: string | null
  note: string
  overdue?: boolean
}

export interface ClientSale {
  id: number
  client: number
  client_name?: string
  franchisee_name?: string
  product: number
  product_name?: string
  kind: string
  date: string
  amount: string
  paid_until: string | null
  comment: string
  product_code?: string
  sphere?: string
  equipment?: number | null
  equipment_name?: string | null
  quantity?: string | number
  franchisee_income?: string
  withheld_amount?: string
  paid_amount?: string
  tariff?: number | null
  tariff_name?: string | null
  list_amount?: string
  discount_amount?: string
  commission_rule?: number | null
  commission_rule_name?: string | null
  commission_fixed?: string
  income_overridden?: boolean
  source?: string
  months?: number | null
  external_payment_id?: string | null
  commission_percent?: string
  commission_amount?: string
  charge?: { id: number; kind: string; amount: string } | null
  warning?: string | null
  cancelled_at?: string | null
  cancel_reason?: string
  net_income?: string
  nbs_share_amount?: string
  adjustment_amount?: string
  commission_base_amount?: string
  lead?: number | null
  lead_source?: string
  partner_tier?: string
  deal?: number | null
}

export interface Charge {
  id: number
  franchisee: number
  franchisee_name?: string
  contract: number | null
  kind: string
  amount: string
  due_date: string
  description: string
  client_sale: number | null
  cancelled_at?: string | null
  cancel_reason?: string
  overdue?: boolean
}

export interface FrPayment {
  id: number
  franchisee: number
  franchisee_name?: string
  amount: string
  date: string
  method: string
  comment: string
  created_by_name?: string | null
  cancelled_at?: string | null
  cancel_reason?: string
  status?: 'confirmed' | 'cancelled' | string
  contract?: number | null
  client_sale?: number | null
}

export interface CommissionPayout {
  id: number
  franchisee: number
  franchisee_name?: string
  amount: string
  date: string
  method: string
  comment: string
  created_by_name?: string | null
  cancelled_at?: string | null
  cancel_reason?: string
  client_sale?: number | null
}

export interface ClientAccount {
  id?: number
  product: number
  product_name?: string
  external_id: string
  status: string
  paid_until: string | null
  monthly_fee?: string | null
  connected_at?: string | null
  client?: number
  client_name?: string
  franchisee_name?: string
}

export interface IntegrationEvent {
  id: number
  provider?: 'product' | 'elqr' | string
  product_code?: string | null
  product: number | null
  product_name?: string
  event_type: string
  external_id: string
  payload: Record<string, unknown>
  status: string
  error: string | null
  client: number | null
  client_name?: string | null
  franchisee: number | null
  franchisee_name?: string | null
  received_at: string
  processed_at: string | null
}

export interface OldSubscription {
  id: number
  client: number
  client_name?: string
  franchisee_name?: string
  product: number
  product_name?: string
  sphere?: string
  monthly_fee: string
  paid_until: string | null
  status: string
  started_at: string | null
}

export interface ClientInvoice {
  id: number
  number: string
  client: number
  client_name?: string
  subscription: number
  product_name?: string
  months: number
  amount: string
  status: string
  created_at: string
  paid_at: string | null
  period_from: string | null
  period_to: string | null
}

export interface ClientPayment {
  id: number
  invoice: number
  invoice_number?: string
  client_name?: string
  provider: string
  amount: string
  status: string
  external_id: string
  payment_url: string
  created_at: string
  paid_at: string | null
}

export interface PayResponse {
  invoice: ClientInvoice
  payment: { id: number; payment_url: string; status: string }
}

export interface SalesByProduct {
  color?: string
  icon?: string
  product: string
  sphere: string
  name: string
  count: number
  amount: string
  subscription_amount: string
  commission: string
  income?: string
  withheld?: string
  net_income?: string
}

export interface SalesReport {
  period: { date_from: string; date_to: string }
  filters: { franchisee: number | null; product: string | null }
  totals: {
    count: number; amount: string; subscription_amount: string; commission: string
    income?: string; withheld?: string; net_income?: string
    by_kind?: { kind: string; label: string; count: number; amount: string; income: string }[]
  }
  by_kind?: { kind: string; label: string; count: number; amount: string; income: string }[]
  by_product: SalesByProduct[]
  by_franchisee: { franchisee_id: number; name: string; count: number; amount: string; commission: string; income?: string; withheld?: string; net_income?: string }[]
  by_month: { month: string; amount: string; commission: string; income?: string; withheld?: string; net_income?: string }[]
}

export interface SubsSummary { active: number; renewal_soon: number; expired: number }

export interface Course {
  id: number
  title: string
  product: number | null
  description: string
  materials_url: string
  pass_score: number
  validity_months: number
  is_active: boolean
  enrolled_count?: number
  passed_count?: number
}

export interface Enrollment {
  id: number
  course: number
  course_title?: string
  user: number
  user_name?: string
  franchisee_name?: string
  status: string
  score: number | null
  assigned_at: string | null
  completed_at: string | null
  expires_at: string | null
  expired?: boolean
}

export interface Ticket {
  id: number
  franchisee?: number
  franchisee_name?: string
  client: number
  client_name?: string
  subject: string
  description: string
  priority: string
  status: string
  opened_at: string
  first_response_at: string | null
  resolved_at: string | null
  rating: number | null
  assignee: number | null
  assignee_name?: string | null
  sla_breached?: boolean
  sla_hours?: number
}

export interface AuditItem { criterion: string; ok: boolean; comment: string }

export interface Audit {
  id: number
  franchisee: number
  franchisee_name?: string
  date: string
  inspector?: number
  inspector_name?: string
  items: AuditItem[]
  score?: number
  summary: string
}

export interface SalesPlan {
  id: number
  franchisee: number
  franchisee_name?: string
  month: string
  target_clients: number
  target_revenue: string
  fact_clients?: number
  fact_revenue?: string
  plan_percent?: number | null
}

export interface Task {
  id: number
  franchisee: number
  franchisee_name?: string
  title: string
  description: string
  priority: string
  status: string
  due_date: string | null
  created_by_name?: string
  assignee: number | null
  assignee_name?: string | null
  done_at: string | null
  overdue?: boolean
  comments_count?: number
}

export interface TaskComment { id: number; author_name?: string; text: string; created_at: string }

export interface PlanBlock {
  target_clients: number
  target_revenue: string
  fact_clients: number
  fact_revenue: string
  plan_percent: number | null
}

export interface RevenuePoint { month: string; revenue: string }

export interface AttentionItem {
  type: string
  franchisee_id: number
  franchisee_name: string
  text: string
}

export interface RatingShort {
  franchisee_id: number
  name: string
  city: string
  rating: number
  place: number
  plan_percent: number | null
}

export interface HqDashboard {
  scope: 'hq'
  month: string
  franchisees: Record<string, number>
  leads: Record<string, number>
  new_clients: number
  network_revenue: string
  receivables: string
  overdue_receivables: string
  payments_month: string
  open_tickets: number
  sla_breached: number
  overdue_tasks: number
  trained_share: number
  revenue_by_month: RevenuePoint[]
  commission_month?: string
  subscriptions?: SubsSummary
  unmatched_events?: number
  network_income_month?: string
  withheld_month?: string
  sales_by_product?: SalesByProduct[]
  rating: RatingShort[]
  attention: AttentionItem[]
}

export interface FrDashboard {
  scope: 'franchisee'
  month: string
  plan: PlanBlock | null
  rating: number | null
  place: number | null
  network_size: number
  leads: Record<string, number>
  clients_total: number
  renewal_soon: number
  expired: number
  balance: string | null
  overdue_amount: string | null
  open_tickets: number
  sla_breached: number
  tasks: Record<string, number>
  trained_share: number
  revenue_by_month: RevenuePoint[]
  commission_month?: string | null
  commission_due?: string | null
  subscriptions?: SubsSummary
  income_month?: string
  withheld_month?: string
  sales_by_product?: SalesByProduct[]
}

export type Dashboard = HqDashboard | FrDashboard

export interface RatingRow {
  franchisee_id: number
  name: string
  city: string
  rating: number
  place: number
  plan_percent: number | null
  avg_ticket_rating: number | null
  last_audit_score: number | null
  trained_share: number
  payment_discipline: number
  new_clients: number
  revenue: string
}

export interface FranchiseeSummary {
  franchisee: Franchisee
  balance: string | null
  overdue_amount: string | null
  rating: number | null
  place: number | null
  plan: PlanBlock | null
  contracts: Contract[] | null
  employees: AppUser[]
  recent_leads: Lead[]
  recent_sales: ClientSale[]
  open_tasks: Task[]
  last_audit: Audit | null
  commission_due?: string | null
  commission_month?: string | null
  sales_by_product?: SalesByProduct[]
}

export interface TariffPrice { id?: number; monthly_price: string; valid_from: string; valid_to: string | null }

export interface Tariff {
  id: number
  product: number
  product_name?: string
  code: string
  name: string
  monthly_price?: string
  current_price?: string | null
  prices?: TariffPrice[]
  description: string
  is_active: boolean
  sort_order: number
}

export interface CommissionRule {
  id: number
  name: string
  product: number | null
  product_name?: string | null
  tariff: number | null
  tariff_name?: string | null
  franchisee: number | null
  franchisee_name?: string | null
  sale_kind: string
  percent: string | null
  fixed_amount: string | null
  fixed_per: string
  base: string
  valid_from: string | null
  valid_to: string | null
  is_active: boolean
  note: string
  partner_tier?: string
  lead_source?: string
  basis?: string
  effective_from?: string | null
}

export interface CommissionPreview {
  rule: CommissionRule | null
  percent?: string | null
  fixed?: string | null
  income: string
}

// ====== OZOK v3 (P0–P4, P0+) ======

export interface Setting {
  key: string
  value: unknown
  type?: 'int' | 'decimal' | 'bool' | 'string' | 'json' | string
  label?: string
  group?: string
  help?: string
  updated_at?: string
  updated_by_name?: string | null
}

export interface FranchiseOffer {
  id: number
  name: string
  total: string
  upfront: string
  installments_count: number
  step_months: number
  is_active: boolean
  note?: string
}

export interface PartnerHistoryItem {
  id: number
  field: 'status' | 'tier' | 'funnel_stage' | string
  old: string | null
  new: string
  effective_from: string | null
  reason: string
  decided_by_name?: string | null
  created_at: string
}

export interface AuditEntry {
  id: number
  user: number | null
  user_name?: string | null
  action: string
  entity: string
  entity_id: number | string
  changes: Record<string, [unknown, unknown]> | Record<string, unknown> | null
  reason: string
  ip?: string | null
  user_agent?: string | null
  created_at: string
}

export interface LeadActivity {
  id: number
  lead: number
  user: number | null
  user_name?: string | null
  type: string
  text: string
  created_at: string
}

export interface ChangeRequest {
  id: number
  entity?: string
  entity_id?: number | string
  lead?: number | null
  lead_name?: string | null
  franchisee?: number | null
  field: string
  old_value?: unknown
  new_value: unknown
  new_value_label?: string | null
  reason: string
  status: 'pending' | 'approved' | 'rejected' | string
  requested_by?: number | null
  requested_by_name?: string | null
  partner_name?: string | null
  decided_by_name?: string | null
  decision_comment?: string
  decided_at?: string | null
  created_at: string
}

export interface RecruiterReward {
  id: number
  partner: number
  partner_name?: string
  partner_status?: string
  recruiter: number
  recruiter_name?: string
  target_amount: string
  accrued_amount: string
  status: 'accruing' | 'accrued' | 'verified' | 'paid' | 'cancelled' | string
  verified_by?: number | null
  verified_by_name?: string | null
  verified_at?: string | null
  paid_by?: number | null
  paid_by_name?: string | null
  paid_at?: string | null
  paid_date?: string | null
  paid_amount?: string
  payment_ref?: string
  debt_amount?: string
  remaining?: string
  cancel_reason?: string
  /** null для рекрутёра: платежи партнёра ему не показываются. */
  allocations?: { payment: number; amount: string; date: string; method: string }[] | null
  created_at?: string
}

export interface RecruiterStat {
  recruiter: number
  recruiter_name?: string
  name?: string
  recruited?: number
  attracted: number
  activated: number
  accrued?: string
  paid?: string
  paid_count?: number
  rewards?: RecruiterReward[]
}

export type FrPaymentV3 = FrPayment

export interface DealLine {
  id?: number
  kind: 'setup' | 'training' | 'equipment' | 'subscription' | string
  kind_label?: string
  equipment?: number | null
  equipment_name?: string | null
  tariff?: number | null
  tariff_name?: string | null
  quantity?: number | string
  months?: number | null
  serial_numbers?: string[]
  list_price?: string
  discount_percent?: string | number | null
  discount_amount?: string | number | null
  discount_reason?: string
  list_amount?: string
  line_discount?: string
  deal_discount_share?: string
  total?: string
  partner_income?: string
  nbs_income?: string
  withheld?: string
  violation?: string
  subscription_status?: string
  sale?: number | null
}

export interface Deal {
  id: number
  client: number | null
  client_title?: string
  client_name?: string
  partner: number | null
  partner_name?: string | null
  is_nbs_direct?: boolean
  lead?: number | null
  product: number
  product_name?: string
  date: string
  status: 'draft' | 'pending_approval' | 'confirmed' | 'cancelled' | string
  comment: string
  deal_discount_percent?: string | number | null
  deal_discount_amount?: string | number | null
  discount_reason?: string
  /** строки продажи (чтение). При записи отправляется `lines`. */
  items: DealLine[]
  list_total?: string
  discount_total?: string
  total?: string
  partner_income_total?: string
  nbs_income_total?: string
  approval_note?: string
  /** Оплата: считается автоматически по платежам (read-only). */
  payment_status?: 'unpaid' | 'partial' | 'paid'
  contract_number?: string
  signed_at?: string | null
  change_request?: { id: number; status: string } | null
  approved_by?: number | null
  approved_at?: string | null
  confirmed_at?: string | null
  cancelled_at?: string | null
  cancel_reason?: string
  created_at?: string
}

export interface DealPreviewLine {
  kind: string
  list_price: string
  quantity: string
  list_amount: string
  line_discount: string
  deal_discount_share: string
  total: string
  partner_income: string
  nbs_share: string
  withheld: string
  partner_net: string
  nbs_income: string
  violation: string
  note: string
  pays_commission_on_payment: boolean
}

export interface DealPreview {
  partner: number | null
  is_nbs_direct: boolean
  partner_status?: string
  partner_tier?: string
  product: number
  lines: DealPreviewLine[]
  totals: {
    list_total: string; discount_total: string; total: string; partner_income: string; withheld: string
    nbs_share: string; partner_net: string; nbs_income: string
  }
  needs_approval: boolean
  violations: string[]
}

export interface LedgerCategory {
  id: number
  type: 'income' | 'expense'
  name: string
  is_active: boolean
}

export interface LedgerEntry {
  id: number
  partner: number
  partner_name?: string
  date: string
  type: 'income' | 'expense'
  category: number | null
  category_name?: string | null
  amount: string
  description: string
  product?: number | null
  product_name?: string | null
  cancelled?: boolean
  cancelled_at?: string | null
  cancel_reason?: string
  created_by_name?: string | null
}

export interface LedgerReport {
  period?: { date_from: string; date_to: string }
  partner?: number | null
  sales_income?: {
    total: string
    by_kind: { kind: string; label: string; count: number; amount: string; income: string }[]
    by_product: { product: number; name: string; amount: string; income: string }[]
  }
  other_income?: { total: string; by_category: { category: number; name: string; amount: string }[] }
  expenses?: { total: string; by_category: { category: number; name: string; amount: string }[]; marketing?: string }
  deductions?: { withheld: string; nbs_share: string; total: string }
  profit?: string
  by_month?: { month: string; income?: string; expenses?: string; deductions?: string; profit?: string }[]
}

export interface SphereBlock {
  product: number
  code: string
  sphere: string
  name: string
  sales: { count: number; amount: string; avg_check: string; discounts: string; by_kind: { kind: string; label: string; count: number; amount: string; income: string }[] }
  leads: { total: number; paid: number; conversion_percent: string; by_status: Record<string, number> }
  clients: number
  subscriptions: { active: number; overdue: number; expiring: number }
  subscription_collected: string
  commission: { accrued: string; withheld: string; nbs_share: string }
  ledger: { income: string; expenses: string }
  income: string
}

/** reports/partner-analytics/?partner= (partner обязателен для OZOK) */
export interface PartnerAnalytics {
  partner: { id: number; name: string; status: string; tier: string; region: string }
  period: { date_from: string; date_to: string }
  totals: {
    sales_count: number; sales_amount: string; income: string; discounts: string; withheld: string; nbs_share: string
    commission_accrued: string; commission_paid: string; deals_confirmed: number; deals_discount: string
    leads: { total: number; paid: number; conversion_percent: string; by_status: Record<string, number> }
    subscriptions: { active: number; overdue: number; expiring: number }
    clients: number; profit: string; expenses: string
  }
  spheres: SphereBlock[]
  by_month: { month: string; revenue: string }[]
  network_average?: { sales_count: string; sales_amount: string; partners: number } | null
  quality?: { rating: number | null; place: number | null; sla_breached: number; tickets_open: number }
}

export interface SphereRow {
  partner: number
  name: string
  region: string
  status: string
  tier: string
  sales_count: number
  revenue: string
  subscription_collected: string
  active_subscriptions: number
  overdue_subscriptions: number
  conversion_percent: string
  avg_check: string
  discounts: string
  rating: number | null
  rank: number
}

/** reports/sphere-analytics/?product= (product обязателен) */
export interface SphereAnalytics {
  product: { id: number; code: string; name: string }
  period: { date_from: string; date_to: string }
  participants: number
  rows: SphereRow[]
  nbs_direct?: { name: string; sales_count: number; revenue: string; discounts: string } | null
  top: SphereRow[]
  lagging: SphereRow[]
  totals: { revenue: string; partners_revenue: string; nbs_direct_share_percent: string }
}

// ====== P5: клиенты, филиалы, закрепление ======

export type BranchStatus = 'pending' | 'active' | 'suspended' | 'closed' | string

export interface AssignmentHistory {
  id: number
  branch: number
  branch_name?: string
  client?: number
  client_name?: string
  field: 'service' | 'implementer' | 'responsible' | 'seller' | string
  from_partner: number | null
  from_partner_name?: string | null
  to_partner: number | null
  to_partner_name?: string | null
  reason_code: string
  reason: string
  decided_by?: number | null
  decided_by_name?: string | null
  effective_from: string
  created_at: string
}

export interface SubscriptionBrief {
  id: number
  branch: number | null
  product: number
  product_code: string
  product_name: string
  external_id: string
  status: SubscriptionStatus
  paid_until: string | null
}

export interface Branch {
  id: number
  client: number
  client_name?: string
  name: string
  address: string
  city: string
  region: string
  product: number | null
  product_code?: string | null
  tariff: number | null
  launch_date: string | null
  elqr_account: string | null
  seller_partner: number | null
  implementer_partner: number | null
  implementer_partner_name?: string | null
  responsible_partner: number | null
  support_user: number | null
  is_main: boolean
  status: BranchStatus
  priority_partner: number | null
  priority_deadline: string | null
  priority_accepted_at: string | null
  priority_expired: boolean
  /** Сколько часов осталось на ответ (backend считает сам). */
  priority_hours_left?: number | null
  lead: number | null
  lead_source: string
  /** legacy-клиент: начисляется ли комиссия сопровождающему партнёру (меняет только super_admin). */
  commission_enabled?: boolean
  commission_enabled_from?: string | null
  client_origin?: ClientOrigin
  assignment_history?: AssignmentHistory[]
  subscriptions?: SubscriptionBrief[]
  created_at: string
}

export interface ClientContact {
  id: number
  client: number
  branch: number | null
  full_name: string
  position: string
  phone: string
  email: string
  is_primary: boolean
}

export interface ClientBranchBrief { id: number; name: string; is_main: boolean; status: BranchStatus; product: number | null; elqr_account: string | null }

export interface ClientCard extends Client {
  owner_partner?: number | null
  legal_name?: string
  inn?: string
  region?: string
  branches?: ClientBranchBrief[]
  contacts?: ClientContact[]
  renewal_soon?: boolean
  expired?: boolean
}

// ====== P9: подписки, платежи ======

export type SubscriptionStatus = 'awaiting_payment' | 'active' | 'grace' | 'overdue' | 'restricted' | 'closed'

export interface Subscription {
  id: number
  client: number
  client_name?: string
  franchisee?: number
  franchisee_name?: string
  product: number
  product_code?: string
  product_name?: string
  sphere?: string
  external_id: string
  status: SubscriptionStatus
  paid_until: string | null
  monthly_fee: string | null
  monthly_price?: string | null
  connected_at: string | null
  started_at?: string | null
  closed_at?: string | null
  tariff: number | null
  tariff_name?: string | null
  discount_percent?: string
  renewal_soon?: boolean
  expired?: boolean
  branch: number | null
  branch_name?: string | null
  deal?: number | null
}

export interface SubscriptionPeriod { period: string; expected: string; paid: string; status: 'paid' | 'partial' | 'unpaid' }

export type PaymentSource = 'elqr' | 'product' | 'manual' | 'bank_import'

/** Payment (абонентская оплата). Эндпоинт payments/ — по плану; поля необязательные до появления backend. */
export interface Payment {
  id: number
  branch: number
  branch_name?: string
  subscription?: number | null
  client: number
  client_name?: string
  product?: number
  product_name?: string
  product_code?: string
  currency?: string
  commission_amount?: string
  amount: string
  refunded_amount?: string
  paid_at: string
  period_from?: string | null
  period_to?: string | null
  months?: number
  source: PaymentSource
  external_id?: string
  elqr_account?: string
  purpose?: string
  status: 'confirmed' | 'cancelled' | 'refunded' | 'error' | string
  reconciled_at?: string | null
  reconciled_source?: string
  /** Производная продажа (нужна для возврата). */
  sale?: number | null
  cancelled_at?: string | null
  cancel_reason?: string
}

export interface ImportRow {
  line?: number
  date?: string
  amount?: string
  account?: string
  operation_id?: string
  purpose?: string
  status: 'new' | 'reconcile' | 'duplicate' | 'not_found' | 'invalid' | 'not_authoritative' | 'created' | 'reconciled' | string
  message?: string
  branch?: number | null
  branch_name?: string
  client_name?: string
  payment?: number | null
}

export interface ImportResult { summary: Record<string, number>; rows: ImportRow[] }

// ====== P8: комиссии ======

export type AccrualStatus = 'on_hold' | 'accrued' | 'in_payout' | 'paid' | 'cancelled'

export interface CommissionAccrual {
  id: number
  payment?: number | null
  payment_paid_at?: string | null
  payment_source?: string | null
  rule_name?: string | null
  adjustment_rule_name?: string | null
  fixed_amount?: string
  cancelled_at?: string | null
  cancel_reason?: string
  product_code?: string
  sale?: number | null
  partner: number
  partner_name?: string
  branch?: number
  branch_name?: string
  client?: number
  client_name?: string
  product?: number
  product_name?: string
  date: string
  rate?: string
  base_amount?: string
  adjustment_amount?: string
  partner_tier?: string
  lead_source?: string
  amount: string
  withheld_amount: string
  net_amount?: string
  /** Фактически выплачено по начислению (backend: commission-accruals/). */
  paid_amount?: string
  status: AccrualStatus | string
  reversal_of?: number | null
  reason?: string
  payout?: number | null
  decided_by_name?: string | null
}

export interface Payout {
  id: number
  partner: number
  partner_name?: string
  period: string
  amount: string
  status: 'draft' | 'verified' | 'paid' | 'cancelled' | string
  verified_by?: number | null
  verified_by_name?: string | null
  verified_at?: string | null
  paid_by?: number | null
  paid_by_name?: string | null
  paid_at?: string | null
  paid_date?: string | null
  payment_ref?: string
  comment?: string
  accruals?: { id: number; date: string; amount: string; withheld: string; net: string; reason: string; reversal_of: number | null; branch: number }[]
  cancelled_at?: string | null
  cancel_reason?: string
}

// ====== P6/P7 (backend ещё не опубликован; поля по плану TZ_v3_plan.md, все необязательные) ======

export interface ContractTemplate {
  id: number
  kind: 'manager' | 'franchisee' | 'client' | string
  name: string
  file?: string | null
  is_active: boolean
}

export interface SetupSplitRule {
  id: number
  product: number
  product_name?: string
  total: string
  partner_amount: string
  implementer_amount: string
  implementer_condition?: 'channels_connected_and_confirmed' | 'act_confirmed' | string
  /** Названия каналов, которые подставляются в установку (whatsapp, instagram, facebook, api_telephony). */
  technical_channels?: string[]
  valid_from?: string
  valid_to?: string | null
  is_active: boolean
}

export interface ChecklistTemplate {
  id: number
  product: number
  product_name?: string
  name: string
  items: (string | { item: string })[]
  is_active: boolean
}

export type InstallationStatus = 'assigned' | 'in_progress' | 'training' | 'awaiting_act' | 'done' | 'cancelled'

export interface ChecklistItem { item: string; done: boolean; done_at?: string | null; comment?: string }
export interface TechnicalChannel { channel: 'whatsapp' | 'instagram' | 'facebook' | 'api_telephony' | string; status: 'pending' | 'connected' | 'failed' | string }
export interface InstallationComment { id: number; author_name?: string; text: string; created_at: string }

export interface Installation {
  id: number
  deal?: number | null
  branch?: number | null
  client?: number
  client_name?: string
  product?: number
  product_name?: string
  franchisee?: number
  franchisee_name?: string
  implementer?: number | null
  implementer_name?: string | null
  responsible?: number | null
  started_at?: string
  planned_launch?: string | null
  launched_at?: string | null
  deadline?: string | null
  status: InstallationStatus | string
  stage?: string
  checklist?: ChecklistItem[]
  checklist_progress?: { done: number; total: number }
  training_result?: 'passed' | 'needs_repeat' | '' | null
  client_rating?: number | null
  act_file?: string | null
  act_confirmed_at?: string | null
  client_confirmed_by?: string
  technical_channels?: TechnicalChannel[]
  technical_status?: 'n/a' | 'pending' | 'connected' | 'failed' | string
  implementer_accrual?: { id: number; amount: string; status: string } | null
  note?: string
  overdue?: boolean
}

export interface ImplementerAccrual {
  id: number
  installation: number
  client_name?: string
  product_code?: string
  user: number
  user_name?: string
  amount: string
  sold_amount?: string
  split_rule?: number | null
  status: 'accrued' | 'verified' | 'paid' | string
  verified_by?: number | null
  verified_at?: string | null
  paid_by?: number | null
  paid_at?: string | null
  payment_ref?: string
  created_at?: string
}

export interface EquipmentSale {
  id: number
  franchisee?: number
  client?: number
  client_name?: string
  product?: number
  equipment: number
  equipment_name?: string
  quantity?: number | string
  serial_numbers?: string[]
  sold_by_name?: string | null
  installed_by?: number | null
  installed_by_name?: string | null
  delivery_status: 'ordered' | 'in_stock' | 'delivered' | 'installed' | '' | string
  warranty_until?: string | null
  date?: string
  amount?: string
  deal?: number | null
  cancelled_at?: string | null
}

// ====== Касса (по плану P0+ п.6; backend публикуется позже — поля необязательные) ======

export interface CashAccount {
  id: number
  name: string
  kind: 'cash' | 'bank' | 'elqr' | string
  is_active: boolean
  opening_balance?: string
  opening_date?: string | null
  balance?: string
}

export interface CashCategory {
  id: number
  code?: string
  name: string
  direction: 'in' | 'out'
  is_system?: boolean
  /** Вручную можно вносить только статьи с manual_allowed. */
  manual_allowed?: boolean
  is_active: boolean
  sort_order?: number
}

export interface CashTransaction {
  id: number
  date: string
  account: number
  account_name?: string
  transfer_account?: number | null
  transfer_account_name?: string | null
  direction: 'in' | 'out' | 'transfer'
  amount: string
  category?: number | null
  category_name?: string | null
  category_code?: string | null
  partner?: number | null
  partner_name?: string | null
  client?: number | null
  source_type?: string
  source_id?: number | null
  /** Сторнирующая проводка ссылается на исходную. */
  reversal_of?: number | null
  /** Исходная проводка уже отменена (есть сторно). */
  is_reversed?: boolean
  reversal?: number | null
  comment?: string
  attachment?: string
  is_auto?: boolean
  created_by?: number | null
  created_at?: string
}

export interface NbsExpense {
  id: number
  transaction: CashTransaction
  description: string
  supplier: string
  created_at: string
}

export interface CashReport {
  period?: { date_from: string; date_to: string }
  accounts?: { id: number; name: string; kind?: string; is_active?: boolean; opening: string; closing: string; in: string; out: string; transfer_in: string; transfer_out: string }[]
  opening_total?: string
  closing_total?: string
  total_in?: string
  total_out?: string
  net?: string
  in_by_category?: { category: number; code?: string; name: string; amount: string }[]
  out_by_category?: { category: number; code?: string; name: string; amount: string }[]
  by_month?: { month: string; in: string; out: string; net: string }[]
}

// ====== Сотрудники и доступ (план P0+ п.8; поля необязательные до выхода backend) ======

export type PermLevelMap = Record<string, 'none' | 'read' | 'write'>

export interface AccessRole {
  id: number
  code?: string
  base_role?: string
  name: string
  description?: string
  is_system?: boolean
  permissions?: PermLevelMap
  actions?: string[]
  scope?: 'all' | 'own_region' | 'own_partners' | 'assigned' | string
  users_count?: number
}
