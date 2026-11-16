import { useMemo, useState } from 'react'
import { t, useT } from '../../i18n'
import { Copy, KeyRound, Plus, RotateCcw, UserPlus } from 'lucide-react'
import { useList, useOne } from '../../api/hooks'
import type { AccessRole, AppUser, PermLevelMap } from '../../api/types'
import { ActiveChip, Badge, Button, Card, CardTitle, DataTable, Dl, ErrorAlert, FormModal, Input, Modal, SearchInput, Select, Tabs, Textarea } from '../../components/ui'
import { formatDateTime, formatPhone } from '../../lib/format'
import { kyOf, ruOf } from '../../lib/kyField'
import { useForm } from '../../lib/useForm'
import { useListState } from '../../lib/useListState'
import { ALL_NEW_ROLES, FR_ROLES, ROLES, dictOptions } from '../../lib/status'
import { ACTION_GROUPS, isPartnerRole } from '../../lib/permissions'
import { FranchiseeSelect, toId } from '../common/pickers'
import { HistoryTab, ReasonModal } from '../common/shared'
import { useAct, useCan } from '../common/useAct'
import { useUser } from '../../app/hooks'

type Level = 'none' | 'read' | 'write'
const LEVELS: { value: Level; label: string }[] = [
  { value: 'none', get label() { return t('common.none') } }, { value: 'read', get label() { return t('access.level.read') } }, { value: 'write', get label() { return t('access.level.write') } },
]

/** Модули матрицы прав (= разделы меню). partner: доступно владельцу франчайзи для своих сотрудников. */
export const MODULES: { key: string; label: string; partner?: boolean }[] = ([
  ['dashboard', true], ['leads', true], ['sales', true], ['clients', true], ['installations', true], ['cash', true],
  ['cash_partners'], ['payouts', true], ['candidates'], ['partners'], ['recruiters'], ['franchise_contracts'],
  ['tasks', true], ['quality', true], ['training', true], ['plans_rating'], ['approvals'], ['integrations'],
  ['audit_log'], ['settings'], ['users', true], ['reports', true],
] as [string, boolean?][]).map(([key, partner]) => ({ key, partner, get label() { return t(`access.module.${key}`) } }))
/** Матрица backend хранит уровни по РЕСУРСАМ API; модуль меню = группа ресурсов (core/access.py MODULES). Уровень модуля = максимум. */
export const MODULE_RESOURCES: Record<string, string[]> = {
  dashboard: ['dashboard'], leads: ['leads'], sales: ['deals', 'client_sales', 'equipment_sales'],
  clients: ['clients', 'client_accounts', 'branches', 'subscriptions', 'client_contacts', 'branch_assignments'],
  installations: ['installations', 'implementations', 'implementer_accruals'],
  cash: ['cash_accounts', 'cash_transactions', 'cash_report', 'cash_categories', 'subscription_payments'],
  cash_partners: ['charges', 'payments', 'contracts'], payouts: ['payouts', 'commission_payouts', 'commission_accruals'],
  candidates: ['partner_history'], partners: ['franchisees', 'franchise_offers'], recruiters: ['recruiter_rewards'],
  franchise_contracts: ['contracts', 'franchise_offers'], tasks: ['tasks'], quality: ['tickets', 'audits'], training: ['courses', 'enrollments'],
  plans_rating: ['sales_plans'], approvals: ['change_requests'], integrations: ['integration_events'], audit_log: ['audit_log'],
  settings: ['settings', 'commission_rules', 'access_roles', 'products', 'tariffs', 'packages', 'equipment', 'setup_split_rules', 'checklist_templates', 'contract_templates', 'ledger_categories'],
  users: ['users'], reports: ['reports', 'sales_report', 'analytics', 'ledger'],
}
const RANK: Record<string, number> = { none: 0, read: 1, write: 2 }
const moduleLevel = (m: PermLevelMap, key: string): Level =>
  (MODULE_RESOURCES[key] ?? [key]).reduce<Level>((a, r) => (RANK[m[r] ?? 'none'] > RANK[a] ? ((m[r] ?? 'none') as Level) : a), 'none')
