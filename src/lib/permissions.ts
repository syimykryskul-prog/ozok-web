/** Роли по ТЗ OZOK §3. Старые коды поддерживаются до переключения бэкенда. */
export type Role =
  | 'super_admin' | 'network_head' | 'recruiter' | 'regional_support' | 'implementer'
  | 'finance' | 'quality' | 'franchisee' | 'franchisee_staff' | 'manager'
export type LegacyRole = 'hq_admin' | 'hq_curator' | 'hq_accountant' | 'fr_owner' | 'fr_manager'

const LEGACY: Record<string, Role> = {
  hq_admin: 'super_admin', hq_curator: 'network_head', hq_accountant: 'finance', fr_owner: 'franchisee', fr_manager: 'franchisee_staff',
}

export function normRole(role: string | undefined | null): Role | '' {
  if (!role) return ''
  return (LEGACY[role] ?? role) as Role
}

const NBS_ROLES: Role[] = ['super_admin', 'network_head', 'recruiter', 'regional_support', 'implementer', 'finance', 'quality']
/** Сотрудник OZOK (не партнёр). */
export function isNbsRole(role: string | undefined | null): boolean {
  return NBS_ROLES.includes(normRole(role) as Role)
}
export function isPartnerRole(role: string | undefined | null): boolean {
  const r = normRole(role)
  return r === 'franchisee' || r === 'franchisee_staff' || r === 'manager'
}

const SA: Role = 'super_admin'
const NH: Role = 'network_head'
const RC: Role = 'recruiter'
const RG: Role = 'regional_support'
const IM: Role = 'implementer'
const FN: Role = 'finance'
const QL: Role = 'quality'
const FR: Role = 'franchisee'
const ST: Role = 'franchisee_staff'
const MG: Role = 'manager'

// Доступ к разделам меню (ТЗ OZOK §3)
export const ACCESS = {
  dashboard: [SA, NH, FN, FR, ST, MG],
  franchisees: [SA, NH, RC, RG, FN, QL],
  candidates: [SA, NH, RC],
  recruiters: [SA, NH, FN, RC],
  contracts: [SA, NH, FN],
  leads: [SA, NH, RG, FN, FR, ST, MG],
  clients: [SA, NH, RG, IM, FN, QL, FR, ST, MG],
  implementations: [SA, NH, RG, IM, FN, QL, FR, ST, MG],
  sales: [SA, NH, FN, FR, ST, MG],
  ledger: [SA, NH, FN, FR],
  settlements: [SA, NH, FN, FR],
  training: [SA, NH, RG, FN, QL, FR, ST, MG],
  quality: [SA, NH, RG, FN, QL, FR, ST, MG],
  plans: [SA, NH, FN, QL],
  tasks: [SA, NH, RG, FN, QL, FR, ST, MG],
  settings: [SA, NH, FN],
  integrations: [SA, NH, FN],
  storefront: [FR, ST, MG],
  terms: [FR, ST, MG],
  team: [FR],
  analytics: [SA, NH, FN, QL, FR],
  subscriptions: [SA, NH, RG, FN, QL, FR, ST, MG],
  commissions: [SA, NH, FN, FR],
  cash: [SA, NH, FN, FR],
  installations: [SA, NH, RG, IM, FN, QL, FR, ST, MG],
  audit: [SA, FN],
  changeRequests: [SA, NH],
  profile: [SA, NH, RC, RG, IM, FN, QL, FR, ST, MG],
} satisfies Record<string, Role[]>

export type Section = keyof typeof ACCESS

