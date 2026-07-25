import {
  AutoStoriesOutlined,
  CalendarMonthOutlined,
  Diversity3Outlined,
  FavoriteBorderOutlined,
  GroupsOutlined,
  NotificationsNoneOutlined,
} from '@mui/icons-material';
import {
  Avatar,
  Badge,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BirthdayDashboardCard } from '../components/birthdays/BirthdayDashboardCard';
import { LectioHero } from '../components/dashboard/LectioHero';
import { QuickAccessCard } from '../components/dashboard/QuickAccessCard';
import { UpcomingEvents } from '../components/dashboard/UpcomingEvents';
import { useMemberDashboard } from '../dashboard/useMemberDashboard';
import { AdminDashboardPage } from './AdminDashboardPage';

const shortcuts = [
  {
    icon: <AutoStoriesOutlined />,
    title: 'Lectio Divina',
    subtitle: 'Reflexão diária',
    path: '/lectio',
  },
  {
    icon: <CalendarMonthOutlined />,
    title: 'Agenda',
    subtitle: 'Próximos eventos',
    path: '/agenda',
  },
  {
    icon: <FavoriteBorderOutlined />,
    title: 'Soma+',
    subtitle: 'Contribuições',
    path: '/soma',
  },
  {
    icon: <GroupsOutlined />,
    title: 'Células',
    subtitle: 'Comunidades',
    path: '/celulas',
  },
  {
    icon: <Diversity3Outlined />,
    title: 'Cenáculos',
    subtitle: 'Encontros de oração',
    path: '/cenaculos',
  },
];

export function DashboardPage() {
  const { user } = useAuth();
  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
  } = useMemberDashboard();
  const navigate = useNavigate();

  if (
    user?.profile === 'MISSION_LEADER' ||
    user?.profile === 'ADMIN' ||
    user?.profile === 'DEVELOPER'
  ) {
    return <AdminDashboardPage />;
  }

  const notificationsData = dashboard?.notifications?.data;
  const birthdaysData = dashboard?.birthdays?.data;
  const lectioData = dashboard?.lectio?.data;
  const eventsData = dashboard?.events?.data;

  const unreadCount =
    typeof notificationsData?.unreadCount === 'number'
      ? notificationsData.unreadCount
      : 0;
  const birthdays = birthdaysData ?? null;
  const lectio = lectioData ?? null;
  const events = Array.isArray(eventsData) ? eventsData : [];
  const firstName = user?.name?.split(' ')[0] ?? 'Missionário';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4">Olá, {firstName}! 👋</Typography>
          <Typography color="text.secondary" mt={0.5}>
            Que bom ter você aqui.
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={2}>
          <Tooltip
            title={
              unreadCount > 0
                ? `${unreadCount} notificação(ões) não lida(s)`
                : 'Nenhuma notificação nova'
            }
          >
            <IconButton
              aria-label="Abrir notificações"
              onClick={() => navigate('/notificacoes')}
              sx={{
                color: unreadCount > 0 ? 'primary.main' : 'text.secondary',
              }}
            >
              <Badge
                badgeContent={unreadCount}
                color="primary"
                invisible={unreadCount === 0}
                max={99}
              >
                <NotificationsNoneOutlined />
              </Badge>
            </IconButton>
          </Tooltip>

          <Avatar src={user?.photo}>{user?.name?.[0]}</Avatar>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(5,1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        {shortcuts.map((item) => (
          <QuickAccessCard
            key={item.path}
            {...item}
            onClick={() => navigate(item.path)}
          />
        ))}
      </Box>

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

      <Box mt={4}>
        <UpcomingEvents
          items={events}
          loading={dashboardLoading}
          error={dashboard?.events?.error ?? dashboardError ?? undefined}
          onOpen={() => navigate('/eventos')}
        />
      </Box>
    </Box>
  );
}