const withModule = (m: PermLevelMap, key: string, lvl: Level): PermLevelMap => {
  const out = { ...m }
  for (const r of MODULE_RESOURCES[key] ?? [key]) out[r] = lvl
  return out
}
/** Особое право включено: имя группы есть в списке или есть все её dotted-ключи. */
const actionOn = (value: string[], key: string): boolean => value.includes(key) || ((ACTION_GROUPS[key] ?? []).length > 0 && ACTION_GROUPS[key].every((k) => value.includes(k)))
const toggleAction = (value: string[], key: string): string[] => {
  const keys = [key, ...(ACTION_GROUPS[key] ?? [])]
  return actionOn(value, key) ? value.filter((x) => !keys.includes(x)) : [...value, key]
}

export const ACTIONS: { key: string; label: string; partner?: boolean }[] = ([
  ['approve_discounts'], ['approve_lead_changes'], ['verify_payouts'], ['pay_payouts'], ['view_personal_data'], ['export', true],
  ['change_prices_rules'], ['manage_partner_status'], ['cancel_financial', true], ['manage_users', true],
] as [string, boolean?][]).map(([key, partner]) => ({ key, partner, get label() { return t(`access.action.${key}`) } }))
const SCOPES: Record<string, string> = {
  get all() { return t('access.scopes.all') }, get own_region() { return t('access.scopes.own_region') },
  get own_partners() { return t('access.scopes.own_partners') }, get assigned() { return t('access.scopes.assigned') },
}

/** users/{id}/effective-permissions/: итог, а также права роли (role_permissions / role_actions) и отличия сотрудника. */
interface Eff { permissions?: PermLevelMap; actions?: string[]; scope?: string; role_permissions?: PermLevelMap; role_actions?: string[]; overrides?: { scope?: string } }

