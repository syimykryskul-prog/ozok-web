import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth, RoleGuard } from '../components/layout/AppLayout'
import type { Section } from '../lib/permissions'
import LoginPage from '../features/auth/LoginPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import FranchiseesPage from '../features/franchisees/FranchiseesPage'
import FranchiseeDetailPage from '../features/franchisees/FranchiseeDetailPage'
import ContractsPage from '../features/contracts/ContractsPage'
import LeadsPage from '../features/leads/LeadsPage'
import ClientsPage from '../features/clients/ClientsPage'
import ClientDetailPage from '../features/clients/ClientDetailPage'
import ImplementationsPage from '../features/implementations/ImplementationsPage'
import SalesPage from '../features/sales/SalesPage'
import TrainingPage from '../features/training/TrainingPage'
import QualityPage from '../features/quality/QualityPage'
import PlansPage from '../features/plans/PlansPage'
import TasksPage from '../features/tasks/TasksPage'
import SettingsPage from '../features/settings/SettingsPage'
import TeamPage from '../features/team/TeamPage'
import EventsPage from '../features/integrations/EventsPage'
import TermsPage from '../features/terms/TermsPage'
import StorefrontPage from '../features/storefront/StorefrontPage'
import CandidatesPage from '../features/candidates/CandidatesPage'
import RecruitersPage from '../features/recruiters/RecruitersPage'
import AnalyticsRedirect from '../features/analytics/Analytics'
import SubscriptionsPage from '../features/subscriptions/SubscriptionsPage'
import InstallationsPage from '../features/installations/InstallationsPage'
import CashPage from '../features/cash/CashPage'
import ChangePasswordPage from '../features/auth/ChangePasswordPage'
import AuditPage from '../features/audit/AuditPage'
import ChangeRequestsPage from '../features/leads/ChangeRequestsPage'
import ProfilePage from '../features/auth/ProfilePage'

const guarded = (section: Section, routes: { path: string; element: React.ReactNode }[]) => ({
  element: <RoleGuard section={section} />,
  children: routes,
})

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <DashboardPage /> },
      guarded('franchisees', [{ path: '/franchisees', element: <FranchiseesPage /> }, { path: '/franchisees/:id', element: <FranchiseeDetailPage /> }]),
      guarded('contracts', [{ path: '/contracts', element: <ContractsPage /> }]),
      guarded('leads', [{ path: '/leads', element: <LeadsPage /> }]),
      guarded('clients', [{ path: '/clients', element: <ClientsPage /> }, { path: '/clients/:id', element: <ClientDetailPage /> }]),
      guarded('implementations', [{ path: '/implementations', element: <ImplementationsPage /> }]),
      guarded('sales', [{ path: '/sales', element: <SalesPage /> }]),
      guarded('integrations', [{ path: '/integrations', element: <EventsPage /> }]),
      guarded('storefront', [{ path: '/spheres', element: <StorefrontPage /> }]),
      guarded('terms', [{ path: '/terms', element: <TermsPage /> }]),
      guarded('training', [{ path: '/training', element: <TrainingPage /> }]),
      guarded('quality', [{ path: '/quality', element: <QualityPage /> }]),
      guarded('plans', [{ path: '/plans', element: <PlansPage /> }]),
      guarded('tasks', [{ path: '/tasks', element: <TasksPage /> }]),
      guarded('settings', [{ path: '/settings', element: <SettingsPage /> }]),
      guarded('team', [{ path: '/team', element: <TeamPage /> }]),
      guarded('candidates', [{ path: '/candidates', element: <CandidatesPage /> }]),
      guarded('recruiters', [{ path: '/recruiters', element: <RecruitersPage /> }]),
      { path: '/analytics', element: <AnalyticsRedirect /> },
      guarded('subscriptions', [{ path: '/subscriptions', element: <SubscriptionsPage /> }]),
      guarded('cash', [{ path: '/cash', element: <CashPage /> }]),
      { path: '/settlements', element: <Navigate to="/cash?tab=partners" replace /> },
      { path: '/ledger', element: <Navigate to="/cash?tab=ledger" replace /> },
      { path: '/commissions', element: <Navigate to="/cash?tab=commissions" replace /> },
      guarded('installations', [{ path: '/installations', element: <InstallationsPage /> }]),
      guarded('audit', [{ path: '/audit', element: <AuditPage /> }]),
      guarded('changeRequests', [{ path: '/change-requests', element: <ChangeRequestsPage /> }]),
      { path: '/change-password', element: <ChangePasswordPage /> },
      guarded('profile', [{ path: '/profile', element: <ProfilePage /> }]),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