// Права на изменение
export const WRITE = {
  franchisees: [SA, NH],
  partnerStatus: [SA, NH],
  partnerPersonal: [SA, FN],
  candidates: [SA, NH],
  contracts: [SA, FN],
  leadAssign: [SA, NH],
  leadActions: [SA, NH, FR, ST, MG],
  leadCreate: [SA, NH, FR, ST, MG],
  leadConfirmOwner: [SA, NH],
  changeRequestDecide: [SA, NH],
  clientsWrite: [SA, FR, ST, MG],
  dealCreate: [SA, NH, FR, ST, MG],
  dealConfirm: [SA, NH, FR, ST, MG],
  dealCancel: [SA, NH, FR, ST, MG],
  salesWrite: [SA, NH, FR, ST, MG],
  salesAdjust: [SA, FN],
  ledgerWrite: [SA, FR],
  money: [SA, FN],
  payoutVerify: [SA, FN],
  payoutPay: [SA, FN],
  recruiterRewards: [SA, FN],
  settingsWrite: [SA],
  settingsFinance: [SA, FN],
  courses: [SA, NH],
  enrollCreate: [SA, NH, FR],
  enrollComplete: [SA, NH],
  enrollStart: [FR, ST, MG],
  ticketsWrite: [SA, NH, RG, QL, FR, ST],
  audits: [SA, NH, QL],
  plans: [SA, NH],
  taskCreate: [SA, NH],
  taskActions: [FR, ST, MG],
  users: [SA],
  integrationsResolve: [SA, NH],
  branchReassign: [SA, NH],
  branchElqr: [SA, NH, RG],
  contactsWrite: [SA, NH, RG, FR, ST, MG],
  paymentsWrite: [SA, FN],
  cashWrite: [SA, FN],
  installationsWrite: [SA, NH, RG, IM, FR, ST, MG],
  implementerAccruals: [SA, NH, FN, IM],
  paymentsView: [SA, NH, RG, FN, FR],
  payoutCreate: [SA, FN],
  payoutCancel: [SA, FN],
  accrualDecide: [SA, FN],
  paymentCancel: [SA, FN],
  paymentRefund: [SA, FN],
  paymentImport: [SA, FN],
  cashCancel: [SA, FN],
  cashAccountWrite: [SA, FN],
  cashCategoryWrite: [SA],
  rewardVerify: [SA, FN],
  rewardPay: [SA, FN],
  implementerPay: [SA, FN],
  branchAccept: [SA, FR],
  branchesWrite: [SA, NH, RG, FR],
  subscriptionClose: [SA, NH, FN],
  franchiseeClose: [SA, NH],
  installChannels: [SA, NH, RG, IM],
  installCreate: [SA, NH, RG, FR, ST, MG],
  catalogTemplates: [SA],
  catalogSplit: [SA],
  catalogContracts: [SA],
  accessRoles: [SA],
  usersInvite: [SA, FR],
  exportData: [SA, FN],
  connectRequest: [FR, ST],
  equipmentEdit: [SA, NH, RG, FR, ST, MG],
  legacyClients: [SA, FN],
  markDealPaid: [SA, FN],
  franchiseeReopen: [SA],
  legacyCommission: [SA],
} satisfies Record<string, Role[]>

export type WriteKey = keyof typeof WRITE

export function canAccess(role: string | undefined, section: Section): boolean {
  const eff = canAccessEff(section)
  if (eff !== null) return eff
  const r = normRole(role)
  return !!r && (ACCESS[section] as string[]).includes(r)
}

export function canWrite(role: string | undefined, key: WriteKey): boolean {
  const eff = canWriteEff(key)
  if (eff !== null) return eff
  const r = normRole(role)
  return !!r && (WRITE[key] as string[]).includes(r)
}

/** Защищённые поля (паспорт, ИНН) видят только super_admin и finance. */
export const canSeePersonal = (role: string | undefined) => canWrite(role, 'partnerPersonal')

// ====== Итоговые права из auth/me/ ======
// me.permissions — ресурс → none|read|write; me.modules — раздел меню → уровень;
// me.actions — защищённые действия вида «resource.action» (+ имена групп особых прав).
// Пока me не загружен, работают таблицы ролей выше.

export type PermLevel = 'none' | 'read' | 'write'
export interface Effective {
  role?: string
  permissions?: Record<string, PermLevel>
  modules?: Record<string, PermLevel>
  actions?: string[]
}
interface EffState { role: string; resources: Record<string, PermLevel>; modules: Record<string, PermLevel>; actions: string[] }

let EFF: EffState | null = null

export function setEffective(u: Effective | null | undefined): void {
  const mods = u?.modules && Object.keys(u.modules).length ? u.modules : null
  EFF = mods ? { role: u?.role ?? '', resources: u?.permissions ?? {}, modules: mods, actions: u?.actions ?? [] } : null
}
export const hasEffective = (): boolean => EFF !== null

