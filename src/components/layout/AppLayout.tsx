import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, FileSignature, Inbox, Users, Rocket, Wallet, GraduationCap, ShieldCheck, Trophy,
  ListChecks, Settings, Plug, ScrollText, ShoppingBag, LifeBuoy, UsersRound, Menu, X, LogOut, Search, UserPlus, Award, History,
  GitPullRequest, UserCog, CreditCard, Sparkles, ChevronDown, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { logout } from '../../features/auth/authSlice'
import { useMeQuery } from '../../features/auth/authApi'
import { useList } from '../../api/hooks'
import { canAccess, isNbsRole, setEffective } from '../../lib/permissions'
import type { Section } from '../../lib/permissions'
import { ROLES } from '../../lib/status'
import { Logo } from './Logo'
import { useT } from '../../i18n'
import { ThemeToggle } from '../../features/ui/ThemeToggle'
import { LangSwitch } from '../../features/ui/LangSwitch'

type BadgeKey = 'approvals' | 'leads' | 'payouts' | 'tasks' | 'tickets'
interface NavItem { to: string; label: string; icon: LucideIcon; section: Section; end?: boolean; badge?: BadgeKey; partnerLabel?: string }
interface NavGroup { id: string; title: string; items: NavItem[] }

const NBS_GROUPS: NavGroup[] = [
  { id: 'main', title: 'nav.n1', items: [{ to: '/', label: 'nav.n2', icon: LayoutDashboard, section: 'dashboard', end: true }] },
  { id: 'sales', title: 'nav.n3', items: [
    { to: '/leads', label: 'nav.n4', icon: Inbox, section: 'leads', badge: 'leads' },
    { to: '/sales', label: 'nav.n3', icon: ShoppingBag, section: 'sales' },
    { to: '/clients', label: 'nav.n5', icon: Users, section: 'clients' },
    { to: '/subscriptions', label: 'nav.n6', icon: CreditCard, section: 'subscriptions' },
    { to: '/installations', label: 'nav.n7', icon: Rocket, section: 'installations' },
  ] },
  { id: 'money', title: 'nav.n8', items: [{ to: '/cash', label: 'nav.n9', icon: Wallet, section: 'cash', badge: 'payouts' }] },
  { id: 'partners', title: 'nav.n10', items: [
    { to: '/candidates', label: 'nav.n11', icon: UserPlus, section: 'candidates' },
    { to: '/franchisees', label: 'nav.n10', icon: Building2, section: 'franchisees' },
    { to: '/recruiters', label: 'nav.n12', icon: Award, section: 'recruiters' },
    { to: '/contracts', label: 'nav.n13', icon: FileSignature, section: 'contracts' },
  ] },
  { id: 'work', title: 'nav.n14', items: [
    { to: '/tasks', label: 'nav.n15', icon: ListChecks, section: 'tasks' },
    { to: '/quality', label: 'nav.n16', icon: ShieldCheck, section: 'quality' },
    { to: '/training', label: 'nav.n17', icon: GraduationCap, section: 'training' },
    { to: '/plans', label: 'nav.n18', icon: Trophy, section: 'plans' },
  ] },
  { id: 'system', title: 'nav.n19', items: [
    { to: '/change-requests', label: 'nav.n20', icon: GitPullRequest, section: 'changeRequests', badge: 'approvals' },
    { to: '/integrations', label: 'nav.n21', icon: Plug, section: 'integrations' },
    { to: '/audit', label: 'nav.n22', icon: History, section: 'audit' },
    { to: '/settings', label: 'nav.n23', icon: Settings, section: 'settings' },
  ] },
]

const PARTNER_GROUPS: NavGroup[] = [
  { id: 'main', title: 'nav.n1', items: [{ to: '/', label: 'nav.n24', icon: LayoutDashboard, section: 'dashboard', end: true }] },
  { id: 'sales', title: 'nav.n3', items: [
    { to: '/leads', label: 'nav.n4', icon: Inbox, section: 'leads', badge: 'leads' },
    { to: '/sales', label: 'nav.n3', icon: ShoppingBag, section: 'sales' },
    { to: '/clients', label: 'nav.n5', icon: Users, section: 'clients' },
    { to: '/subscriptions', label: 'nav.n6', icon: CreditCard, section: 'subscriptions' },
    { to: '/installations', label: 'nav.n7', icon: Rocket, section: 'installations' },
  ] },
  { id: 'money', title: 'nav.n8', items: [{ to: '/cash', label: 'nav.n9', icon: Wallet, section: 'cash' }] },
  { id: 'work', title: 'nav.n25', items: [
    { to: '/tasks', label: 'nav.n15', icon: ListChecks, section: 'tasks', badge: 'tasks' },
    { to: '/quality', label: 'nav.n26', icon: LifeBuoy, section: 'quality', badge: 'tickets' },
    { to: '/training', label: 'nav.n17', icon: GraduationCap, section: 'training' },
  ] },
  { id: 'biz', title: 'nav.n27', items: [
    { to: '/terms', label: 'nav.n28', icon: ScrollText, section: 'terms' },
    { to: '/spheres', label: 'nav.n29', icon: Sparkles, section: 'storefront' },
    { to: '/team', label: 'nav.n30', icon: UsersRound, section: 'team' },
  ] },
]

