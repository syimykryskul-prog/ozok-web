import {
  Pencil, CircleCheck, CircleX, CircleDot, CircleDashed, Sparkles, UserCheck, MonitorPlay, Trophy, Play, Lock,
  CirclePause, Ban, Hourglass, Rocket, FileText, Wrench, GraduationCap, Inbox, MessageCircle, BadgeCheck, Archive,
  ArrowDown, Minus, ArrowUp, Flame, Handshake, UserPlus, Building2, Clock, FileCheck, Banknote, ShieldCheck, GitPullRequest,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { t } from '../i18n'

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral'
export interface StatusInfo { label: string; tone: Tone; icon: LucideIcon }

/** label - ленивый геттер: подпись берётся из словаря в момент чтения (язык может смениться). */
const S = (key: string, tone: Tone, icon: LucideIcon): StatusInfo => ({ get label() { return t(key) }, tone, icon })


/** Словарь с ленивыми подписями: t('<prefix>.<ключ>') вычисляется при чтении. */
function lazyDict(prefix: string, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {}
  for (const k of keys) Object.defineProperty(o, k, { enumerable: true, get: () => t(prefix + '.' + k) })
  return o
}
const lt = (key: string, tone: Tone) => ({ get label() { return t(key) }, tone })
/** Подмножество словаря с теми же ленивыми подписями. */
function pick(d: Record<string, string>, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {}
  for (const k of keys) Object.defineProperty(o, k, { enumerable: true, get: () => d[k] })
  return o
}

export type StatusKind =
  | 'franchisee' | 'subscription' | 'accrual' | 'payout' | 'paySource' | 'sub' | 'invoice' | 'payment' | 'lead' | 'contract' | 'ticket' | 'priority' | 'taskPriority' | 'task' | 'enrollment' | 'stage' | 'deal' | 'reward' | 'changeRequest' | 'frPayment'

export const STATUS: Record<StatusKind, Record<string, StatusInfo>> = {
  franchisee: {
    candidate: S('status.franchisee.candidate', 'neutral', UserPlus),
    trainee: S('status.franchisee.trainee', 'info', GraduationCap),
    manager: S('status.franchisee.manager', 'info', UserCheck),
    franchisee: S('status.franchisee.franchisee', 'success', CircleCheck),
    onboarding: S('status.franchisee.onboarding', 'info', Hourglass),
    active: S('status.franchisee.active', 'success', CircleCheck),
    suspended: S('status.franchisee.suspended', 'warning', CirclePause),
    closed: S('status.franchisee.closed', 'error', Ban),
    terminated: S('status.franchisee.terminated', 'error', Ban),
  },
  subscription: {
    awaiting_payment: S('status.subscription.awaiting_payment', 'neutral', Hourglass),
    active: S('status.subscription.active', 'success', CircleCheck),
    grace: S('status.subscription.grace', 'warning', Clock),
    overdue: S('status.subscription.overdue', 'error', CircleX),
    restricted: S('status.subscription.restricted', 'error', Lock),
    closed: S('status.subscription.closed', 'neutral', Ban),
  },
  accrual: {
    on_hold: S('status.accrual.on_hold', 'warning', CirclePause),
    accrued: S('status.accrual.accrued', 'info', Clock),
    in_payout: S('status.accrual.in_payout', 'info', Hourglass),
    paid: S('status.accrual.paid', 'success', BadgeCheck),
    cancelled: S('status.accrual.cancelled', 'neutral', Ban),
  },
  payout: {
    draft: S('status.payout.draft', 'neutral', Pencil),
    verified: S('status.payout.verified', 'info', ShieldCheck),
    paid: S('status.payout.paid', 'success', BadgeCheck),
    cancelled: S('status.payout.cancelled', 'neutral', Ban),
  },
  paySource: {
    elqr: S('status.paySource.elqr', 'info', Banknote),
    product: S('status.paySource.product', 'info', Banknote),
    manual: S('status.paySource.manual', 'neutral', Pencil),
    bank_import: S('status.paySource.bank_import', 'neutral', FileText),
  },
  sub: {
    active: S('status.sub.active', 'success', CircleCheck),
    paused: S('status.sub.paused', 'warning', CirclePause),
    cancelled: S('status.sub.cancelled', 'neutral', Ban),
  },
  invoice: {
    pending: S('status.invoice.pending', 'warning', Hourglass),
    paid: S('status.invoice.paid', 'success', BadgeCheck),
    cancelled: S('status.invoice.cancelled', 'neutral', Ban),
  },
  payment: {
    created: S('status.payment.created', 'info', Clock),
    succeeded: S('status.payment.succeeded', 'success', CircleCheck),
    failed: S('status.payment.failed', 'error', CircleX),
  },
  lead: {
    new: S('status.lead.new', 'info', Sparkles),
    assigned: S('status.lead.assigned', 'warning', UserCheck),
    in_progress: S('status.lead.in_progress', 'info', CircleDot),
    demo: S('status.lead.demo', 'info', MonitorPlay),
    proposal: S('status.lead.proposal', 'info', FileText),
    contract: S('status.lead.contract', 'info', FileCheck),
    paid: S('status.lead.paid', 'success', Banknote),
    won: S('status.lead.won', 'success', Trophy),
    lost: S('status.lead.lost', 'error', CircleX),
  },
  contract: {
    draft: S('status.contract.draft', 'neutral', Pencil),
    active: S('status.contract.active', 'success', CircleCheck),
    closed: S('status.contract.closed', 'neutral', Lock),
  },
  ticket: {
    open: S('status.ticket.open', 'warning', Inbox),
    in_progress: S('status.ticket.in_progress', 'info', CircleDot),
    resolved: S('status.ticket.resolved', 'success', BadgeCheck),
    closed: S('status.ticket.closed', 'neutral', Archive),
  },
  priority: {
    low: S('status.priority.low', 'neutral', ArrowDown),
    normal: S('status.priority.normal', 'info', Minus),
    high: S('status.priority.high', 'warning', ArrowUp),
    critical: S('status.priority.critical', 'error', Flame),
  },
  taskPriority: {
    low: S('status.taskPriority.low', 'neutral', ArrowDown),
    normal: S('status.taskPriority.normal', 'info', Minus),
    high: S('status.taskPriority.high', 'warning', ArrowUp),
  },
  task: {
    new: S('status.task.new', 'info', Sparkles),
    in_progress: S('status.task.in_progress', 'warning', Play),
    done: S('status.task.done', 'success', CircleCheck),
    rejected: S('status.task.rejected', 'error', CircleX),
    cancelled: S('status.task.cancelled', 'neutral', Ban),
  },
  enrollment: {
    assigned: S('status.enrollment.assigned', 'info', GraduationCap),
    in_progress: S('status.enrollment.in_progress', 'warning', Play),
    passed: S('status.enrollment.passed', 'success', BadgeCheck),
    failed: S('status.enrollment.failed', 'error', CircleX),
  },
  stage: {
    contract: S('status.stage.contract', 'info', FileText),
    setup: S('status.stage.setup', 'warning', Wrench),
    training: S('status.stage.training', 'info', GraduationCap),
    launched: S('status.stage.launched', 'success', Rocket),
    cancelled: S('status.stage.cancelled', 'neutral', CircleX),
  },
  deal: {
    draft: S('status.deal.draft', 'neutral', Pencil),
    pending_approval: S('status.deal.pending_approval', 'warning', Hourglass),
    confirmed: S('status.deal.confirmed', 'success', CircleCheck),
    cancelled: S('status.deal.cancelled', 'neutral', Ban),
  },
  reward: {
    accruing: S('status.reward.accruing', 'info', Hourglass),
    accrued: S('status.reward.accrued', 'warning', Clock),
    verified: S('status.reward.verified', 'info', ShieldCheck),
    paid: S('status.reward.paid', 'success', BadgeCheck),
    cancelled: S('status.reward.cancelled', 'neutral', Ban),
  },
  changeRequest: {
    pending: S('status.changeRequest.pending', 'warning', GitPullRequest),
    approved: S('status.changeRequest.approved', 'success', CircleCheck),
    rejected: S('status.changeRequest.rejected', 'error', CircleX),
  },
  frPayment: {
    pending: S('status.frPayment.pending', 'warning', Hourglass),
    confirmed: S('status.frPayment.confirmed', 'success', CircleCheck),
    cancelled: S('status.frPayment.cancelled', 'neutral', Ban),
  },
}

export const statusInfo = (kind: StatusKind, v: string): StatusInfo | undefined => STATUS[kind][v]
export const statusLabel = (kind: StatusKind, v: string): string => STATUS[kind][v]?.label ?? v
export const statusOptions = (kind: StatusKind) => Object.entries(STATUS[kind]).map(([value, s]) => ({ value, label: s.label }))

export const ICON_FALLBACK = { Handshake, Building2, Clock, CircleDashed, MessageCircle }

export const dictOptions = (d: Record<string, string>) => Object.entries(d).map(([value, label]) => ({ value, label }))

export const ROLES: Record<string, string> = lazyDict('role', ['super_admin', 'network_head', 'recruiter', 'regional_support', 'implementer', 'finance', 'quality', 'franchisee', 'franchisee_staff', 'manager', 'hq_admin', 'hq_curator', 'hq_accountant', 'fr_owner', 'fr_manager'])
export const NBS_ROLE_OPTIONS: Record<string, string> = pick(ROLES, ['super_admin', 'network_head', 'recruiter', 'regional_support', 'implementer', 'finance', 'quality'])
export const FR_ROLES: Record<string, string> = pick(ROLES, ['franchisee', 'franchisee_staff', 'manager'])
export const ALL_NEW_ROLES: Record<string, string> = pick(ROLES, ['super_admin', 'network_head', 'recruiter', 'regional_support', 'implementer', 'finance', 'quality', 'franchisee', 'franchisee_staff', 'manager'])

export const PARTNER_TIERS: Record<string, string> = lazyDict('st.PARTNER_TIERS', ['standard', 'growth'])
export const CERT_RESULTS: Record<string, string> = lazyDict('st.CERT_RESULTS', ['passed', 'failed'])
export const FUNNEL_STAGES: Record<string, string> = lazyDict('st.FUNNEL_STAGES', ['new_application', 'interview', 'training', 'exam', 'manager', 'first_sale', 'second_sale', 'third_sale', 'franchise_contract', 'activated'])
export const CANDIDATE_SOURCES: Record<string, string> = lazyDict('st.CANDIDATE_SOURCES', ['instagram', 'referral', 'site', 'event', 'other'])
export const ACTIVITY_TYPES: Record<string, string> = lazyDict('st.ACTIVITY_TYPES', ['call', 'meeting', 'demo', 'proposal', 'note', 'status', 'reassign', 'change_request'])
export const SUB_STATUS_TONE: Record<string, Tone> = Object.fromEntries(Object.entries(STATUS.subscription).map(([k, v]) => [k, v.tone]))
export const BRANCH_STATUS: Record<string, { label: string; tone: Tone }> = { pending: lt('st.BRANCH_STATUS.pending', 'warning'), active: lt('st.BRANCH_STATUS.active', 'success'), suspended: lt('st.BRANCH_STATUS.suspended', 'warning'), closed: lt('st.BRANCH_STATUS.closed', 'neutral') }
export const BRANCH_REASONS: Record<string, string> = lazyDict('st.BRANCH_REASONS', ['no_response', 'no_crm_activity', 'install_overdue', 'confirmed_complaint', 'accepted', 'partner_closed', 'other'])
export const IMPORT_ROW_STATUS: Record<string, { label: string; tone: Tone }> = { new: lt('st.IMPORT_ROW_STATUS.new', 'success'), reconcile: lt('st.IMPORT_ROW_STATUS.reconcile', 'info'), created: lt('st.IMPORT_ROW_STATUS.created', 'success'), reconciled: lt('st.IMPORT_ROW_STATUS.reconciled', 'info'), duplicate: lt('st.IMPORT_ROW_STATUS.duplicate', 'warning'), not_found: lt('st.IMPORT_ROW_STATUS.not_found', 'error'), invalid: lt('st.IMPORT_ROW_STATUS.invalid', 'error'), not_authoritative: lt('st.IMPORT_ROW_STATUS.not_authoritative', 'neutral') }
export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = { confirmed: lt('st.PAYMENT_STATUS.confirmed', 'success'), cancelled: lt('st.PAYMENT_STATUS.cancelled', 'neutral'), refunded: lt('st.PAYMENT_STATUS.refunded', 'warning'), error: lt('st.PAYMENT_STATUS.error', 'error') }
export const LEDGER_TYPES: Record<string, string> = lazyDict('st.LEDGER_TYPES', ['income', 'expense'])
export const DEAL_LINE_KINDS: Record<string, string> = lazyDict('st.DEAL_LINE_KINDS', ['setup', 'training', 'equipment', 'subscription'])
export const CR_FIELDS: Record<string, string> = lazyDict('st.CR_FIELDS', ['source', 'franchisee', 'implementer'])
export const AUDIT_ACTIONS: Record<string, string> = lazyDict('st.AUDIT_ACTIONS', ['create', 'update', 'cancel', 'status', 'login', 'login_failed', 'export', 'approve', 'reject'])
export const REGIONS: Record<string, string> = lazyDict('st.REGIONS', ['bishkek', 'chui', 'osh', 'jalalabad', 'batken', 'naryn', 'issykkul', 'talas'])

export const LEAD_SOURCES: Record<string, string> = lazyDict('st.LEAD_SOURCES', ['nbs_ads', 'partner_ads', 'instagram', 'whatsapp', 'referral', 'site', 'inbound_call', 'offline', 'other', 'phone'])
export const LEAD_INTERESTS: Record<string, string> = lazyDict('st.LEAD_INTERESTS', ['program', 'franchise', 'consult'])
export const BUSINESS_TYPES: Record<string, string> = lazyDict('st.BUSINESS_TYPES', ['shop', 'wholesale', 'services', 'cafe', 'other'])
export const SCHEMES: Record<string, string> = lazyDict('st.SCHEMES', ['cash', 'prepay', 'per_sale', 'hybrid'])
export const SALE_KINDS: Record<string, string> = lazyDict('st.SALE_KINDS', ['setup', 'equipment', 'subscription', 'renewal', 'other'])
export const CHARGE_KINDS: Record<string, string> = lazyDict('st.CHARGE_KINDS', ['fee', 'installment', 'withhold', 'nbs_lead_share', 'other'])
export const PAY_METHODS: Record<string, string> = lazyDict('st.PAY_METHODS', ['cash', 'bank', 'offset'])
export const PRIORITIES: Record<string, string> = lazyDict('status.priority', Object.keys(STATUS.priority))

export const RULE_KINDS: Record<string, string> = lazyDict('st.RULE_KINDS', ['subscription', 'setup', 'equipment', 'other'])
export const FIXED_PER: Record<string, string> = lazyDict('st.FIXED_PER', ['sale', 'month'])
export const FRANCHISE_SOURCES = LEAD_SOURCES
export const RULE_BASE: Record<string, string> = lazyDict('st.RULE_BASE', ['paid', 'list'])
