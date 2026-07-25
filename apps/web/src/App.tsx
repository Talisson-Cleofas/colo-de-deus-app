import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { ApiStatusBanner } from './components/system/ApiStatusBanner';
import { AppLoadingScreen } from './components/system/AppLoadingScreen';
import { AppShell } from './layout/AppShell';
import { PermissionRoute } from './rbac/PermissionRoute';
import { Permission } from './rbac/permissions';

const AgendaPage = lazy(() => import('./pages/AgendaPage').then((m) => ({ default: m.AgendaPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })));
const AttendancePage = lazy(() => import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const BirthdaysPage = lazy(() => import('./pages/BirthdaysPage').then((m) => ({ default: m.BirthdaysPage })));
const CommunitiesPage = lazy(() => import('./pages/CommunitiesPage').then((m) => ({ default: m.CommunitiesPage })));
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetailPage').then((m) => ({ default: m.CommunityDetailPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })));
const LectioPage = lazy(() => import('./pages/LectioPage').then((m) => ({ default: m.LectioPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));
const MemberProfilePage = lazy(() => import('./pages/MemberProfilePage').then((m) => ({ default: m.MemberProfilePage })));
const MembersPage = lazy(() => import('./pages/MembersPage').then((m) => ({ default: m.MembersPage })));
const MinistriesPage = lazy(() => import('./pages/MinistriesPage').then((m) => ({ default: m.MinistriesPage })));
const MissionsPage = lazy(() => import('./pages/MissionsPage').then((m) => ({ default: m.MissionsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const OrganizationDashboardPage = lazy(() => import('./pages/OrganizationDashboardPage').then((m) => ({ default: m.OrganizationDashboardPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ProfilesPage = lazy(() => import('./pages/ProfilesPage').then((m) => ({ default: m.ProfilesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const RbacPage = lazy(() => import('./pages/RbacPage').then((m) => ({ default: m.RbacPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SomaPage = lazy(() => import('./pages/SomaPage').then((m) => ({ default: m.SomaPage })));
const TechnicalAdminPage = lazy(() => import('./pages/TechnicalAdminPage').then((m) => ({ default: m.TechnicalAdminPage })));
const TrashPage = lazy(() => import('./pages/TrashPage').then((m) => ({ default: m.TrashPage })));
const PerformancePage = lazy(() => import('./pages/PerformancePage').then((m) => ({ default: m.PerformancePage })));
const ForbiddenPage = lazy(() => import('./pages/system/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })));

const protect = (element: ReactNode, permission: Parameters<typeof PermissionRoute>[0]['permission']) => (
  <PermissionRoute permission={permission}>{element}</PermissionRoute>
);

const protectAny = (element: ReactNode, anyOf: Parameters<typeof PermissionRoute>[0]['anyOf']) => (
  <PermissionRoute anyOf={anyOf}>{element}</PermissionRoute>
);

function AuthenticatedRoutes() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ApiStatusBanner />
        <Suspense fallback={<AppLoadingScreen />}><Routes>
          <Route path="/" element={protect(<DashboardPage />, Permission.DASHBOARD_READ)} />
          <Route path="/lectio" element={protect(<LectioPage />, Permission.LECTIO_READ)} />
          <Route path="/agenda" element={protect(<AgendaPage />, Permission.EVENTS_READ)} />
          <Route path="/eventos" element={protect(<EventsPage />, Permission.EVENTS_READ)} />
          <Route path="/eventos/:id" element={protect(<EventDetailPage />, Permission.EVENTS_READ)} />
          <Route path="/soma" element={protect(<SomaPage />, Permission.SOMA_READ)} />
          <Route path="/drive" element={protect(<Navigate to="/soma?tab=drive" replace />, Permission.SOMA_READ)} />
          <Route path="/relatorios" element={protect(<ReportsPage />, Permission.REPORTS_READ)} />
          <Route path="/membros" element={protect(<MembersPage />, Permission.MEMBERS_READ)} />
          <Route path="/membros/:id" element={protect(<MemberProfilePage />, Permission.MEMBERS_READ)} />
          <Route path="/missoes" element={<PermissionRoute permission={Permission.MINISTRIES_READ} deniedProfiles={['MEMBER']}><MissionsPage /></PermissionRoute>} />
          <Route path="/ministerios" element={protect(<MinistriesPage />, Permission.MINISTRIES_READ)} />
          <Route path="/mapa" element={protectAny(<MapPage />, [Permission.MEMBERS_READ, Permission.CELLS_READ, Permission.CENACLES_READ])} />
          <Route path="/celulas" element={protect(<CommunitiesPage type="CELL" />, Permission.CELLS_READ)} />
          <Route path="/mapa-celulas" element={protect(<Navigate to="/celulas?tab=mapa" replace />, Permission.CELLS_READ)} />
          <Route path="/cenaculos" element={protect(<CommunitiesPage type="CENACLE" />, Permission.CENACLES_READ)} />
          <Route path="/comunidades/:id" element={protectAny(<CommunityDetailPage />, [Permission.CELLS_READ, Permission.CENACLES_READ])} />
          <Route path="/comunidades/:id/presenca" element={protectAny(<AttendancePage />, [Permission.CELLS_MANAGE, Permission.CENACLES_MANAGE])} />
          <Route path="/notificacoes" element={protect(<NotificationsPage />, Permission.DASHBOARD_READ)} />
          <Route path="/aniversarios" element={protect(<BirthdaysPage />, Permission.MEMBERS_READ)} />
          <Route path="/perfil" element={protect(<ProfilePage />, Permission.DASHBOARD_READ)} />
          <Route path="/organizacao" element={protect(<OrganizationDashboardPage />, Permission.SETTINGS_READ)} />
          <Route path="/configuracoes" element={protect(<SettingsPage />, Permission.SETTINGS_READ)} />
          <Route path="/configuracoes/integracoes" element={protect(<IntegrationsPage />, Permission.INTEGRATIONS_READ)} />
          <Route path="/configuracoes/performance" element={protect(<PerformancePage />, Permission.SETTINGS_READ)} />
          <Route path="/configuracoes/tecnico" element={protect(<TechnicalAdminPage />, Permission.TECHNICAL_ADMIN_READ)} />
          <Route path="/configuracoes/perfis" element={protect(<ProfilesPage />, Permission.SETTINGS_MANAGE)} />
          <Route path="/auditoria" element={protectAny(<AuditPage />, [Permission.LOGS_READ, Permission.SETTINGS_READ])} />
          <Route path="/lixeira" element={protectAny(<TrashPage />, [Permission.SETTINGS_MANAGE, Permission.MEMBERS_DELETE])} />
          <Route path="/configuracoes/rbac" element={protect(<RbacPage />, Permission.SETTINGS_MANAGE)} />
          <Route path="/sem-permissao" element={<ForbiddenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  const { user, initializing } = useAuth();
  if (initializing) return <AppLoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<AuthenticatedRoutes />} />
    </Routes>
  );
}