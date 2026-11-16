import { useUser } from '../../app/hooks'
import { PageHeader } from '../../components/ui'
import { EmployeesPanel } from '../access/AccessPanel'
import { useT } from '../../i18n'

export default function TeamPage() {
  const t = useT()
  const user = useUser()
  return (
    <div className="page">
      <PageHeader eyebrow={user?.franchisee?.name} title={t('team.title')} />
      <EmployeesPanel partnerId={user?.franchisee?.id} />
    </div>
  )
}