// ---------- Матрица прав (общий редактор) ----------
function Matrix({ value, base, onChange, partnerOnly, readOnly }: {
  value: PermLevelMap; base?: PermLevelMap; onChange: (m: PermLevelMap) => void; partnerOnly?: boolean; readOnly?: boolean
}) {
  const t = useT()
  const rows = MODULES.filter((m) => !partnerOnly || m.partner)
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>{t('access.section')}</th><th>{t('access.accessCol')}</th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const cur = moduleLevel(value, m.key)
            const diff = base !== undefined && moduleLevel(base, m.key) !== cur
            return (
              <tr key={m.key} style={diff ? { background: 'var(--warning-bg)' } : undefined}>
                <td>{m.label}{diff && <> <Badge small tone="warning">{t('access.diffRole')}</Badge></>}</td>
                <td>
                  <div className="row" role="radiogroup" aria-label={m.label} style={{ gap: 4 }}>
                    {LEVELS.map((l) => (
                      <Button key={l.value} type="button" size="sm" variant={cur === l.value ? 'primary' : 'secondary'} disabled={readOnly} aria-pressed={cur === l.value}
                        onClick={() => onChange(withModule(value, m.key, l.value))}>{l.label}</Button>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ActionsBox({ value, base, onChange, partnerOnly, readOnly }: { value: string[]; base?: string[]; onChange: (a: string[]) => void; partnerOnly?: boolean; readOnly?: boolean }) {
  const t = useT()
  return (
    <div className="stack" style={{ gap: 6 }}>
      {ACTIONS.filter((a) => !partnerOnly || a.partner).map((a) => {
        const on = actionOn(value, a.key)
        const diff = base !== undefined && actionOn(base, a.key) !== on
        return (
          <label key={a.key} className="row" style={{ gap: 8, background: diff ? 'var(--warning-bg)' : undefined, padding: '2px 6px', borderRadius: 8 }}>
            <input type="checkbox" checked={on} disabled={readOnly} onChange={() => onChange(toggleAction(value, a.key))} />
            {a.label}{diff && <Badge small tone="warning">{t('access.diffRole')}</Badge>}
          </label>
        )
      })}
    </div>
  )
}

// ---------- Роли доступа ----------
function RoleForm({ item, onClose }: { item?: AccessRole; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const src = item
  const f = useForm({ name: ruOf(item, 'name'), name_ky: kyOf(item, 'name_ky'), description_ky: kyOf(src, 'description_ky'), description: ruOf(src, 'description'), scope: src?.scope ?? 'all', base_role: item?.base_role ?? 'network_head' })
  const [perm, setPerm] = useState<PermLevelMap>(src?.permissions ?? {})
  const [acts, setActs] = useState<string[]>(src?.actions ?? [])
  const submit = async () => {
    if (!f.v.name.trim()) return f.fail({ data: { name: [t('access.err.roleName')] } })
    const body = { name: f.v.name.trim(), name_ky: f.v.name_ky.trim(), description: f.v.description, description_ky: f.v.description_ky, scope: f.v.scope, permissions: perm, actions: acts, ...(item?.is_system ? {} : { base_role: f.v.base_role }) }
    const r = item ? await act(`access-roles/${item.id}/`, body, t('access.roleSaved'), 'PATCH') : await act('access-roles/', body, t('access.roleCreated'))
    if (r) onClose()
  }
  return (
    <FormModal wide title={item ? t('access.roleTitle', { name: item.name }) : t('access.newRole')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general}>
      <div className="form-grid">
        <Input label={t('common.name')} value={f.v.name} error={f.errors.name} onChange={(e) => f.set('name', e.target.value)} />
        <Input label={t('settings.ky.name')} value={f.v.name_ky} onChange={(e) => f.set('name_ky', e.target.value)} />
        <Select label={t('access.scope')} options={dictOptions(SCOPES)} value={f.v.scope} onChange={(e) => f.set('scope', e.target.value)} />
        <Select label={t('access.userType')} options={dictOptions(Object.fromEntries(Object.entries(ALL_NEW_ROLES).filter(([k]) => k !== 'super_admin')))} value={f.v.base_role} disabled={!!item?.is_system} error={f.errors.base_role} hint={t('access.userTypeHint')} onChange={(e) => f.set('base_role', e.target.value)} />
        <div className="span-2"><Textarea label={t('common.description')} rows={2} value={f.v.description} onChange={(e) => f.set('description', e.target.value)} /></div>
        <div className="span-2"><Textarea label={t('settings.ky.description')} value={f.v.description_ky} onChange={(e) => f.set('description_ky', e.target.value)} /></div>
      </div>
      <Matrix value={perm} onChange={setPerm} />
      <strong>{t('access.specialRights')}</strong>
      <ActionsBox value={acts} onChange={setActs} />
    </FormModal>
  )
}

export function RolesPanel() {
  const t = useT()
  const { rows, isLoading, error } = useList<AccessRole>('access-roles/', { page_size: 100 })
  const canEdit = useCan('accessRoles')
  const [form, setForm] = useState<{ item?: AccessRole } | null>(null)
  const [pick, setPick] = useState(false)
  const { act } = useAct()
  const [del, setDel] = useState<AccessRole | null>(null)
  return (
    <Card white flush>
      <div style={{ padding: '20px 24px 0' }}>
        <CardTitle actions={canEdit && <><Button size="sm" variant="secondary" icon={Copy} onClick={() => setPick(true)}>{t('access.copyFrom')}</Button><Button size="sm" icon={Plus} onClick={() => setForm({})}>{t('access.newRoleBtn')}</Button></>}>{t('access.rolesTitle')}</CardTitle>
      </div>
      <ErrorAlert error={error} />
      <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={canEdit ? (r) => setForm({ item: r }) : undefined} emptyTitle={t('access.rolesEmpty')} emptyText={t('access.rolesEmptyText')}
        columns={[
          { key: 'n', header: t('access.colRole'), render: (r) => <div><strong>{r.name}</strong>{r.is_system && <> <Badge small>{t('access.system')}</Badge></>}<div className="muted" style={{ fontSize: 12 }}>{r.description}</div></div> },
          { key: 's', header: t('access.colScope'), render: (r) => SCOPES[r.scope ?? 'all'] ?? r.scope },
          { key: 'm', header: t('access.colModules'), align: 'right', render: (r) => Object.values(r.permissions ?? {}).filter((v) => v !== 'none').length },
          { key: 'u', header: t('access.colUsers'), align: 'right', render: (r) => r.users_count ?? '—' },
          { key: 'x', header: '', render: (r) => (canEdit && !r.is_system ? <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDel(r) }}>{t('common.delete')}</Button> : null) },
        ]} />
      {form && <RoleForm item={form.item} onClose={() => setForm(null)} />}
      {pick && (
        <FormModal title={t('access.copyRole')} onClose={() => setPick(false)} submitLabel={t('common.close')} onSubmit={() => setPick(false)}>
          <p className="muted" style={{ margin: 0 }}>{t('access.copyPick')}</p>
          <ul className="list">
            {(rows ?? []).filter((r) => r.base_role !== 'super_admin' && r.code !== 'super_admin').map((r) => <li key={r.id} className="list__item"><span>{r.name}</span><Button type="button" size="sm" variant="secondary" onClick={async () => { if (await act(`access-roles/${r.id}/duplicate/`, { name: t('access.copySuffix', { name: r.name }) }, t('access.copyDone'))) setPick(false) }}>{t('access.copy')}</Button></li>)}
          </ul>
        </FormModal>
      )}
      {del && <ReasonModal title={t('access.deleteRole', { name: del.name })} submitLabel={t('common.delete')} required={false} onClose={() => setDel(null)} onSubmit={() => act(`access-roles/${del.id}/`, undefined, t('access.roleDeleted'), 'DELETE')} />}
    </Card>
  )
}

// ---------- Сотрудники ----------
function InviteForm({ partnerId, onClose }: { partnerId?: number; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const roles = useList<AccessRole>('access-roles/', { page_size: 100 }, { skip: !!partnerId })
  const f = useForm({ first_name: '', last_name: '', email: '', phone: '', role: partnerId ? 'franchisee_staff' : 'network_head', access_role: '', region: '', franchisee: '' })
  const [pwd, setPwd] = useState<string | null>(null)
  const isFr = !!partnerId || isPartnerRole(f.v.role)
  const submit = async () => {
    const e: Record<string, string[]> = {}
    if (!f.v.email.trim()) e.email = [t('access.err.email')]
    if (!f.v.first_name.trim()) e.first_name = [t('access.err.firstName')]
    if (isFr && !partnerId && !f.v.franchisee) e.franchisee = [t('access.err.partner')]
    if (Object.keys(e).length) return f.fail({ data: e })
    const r = await act<{ temporary_password?: string; password?: string }>('users/invite/', {
      first_name: f.v.first_name.trim(), last_name: f.v.last_name.trim(), email: f.v.email.trim(), phone: f.v.phone, role: f.v.role, region: f.v.region,
      access_role: toId(f.v.access_role), franchisee: isFr ? (partnerId ?? toId(f.v.franchisee)) : null,
    }, t('access.invited'))
    if (r) setPwd(r.temporary_password ?? r.password ?? '—')
  }
  if (pwd !== null) return <TempPassword pwd={pwd} onClose={onClose} />
  return (
    <FormModal title={t('access.invite')} onClose={onClose} onSubmit={submit} saving={busy} error={f.general} submitLabel={t('access.inviteBtn')}>
      <div className="form-grid">
        <Input label={t('access.firstName')} value={f.v.first_name} error={f.errors.first_name} onChange={(e) => f.set('first_name', e.target.value)} />
        <Input label={t('access.lastName')} value={f.v.last_name} error={f.errors.last_name} onChange={(e) => f.set('last_name', e.target.value)} />
        <div className="span-2"><Input label={t('common.email')} type="email" value={f.v.email} error={f.errors.email} onChange={(e) => f.set('email', e.target.value)} /></div>
        <Input label={t('common.phone')} value={f.v.phone} onChange={(e) => f.set('phone', e.target.value)} />
        <Select label={t('access.role')} options={dictOptions(partnerId ? FR_ROLES : ALL_NEW_ROLES)} value={f.v.role} onChange={(e) => f.set('role', e.target.value)} />
        {!partnerId && (roles.rows ?? []).length > 0 && <Select label={t('access.accessRoleOpt')} placeholder={t('access.asRole')} options={(roles.rows ?? []).map((r) => ({ value: r.id, label: r.name }))} value={f.v.access_role} onChange={(e) => f.set('access_role', e.target.value)} />}
        {!isFr && <Input label={t('common.region')} value={f.v.region} onChange={(e) => f.set('region', e.target.value)} />}
        {isFr && !partnerId && <div className="span-2"><FranchiseeSelect value={f.v.franchisee} error={f.errors.franchisee} onChange={(v) => f.set('franchisee', v)} /></div>}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('access.inviteNote')}</p>
    </FormModal>
  )
}

function TempPassword({ pwd, onClose }: { pwd: string; onClose: () => void }) {
  const t = useT()
  return (
    <Modal open title={t('access.tempPwd')} onClose={onClose} footer={<Button onClick={onClose}>{t('common.done')}</Button>}>
      <div className="stack">
        <p style={{ margin: 0 }}>{t('access.tempPwdGive')} <strong>{t('access.tempPwdOnce')}</strong></p>
        <code style={{ fontSize: 20, padding: 12, background: 'var(--mist)', borderRadius: 12, userSelect: 'all' }}>{pwd}</code>
        <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(pwd)}>{t('access.copyPwd')}</Button>
      </div>
    </Modal>
  )
}

function EmployeeModal({ user, partnerOnly, onClose }: { user: AppUser; partnerOnly?: boolean; onClose: () => void }) {
  const t = useT()
  const me = useUser()
  const { act, busy } = useAct()
  const eff = useOne<Eff>(`users/${user.id}/effective-permissions/`)
  const roleRec = useOne<AccessRole>(`access-roles/${user.access_role}/`, undefined, { skip: !user.access_role })
  const canManage = useCan('usersInvite')
  const baseP: PermLevelMap | undefined = eff.data?.role_permissions ?? roleRec.data?.permissions
  const baseA = eff.data?.role_actions ?? roleRec.data?.actions
  const baseS = roleRec.data?.scope ?? (eff.data?.overrides?.scope ? undefined : eff.data?.scope)
  const [perm, setPerm] = useState<PermLevelMap | null>(null)
  const [acts, setActs] = useState<string[] | null>(null)
  const [scope, setScope] = useState<string | null>(null)
  const [tab, setTab] = useState<'rights' | 'history'>('rights')
  const [pwd, setPwd] = useState<string | null>(null)
  const [deact, setDeact] = useState(false)
  const curP = perm ?? eff.data?.permissions ?? baseP ?? {}
  const curA = acts ?? eff.data?.actions ?? baseA ?? []
  const curS = scope ?? eff.data?.scope ?? baseS ?? 'all'
  const self = me?.id === user.id
  const overrides = useMemo(() => {
    const permissions: PermLevelMap = {}
    const resources = new Set(Object.values(MODULE_RESOURCES).flat())
    for (const r of resources) if (baseP && (curP[r] ?? 'none') !== (baseP[r] ?? 'none')) permissions[r] = curP[r] ?? 'none'
    const b = baseA ?? []
    const add = curA.filter((a) => !b.includes(a))
    const rem = b.filter((a) => !curA.includes(a))
    return { permissions, actions_add: add, actions_remove: rem, ...(baseS && curS !== baseS ? { scope: curS } : {}) }
  }, [curP, curA, curS, baseP, baseA, baseS])
  const dirty = perm !== null || acts !== null || scope !== null
  const save = async () => { if (await act(`users/${user.id}/`, { permission_overrides: overrides }, t('access.rightsSaved'), 'PATCH')) { setPerm(null); setActs(null); setScope(null) } }
  const reset = async () => { if (await act(`users/${user.id}/`, { permission_overrides: {} }, t('access.rightsReset'), 'PATCH')) { setPerm(null); setActs(null); setScope(null) } }
  const resetPwd = async () => { const r = await act<{ temporary_password?: string; password?: string }>(`users/${user.id}/reset-password/`, undefined, t('access.pwdReset')); if (r) setPwd(r.temporary_password ?? r.password ?? '—') }
  if (pwd !== null) return <TempPassword pwd={pwd} onClose={() => setPwd(null)} />
  return (
    <Modal open wide title={user.full_name || user.email} onClose={onClose}>
      <div className="stack">
        <Dl items={[[t('common.email'), user.email], [t('common.phone'), formatPhone(user.phone)], [t('access.role'), ROLES[user.role] ?? user.role], [t('common.region'), user.region], [t('access.lastLogin'), formatDateTime(user.last_login)], [t('common.status'), <ActiveChip active={user.is_active} />]]} />
        {canManage && <div className="row" style={{ gap: 8 }}>
          <Button size="sm" variant="secondary" icon={KeyRound} loading={busy} onClick={() => void resetPwd()}>{t('access.resetPwd')}</Button>
          {user.is_active
            ? <Button size="sm" variant="danger" disabled={self} onClick={() => setDeact(true)}>{t('access.deactivate')}</Button>
            : <Button size="sm" loading={busy} onClick={() => act(`users/${user.id}/activate/`, undefined, t('access.activated'))}>{t('access.activate')}</Button>}
        </div>}
        <Tabs<'rights' | 'history'> tabs={[{ value: 'rights', label: t('access.tabRights') }, { value: 'history', label: t('access.tabHistory') }]} value={tab} onChange={setTab} />
        {tab === 'rights' && (
          <>
            <ErrorAlert error={eff.error} />
            <Select label={t('access.scope')} options={dictOptions(SCOPES)} value={curS} onChange={(e) => setScope(e.target.value)} />
            {baseS && curS !== baseS && <Badge small tone="warning">{t('access.diffRole')}</Badge>}
            <Matrix value={curP} base={baseP} onChange={setPerm} partnerOnly={partnerOnly} />
            <strong>{t('access.specialRights')}</strong>
            <ActionsBox value={curA} base={baseA} onChange={setActs} partnerOnly={partnerOnly} />
            <div className="row" style={{ gap: 8 }}>
              <Button loading={busy} disabled={!dirty || !canManage} onClick={() => void save()}>{t('access.saveRights')}</Button>
              <Button variant="secondary" icon={RotateCcw} loading={busy} onClick={() => void reset()}>{t('access.backToRole')}</Button>
            </div>
          </>
        )}
        {tab === 'history' && <HistoryTab entity="accounts.User" id={user.id} />}
      </div>
      {deact && <ReasonModal title={t('access.deactivateTitle')} submitLabel={t('access.deactivate')} required={false} hint={t('access.deactivateHint')} onClose={() => setDeact(false)} onSubmit={() => act(`users/${user.id}/deactivate/`, undefined, t('access.deactivated'))} />}
    </Modal>
  )
}

/** Сотрудники и доступ. partnerId — режим владельца франчайзи («Команда»): только его сотрудники и партнёрские модули. */
export function EmployeesPanel({ partnerId }: { partnerId?: number }) {
  const t = useT()
  const canInvite = useCan('usersInvite')
  const [invite, setInvite] = useState(false)
  const [open, setOpen] = useState<AppUser | null>(null)
  const ls = useListState({ role: '' })
  const { rows, data, isLoading, error } = useList<AppUser>('users/', { ...ls.params, franchisee: partnerId })
  return (
    <div className="stack">
      <div className="filters">
        <SearchInput value={ls.search} onChange={ls.setSearch} placeholder={t('access.searchPh')} />
        {!partnerId && <Select label={t('access.role')} options={dictOptions(ALL_NEW_ROLES)} placeholder={t('common.all')} value={ls.filters.role} onChange={(e) => ls.setFilter('role', e.target.value)} />}
        {canInvite && <Button icon={UserPlus} onClick={() => setInvite(true)}>{t('access.invite')}</Button>}
      </div>
      <ErrorAlert error={error} />
      <Card white flush>
        <DataTable loading={isLoading} rows={rows} rowKey={(r) => r.id} onRowClick={setOpen} page={ls.page} total={data?.count} onPage={ls.setPage}
          emptyTitle={t('access.employeesEmpty')} emptyText={t('access.employeesEmptyText')}
          columns={[
            { key: 'n', header: t('access.colEmployee'), render: (r) => <div><strong>{r.full_name || r.email}</strong><div className="muted" style={{ fontSize: 12 }}>{r.email}</div></div> },
            { key: 'r', header: t('access.role'), render: (r) => ROLES[r.role] ?? r.role },
            ...(!partnerId ? [{ key: 'f', header: t('access.colPartnerRegion'), render: (r: AppUser) => r.franchisee_name ?? (r.region || 'OZOK') }] : []),
            { key: 'l', header: t('access.colLastLogin'), render: (r) => (r.last_login ? formatDateTime(r.last_login) : <span className="muted">{t('access.neverLogged')}</span>) },
            { key: 'a', header: t('common.status'), render: (r) => <div><ActiveChip active={r.is_active} />{r.must_change_password && <div className="muted" style={{ fontSize: 12 }}>{t('access.mustChangePwd')}</div>}</div> },
          ]} />
      </Card>
      {invite && <InviteForm partnerId={partnerId} onClose={() => setInvite(false)} />}
      {open && <EmployeeModal user={open} partnerOnly={!!partnerId} onClose={() => setOpen(null)} />}
    </div>
  )
}

type Sub = 'employees' | 'roles'
/** Настройки → «Сотрудники и доступ». */
export default function AccessPanel() {
  const t = useT()
  const [sub, setSub] = useState<Sub>('employees')
  return (
    <div className="stack">
      <Tabs<Sub> tabs={[{ value: 'employees', label: t('access.tabEmployees') }, { value: 'roles', label: t('access.rolesTitle') }]} value={sub} onChange={setSub} />
      {sub === 'employees' ? <EmployeesPanel /> : <RolesPanel />}
    </div>
  )
}