/** Особые права веба = группы защищённых действий backend (core/access.py ACTION_GROUPS). */
export const ACTION_GROUPS: Record<string, string[]> = {
  approve_discounts: ['deals.approve'],
  approve_lead_changes: ['change_requests.approve', 'change_requests.reject', 'leads.confirm_owner', 'leads.assign'],
  verify_payouts: ['payouts.verify', 'recruiter_rewards.verify', 'implementer_accruals.verify'],
  pay_payouts: ['payouts.pay', 'recruiter_rewards.pay', 'implementer_accruals.pay'],
  cancel_financial: ['charges.cancel', 'payments.cancel', 'commission_payouts.cancel', 'subscription_payments.cancel', 'cash_transactions.cancel', 'client_sales.cancel', 'recruiter_rewards.cancel'],
  change_prices_rules: ['franchise_offers.create', 'franchise_offers.update', 'franchise_offers.partial_update', 'setup_split_rules.create', 'setup_split_rules.update', 'setup_split_rules.partial_update', 'checklist_templates.create', 'contract_templates.create'],
  manage_partner_status: ['franchisees.close', 'partner_history.create', 'franchisees.update', 'franchisees.partial_update', 'franchisees.create'],
  manage_users: ['users.create', 'users.update', 'users.partial_update', 'users.destroy', 'users.invite', 'users.deactivate', 'users.activate', 'users.reset_password'],
  view_personal_data: [],
  export: [],
}

/** Есть ли действие: dotted-ключ «resource.action» или имя группы (достаточно любого ключа группы). */
export function hasAction(key: string): boolean | null {
  if (!EFF) return null
  const acts = EFF.actions
  if (acts.includes(key)) return true
  return (ACTION_GROUPS[key] ?? []).some((k) => acts.includes(k))
}

const rank = (l?: PermLevel) => (l === 'write' ? 2 : l === 'read' ? 1 : 0)

/** Уровень доступа к ресурсу API (core/access.py MODULES перечисляет ресурсы по разделам). */
export function resourceLevel(resource: string): PermLevel | null {
  if (!EFF) return null
  return EFF.role === 'super_admin' ? 'write' : EFF.resources[resource] ?? 'none'
}
export const canRead = (resource: string): boolean => rank(resourceLevel(resource) ?? 'read') >= 1
export const canWriteResource = (resource: string): boolean | null => (EFF ? rank(resourceLevel(resource) ?? 'none') >= 2 : null)

/** Раздел меню → модули матрицы прав (доступ, если хоть один модуль ≥ «просмотр»). */
export const SECTION_MODULE: Partial<Record<Section, string | string[]>> = {
  dashboard: 'dashboard', franchisees: 'partners', candidates: 'candidates', recruiters: 'recruiters', contracts: 'franchise_contracts',
  leads: 'leads', clients: 'clients', implementations: 'installations', installations: 'installations', sales: 'sales',
  ledger: ['reports', 'cash'], settlements: ['cash_partners', 'cash'], commissions: ['payouts', 'cash'], cash: ['cash', 'cash_partners', 'payouts'],
  subscriptions: 'clients', training: 'training', quality: 'quality',
  plans: 'plans_rating', tasks: 'tasks', settings: 'settings', integrations: 'integrations', team: 'users', analytics: 'dashboard',
  audit: 'audit_log', changeRequests: 'approvals',
}