const COLLAPSE_KEY = 'ozok.nav.collapsed'
function loadCollapsed(): string[] {
  try { const v = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

/** Счётчики «ждёт действия» из существующих списков (page_size=1). */
function useNavCounts(role: string | undefined, partner: boolean): Partial<Record<BadgeKey, number>> {
  const can = (s: Section) => canAccess(role, s)
  const approvals = useList<unknown>('change-requests/', { status: 'pending', page_size: 1 }, { skip: partner || !can('changeRequests') })
  const leads = useList<unknown>('leads/', { overdue: true, page_size: 1 }, { skip: !can('leads') })
  const draft = useList<unknown>('payouts/', { status: 'draft', page_size: 1 }, { skip: partner || !can('cash') })
  const verified = useList<unknown>('payouts/', { status: 'verified', page_size: 1 }, { skip: partner || !can('cash') })
  const tasks = useList<unknown>('tasks/', { overdue: true, page_size: 1 }, { skip: !partner || !can('tasks') })
  const tickets = useList<unknown>('tickets/', { status: 'open', page_size: 1 }, { skip: !partner || !can('quality') })
  return {
    approvals: approvals.data?.count, leads: leads.data?.count, tasks: tasks.data?.count, tickets: tickets.data?.count,
    payouts: draft.data || verified.data ? (draft.data?.count ?? 0) + (verified.data?.count ?? 0) : undefined,
  }
}

export function RequireAuth() {
  const access = useAppSelector((s) => s.auth.access)
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()
  useMeQuery(undefined, { skip: !access })
  setEffective(user)
  if (!access) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user?.must_change_password) {
    // все остальные запросы backend отклоняет (403): меню и счётчики не рендерим
    if (location.pathname !== '/change-password') return <Navigate to="/change-password" replace state={{ from: location.pathname + location.search }} />
    return <Outlet />
  }
  return <AppLayout />
}

function AppLayout() {
  const t = useT()
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState<string[]>(loadCollapsed)

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed)) } catch { /* ignore */ } }, [collapsed])

  const partner = !(user?.is_hq || isNbsRole(user?.role))
  const counts = useNavCounts(user?.role, partner)
  const base = partner ? PARTNER_GROUPS : NBS_GROUPS
  // у финансиста рабочий экран — Касса: группа «Деньги» первой
  const ordered = user?.role === 'finance' ? [...base].sort((a, b) => (a.id === 'money' ? -1 : b.id === 'money' ? 1 : 0)) : base
  const groups = ordered.map((g) => ({ ...g, items: g.items.filter((n) => canAccess(user?.role, n.section)) })).filter((g) => g.items.length > 0)
  const initial = (user?.full_name || user?.email || '?').trim().charAt(0).toUpperCase()
  const toggle = (id: string) => setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const search = (e: FormEvent) => {
    e.preventDefault()
    const first = '/' + (location.pathname.split('/')[1] || '')
    const target = ['/', '/cash', '/settings', '/plans', '/team', '/sales'].includes(first) ? (partner ? '/clients' : '/franchisees') : first
    navigate(`${target}?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="app">
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label={t('nav.main')}>
        <div className="sidebar__brand"><Logo /></div>
        <nav className="sidebar__nav">
          {groups.map((g) => {
            const isCollapsed = collapsed.includes(g.id)
            const hasActive = g.items.some((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
            const groupBadge = g.items.reduce((a, n) => a + (n.badge ? counts[n.badge] ?? 0 : 0), 0)
            return (
              <div key={g.id} className="nav-group">
                <button type="button" className="nav-group__head" aria-expanded={!isCollapsed} onClick={() => toggle(g.id)}>
                  {isCollapsed ? <ChevronRight size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                  <span>{t(g.title)}</span>
                  {isCollapsed && groupBadge > 0 && <span className="nav-badge">{groupBadge}</span>}
                </button>
                {(!isCollapsed || hasActive) && g.items.map((n) => {
                  const c = n.badge ? counts[n.badge] : undefined
                  return (
                    <NavLink key={n.to} to={n.to} end={n.end} title={t(n.label)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      <n.icon size={20} strokeWidth={2} aria-hidden />
                      <span className="nav-link__label">{t(n.label)}</span>
                      {!!c && <span className="nav-badge" aria-label={t('nav.pending', { n: c })}>{c}</span>}
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="sidebar__foot">
          <NavLink to="/profile" className={({ isActive }) => `nav-link nav-link--foot ${isActive ? 'active' : ''}`}><UserCog size={18} aria-hidden /><span className="nav-link__label">{t('nav.profile')}</span></NavLink>
          <div style={{ marginTop: 6 }}>{user?.franchisee ? `${user.franchisee.name} · ${user.franchisee.city}` : 'OZOK'}</div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="icon-btn topbar__burger" onClick={() => setOpen((v) => !v)} aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
          <form className="topbar__search input-icon" role="search" onSubmit={search}>
            <Search size={18} aria-hidden />
            <input className="input input--sm" type="search" placeholder={t('nav.search')} aria-label={t('nav.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <div className="topbar__spacer" />
          <LangSwitch />
          <ThemeToggle />
          <div className="topbar__user">
            <div className="topbar__avatar" aria-hidden>{initial}</div>
            <div className="topbar__text">
              <div className="topbar__name">{user?.full_name || user?.email}</div>
              <div className="topbar__role">{ROLES[user?.role ?? ''] ?? user?.role}</div>
            </div>
            <button className="icon-btn" onClick={() => dispatch(logout())} aria-label={t('nav.logout')} title={t('nav.logout')}><LogOut size={20} /></button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}

export function RoleGuard({ section }: { section: Section }) {
  const user = useAppSelector((s) => s.auth.user)
  if (!user) return null
  if (!canAccess(user.role, section)) return <Navigate to="/" replace />
  return <Outlet />
}
