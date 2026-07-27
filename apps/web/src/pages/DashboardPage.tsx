import {
  AutoStoriesOutlined,
  CalendarMonthOutlined,
  Diversity3Outlined,
  FavoriteBorderOutlined,
  GroupsOutlined,
} from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BirthdayDashboardCard } from '../components/birthdays/BirthdayDashboardCard';
import { LectioHero } from '../components/dashboard/LectioHero';
import { QuickAccessCard } from '../components/dashboard/QuickAccessCard';
import { UpcomingEvents } from '../components/dashboard/UpcomingEvents';
import { useMemberDashboard } from '../dashboard/useMemberDashboard';
import { AdminDashboardPage } from './AdminDashboardPage';

const shortcuts = [
  { icon: <AutoStoriesOutlined />, title: 'Lectio Divina', subtitle: 'Reflexão diária', path: '/lectio' },
  { icon: <CalendarMonthOutlined />, title: 'Agenda', subtitle: 'Próximos eventos', path: '/agenda' },
  { icon: <FavoriteBorderOutlined />, title: 'Soma+', subtitle: 'Contribuições', path: '/soma' },
  { icon: <GroupsOutlined />, title: 'Células', subtitle: 'Comunidades', path: '/celulas' },
  { icon: <Diversity3Outlined />, title: 'Cenáculos', subtitle: 'Encontros de oração', path: '/cenaculos' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboard, loading: dashboardLoading, error: dashboardError } = useMemberDashboard();
  const navigate = useNavigate();

  if (
    user?.profile === 'MISSION_LEADER' ||
    user?.profile === 'ADMIN' ||
    user?.profile === 'DEVELOPER'
  ) {
    return <AdminDashboardPage />;
  }

  const birthdays = dashboard?.birthdays?.data ?? null;
  const lectio = dashboard?.lectio?.data ?? null;
  const events = Array.isArray(dashboard?.events?.data) ? dashboard.events.data : [];
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Missionário';

  return (
    <Box>
      <Box mb={{ xs: 3, md: 4 }}>
        <Typography variant="h4">Olá, {firstName}! 👋</Typography>
        <Typography color="text.secondary" mt={0.5}>
          Que bom ter você aqui.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, md: 2 },
          mb: 4,
        }}
      >
        {shortcuts.map((item) => (
          <QuickAccessCard key={item.path} {...item} onClick={() => navigate(item.path)} />
        ))}
      </Box>

      <Stack spacing={4}>
        <BirthdayDashboardCard
          data={birthdays}
          loading={dashboardLoading}
          error={dashboard?.birthdays?.error ?? dashboardError ?? undefined}
        />

        <LectioHero
          item={lectio}
          loading={dashboardLoading}
          error={dashboard?.lectio?.error ?? dashboardError ?? undefined}
          onOpen={() => navigate('/lectio')}
        />

        <UpcomingEvents
          items={events}
          loading={dashboardLoading}
          error={dashboard?.events?.error ?? dashboardError ?? undefined}
          onOpen={() => navigate('/eventos')}
        />
      </Stack>
    </Box>
  );
}
