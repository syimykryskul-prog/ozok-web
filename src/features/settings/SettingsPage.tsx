import { useState } from 'react'
import { PageHeader, Tabs } from '../../components/ui'
import { t } from '../../i18n'
import { useUser } from '../../app/hooks'
import { canRead, canWrite, normRole } from '../../lib/permissions'
import { useCan } from '../common/useAct'
import { IntegrationsPanel } from './IntegrationsPanel'
import { RulesPanel } from './RulesPanel'
import { SpheresPanel } from './SpheresPanel'
import AccessPanel from '../access/AccessPanel'
import { CategoriesPanel, FranchisePanel } from './FranchisePanel'
import { SettingsGroupPanel } from './SettingsGroups'
import { CashCategoriesPanel, ChecklistTemplatesPanel, ContractTemplatesPanel, SetupSplitPanel } from './SalesDocsPanels'

type Tab = 'products' | 'equipment' | 'rules' | 'franchise' | 'sla' | 'growth' | 'approvals' | 'notifications' | 'templates' | 'checklists' | 'split' | 'cashcat' | 'categories' | 'integrations' | 'users'

const ALL = (): { value: Tab; label: string; roles?: string[] }[] => [
  { value: 'products', label: t('settings.tab.products') },
  { value: 'equipment', label: t('settings.tab.equipment') },
  { value: 'rules', label: t('settings.tab.rules') },
  { value: 'franchise', label: t('settings.tab.franchise') },
  { value: 'sla', label: t('settings.tab.sla') },
  { value: 'growth', label: 'Growth' },
  { value: 'approvals', label: t('settings.tab.approvals') },
  { value: 'notifications', label: t('settings.tab.notifications') },
  { value: 'templates', label: t('settings.tab.templates') },
  { value: 'checklists', label: t('settings.tab.checklists') },
  { value: 'split', label: t('settings.tab.split') },
  { value: 'cashcat', label: t('settings.tab.cashcat'), roles: ['super_admin', 'network_head', 'finance'] },
  { value: 'categories', label: t('settings.tab.categories') },
  { value: 'integrations', label: t('settings.tab.integrations'), roles: ['super_admin', 'network_head'] },
  { value: 'users', label: t('settings.tab.users'), roles: ['super_admin'] },
]

export default function SettingsPage() {
  const user = useUser()
  const role = normRole(user?.role)
  const fullEdit = canWrite(user?.role, 'settingsWrite')
  const finEdit = canWrite(user?.role, 'settingsFinance')
  const catEdit = useCan('cashCategoryWrite')
  const tplEdit = useCan('catalogContracts')
  const chkEdit = useCan('catalogTemplates')
  const splitEdit = useCan('catalogSplit')
  const tabs = ALL().filter((x) => (!x.roles || x.roles.includes(role)) && (x.value !== 'cashcat' || canRead('cash_categories')))
  const [tab, setTab] = useState<Tab>('products')
  const hint = !fullEdit ? (finEdit ? t('settings.hint.finance_only') : t('settings.hint.readonly')) : undefined
  return (
    <div className="page">
      <PageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')}>{hint && <p className="muted">{hint}</p>}</PageHeader>
      <Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'products' && <SpheresPanel />}
      {tab === 'equipment' && <SpheresPanel equipmentOnly />}
      {tab === 'rules' && <div className="stack"><RulesPanel /><SettingsGroupPanel group="commissions" title={t('settings.commissions.title')} readOnly={!finEdit} hint={t('settings.commissions.hint')} /></div>}
      {tab === 'franchise' && <FranchisePanel readOnly={!finEdit} />}
      {tab === 'sla' && <SettingsGroupPanel group="sla" title={t('settings.tab.sla')} readOnly={!fullEdit} hint={t('settings.sla.hint')} />}
      {tab === 'growth' && <SettingsGroupPanel group="growth" title="Growth" readOnly={!fullEdit} hint={t('settings.growth.hint')} />}
      {tab === 'approvals' && <SettingsGroupPanel group="approvals" title={t('settings.tab.approvals')} readOnly={!fullEdit} hint={t('settings.approvals.hint')} />}
      {tab === 'notifications' && <SettingsGroupPanel group="notifications" title={t('settings.tab.notifications')} readOnly={!fullEdit} hint={t('settings.notifications.hint')} />}
      {tab === 'templates' && <ContractTemplatesPanel readOnly={!tplEdit} />}
      {tab === 'checklists' && <ChecklistTemplatesPanel readOnly={!chkEdit} />}
      {tab === 'split' && <SetupSplitPanel readOnly={!splitEdit} />}
      {tab === 'cashcat' && <CashCategoriesPanel readOnly={!catEdit} />}
      {tab === 'categories' && <CategoriesPanel />}
      {tab === 'integrations' && <IntegrationsPanel />}
      {tab === 'users' && <AccessPanel />}
    </div>
  )
}
