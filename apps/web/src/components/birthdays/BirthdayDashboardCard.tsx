import { CakeOutlined, CelebrationOutlined } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { DashboardBirthday } from '../../dashboard/useMemberDashboard';

type Data = {
  enabled: boolean;
  today: DashboardBirthday[];
  week: DashboardBirthday[];
  month: DashboardBirthday[];
  monthCount: number;
};

export function BirthdayDashboardCard({
  data,
  loading,
  error,
}: {
  data: Data | null;
  loading?: boolean;
  error?: string;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="grid" sx={{ placeItems: 'center' }} minHeight={120}>
            <CircularProgress size={28} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) return <Alert severity="warning">{error}</Alert>;
  if (data?.enabled === false) return null;

  const today = Array.isArray(data?.today) ? data.today : [];
  const week = Array.isArray(data?.week) ? data.week : [];
  const monthCount = Number.isFinite(data?.monthCount) ? Math.max(0, data?.monthCount ?? 0) : 0;
  const items = today.length > 0 ? today : week.slice(0, 4);

  return (
    <Card
      sx={{
        border: today.length ? '1px solid' : undefined,
        borderColor: today.length ? 'primary.main' : 'divider',
        background: today.length
          ? 'linear-gradient(135deg, rgba(211,154,87,.14), rgba(167,93,180,.07))'
          : undefined,
      }}
    >
      <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} mb={2}>
          <Box>
            <Stack direction="row" gap={1} alignItems="center">
              {today.length ? <CelebrationOutlined color="primary" /> : <CakeOutlined color="primary" />}
              <Typography variant="h6">
                {today.length ? 'Aniversários de hoje' : 'Aniversários da semana'}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {monthCount} aniversariante(s) neste mês.
            </Typography>
          </Box>
          <Button onClick={() => navigate('/aniversarios')}>Ver aniversários</Button>
        </Stack>

        {items.length === 0 ? (
          <Alert severity="info">Nenhum aniversário nos próximos sete dias.</Alert>
        ) : (
          <Stack gap={1.25}>
            {items.map((item) => (
              <Stack key={item.id || `${item.name}-${item.day}-${item.month}`} direction="row" alignItems="center" gap={1.5}>
                <Avatar src={item.photo}>{item.name?.[0] ?? '?'}</Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={800} noWrap>{item.name || 'Membro'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.isToday ? 'Hoje' : `Em ${Math.max(0, item.daysUntil ?? 0)} dia(s)`}
                  </Typography>
                </Box>
                {item.id && <Button size="small" onClick={() => navigate(`/membros/${item.id}`)}>Perfil</Button>}
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