/** Кнопка/действие → `action` (dotted-ключ или группа), `resource` (нужен «Изменение») или `module`. */
export const WRITE_MAP: Partial<Record<WriteKey, { module?: string; resource?: string; action?: string }>> = {
  franchisees: { action: 'franchisees.update' }, partnerStatus: { action: 'manage_partner_status' }, partnerPersonal: { action: 'view_personal_data' },
  candidates: { action: 'partner_history.create' }, contracts: { resource: 'contracts' },
  leadAssign: { action: 'leads.assign' }, leadActions: { resource: 'leads' }, leadCreate: { resource: 'leads' }, leadConfirmOwner: { action: 'leads.confirm_owner' },
  changeRequestDecide: { action: 'change_requests.approve' },
  clientsWrite: { resource: 'clients' }, dealCreate: { resource: 'deals' }, dealConfirm: { resource: 'deals' }, dealCancel: { resource: 'deals' },
  salesWrite: { resource: 'deals' }, salesAdjust: { action: 'client_sales.recalculate' }, ledgerWrite: { resource: 'ledger' }, money: { resource: 'payments' },
  payoutVerify: { action: 'payouts.verify' }, payoutPay: { action: 'payouts.pay' }, payoutCreate: { action: 'payouts.create' }, payoutCancel: { action: 'payouts.cancel' },
  recruiterRewards: { action: 'recruiter_rewards.verify' }, rewardVerify: { action: 'recruiter_rewards.verify' }, rewardPay: { action: 'recruiter_rewards.pay' },
  implementerAccruals: { action: 'implementer_accruals.verify' }, implementerPay: { action: 'implementer_accruals.pay' },
  courses: { resource: 'courses' }, enrollCreate: { resource: 'enrollments' }, enrollComplete: { action: 'enrollments.complete' }, enrollStart: { action: 'enrollments.start' },
  ticketsWrite: { resource: 'tickets' }, audits: { resource: 'audits' }, plans: { resource: 'sales_plans' },
  taskCreate: { action: 'tasks.create' }, taskActions: { action: 'tasks.start' }, users: { resource: 'users' }, usersInvite: { action: 'users.invite' },
  integrationsResolve: { action: 'integration_events.resolve' }, installationsWrite: { resource: 'installations' }, installChannels: { action: 'installations.channels' },
  installCreate: { action: 'installations.create' },
  cashWrite: { action: 'cash_transactions.create' }, cashCancel: { action: 'cash_transactions.cancel' }, cashAccountWrite: { action: 'cash_accounts.create' }, cashCategoryWrite: { action: 'cash_categories.create' },
  paymentsWrite: { action: 'subscription_payments.create' }, paymentCancel: { action: 'subscription_payments.cancel' }, paymentRefund: { action: 'subscription_payments.refund' },
  paymentImport: { action: 'subscription_payments.import_confirm' }, paymentsView: { resource: 'subscription_payments' },
  accrualDecide: { action: 'commission_accruals.release' },
  branchReassign: { action: 'branches.reassign' }, branchElqr: { action: 'branches.elqr_account' }, branchAccept: { action: 'branches.accept' }, branchesWrite: { action: 'branches.create' },
  contactsWrite: { resource: 'client_contacts' }, subscriptionClose: { action: 'subscriptions.close' }, franchiseeClose: { action: 'franchisees.close' },
  catalogTemplates: { action: 'checklist_templates.create' }, catalogSplit: { action: 'setup_split_rules.create' }, catalogContracts: { action: 'contract_templates.create' }, accessRoles: { action: 'access_roles.create' }, exportData: { action: 'export' }, legacyClients: { action: 'legacy_clients.create' }, markDealPaid: { action: 'deals.mark_paid' }, franchiseeReopen: { action: 'franchisees.reopen' }, legacyCommission: { action: 'branches.commission_switch' }, connectRequest: { action: 'products.connect_request' }, equipmentEdit: { action: 'equipment_sales.partial_update' },
}

/** Главный ресурс страницы: раздел меню не показывается, если он не читается (иначе страница получит 403). */
const SECTION_RESOURCE: Partial<Record<Section, string>> = {
  dashboard: 'dashboard', franchisees: 'franchisees', candidates: 'partner_history', recruiters: 'recruiter_rewards', contracts: 'contracts', leads: 'leads',
  clients: 'clients', implementations: 'installations', installations: 'installations', sales: 'deals', subscriptions: 'subscriptions', training: 'courses',
  quality: 'tickets', plans: 'sales_plans', tasks: 'tasks', settings: 'settings', integrations: 'integration_events', audit: 'audit_log',
  changeRequests: 'change_requests', terms: 'contracts', storefront: 'products',
}

export function canAccessEff(section: Section): boolean | null {
  if (!EFF) return null
  if (section === 'profile') return true
  if (section === 'team') return hasAction('users.invite') === true // «Команда» — только владелец франчайзи
  const res = SECTION_RESOURCE[section]
  if (res && EFF.role !== 'super_admin' && rank(EFF.resources[res]) < 1) return false
  const m = SECTION_MODULE[section]
  if (!m) return res ? true : null
  return (Array.isArray(m) ? m : [m]).some((k) => rank(EFF!.modules[k]) >= 1)
}

/** Итоговое право по me. Для действий — строго по `actions` backend (без запасных вариантов по роли). */
export function canWriteEff(key: WriteKey): boolean | null {
  if (!EFF) return null
  const m = WRITE_MAP[key]
  if (!m) return null
  if (m.action) {
    // флаги без защищённых действий backend: персональные данные скрывает сериализатор по роли, экспорт — флаг интерфейса
    if (m.action === 'view_personal_data') return EFF.actions.includes(m.action) || EFF.role === 'super_admin' || EFF.role === 'finance'
    if (m.action === 'export') return EFF.actions.includes(m.action) || EFF.role === 'super_admin' || EFF.role === 'finance'
    return hasAction(m.action)
  }
  if (m.resource) return canWriteResource(m.resource)
  return rank(EFF.modules[m.module as string]) >= 2
}
