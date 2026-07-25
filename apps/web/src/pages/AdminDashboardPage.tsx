import {
  AccountBalanceWalletOutlined,
  CalendarMonthOutlined,
  Diversity3Outlined,
  EventAvailableOutlined,
  GroupsOutlined,
  NotificationsNoneOutlined,
  RefreshOutlined,
  VolunteerActivismOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';

type DashboardData = {
  generatedAt: string;
  month: string;
  metrics: {
    members: number;
    ministries: number;
    cells: number;
    cenacles: number;
    eventsThisMonth: number;
    attendancesThisMonth: number;
    somaThisMonth: number;
  };
  latestNotifications: Array<{
    id: string;
    title: string;
    message: string;
    date: string;
    type: string;
    read: boolean;
  }>;
};

function MetricCard({ icon, label, value, detail, onClick }: { icon: ReactNode; label: string; value: string; detail: string; onClick?: () => void }) {
  return (
    <Card onClick={onClick} sx={{ minHeight: 152, cursor: onClick ? 'pointer' : 'default', transition: 'transform .2s ease,border-color .2s ease', '&:hover': onClick ? { transform: 'translateY(-3px)', borderColor: 'primary.dark' } : undefined }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>{label}</Typography>
            <Typography variant="h4" mt={1}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{detail}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(211,154,87,.14)', color: 'primary.main', width: 46, height: 46 }}>{icon}</Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

function timeAgo(date: string): string {
  if (!date) return 'Data não informada';
  const value = new Date(date).getTime();
  if (!Number.isFinite(value)) return date;
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 60) return 'Agora';
  if (seconds < 3600) return `Há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Há ${Math.floor(seconds / 3600)} h`;
  return `Há ${Math.floor(seconds / 86400)} dia(s)`;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const month = new Date().toISOString().slice(0, 7);
      const response = await api.get<Partial<DashboardData> & { metrics?: Record<string, unknown>; latestNotifications?: DashboardData['latestNotifications'] }>('/admin/dashboard', { params: { month } });
      const payload = response.data ?? {};
      const metrics: Record<string, unknown> = payload.metrics && typeof payload.metrics === 'object'
        ? payload.metrics
        : {};
      setData({
        generatedAt: String(payload.generatedAt ?? new Date().toISOString()),
        month: String(payload.month ?? month),
        metrics: {
          members: Number(metrics.members ?? 0),
          ministries: Number(metrics.ministries ?? 0),
          cells: Number(metrics.cells ?? 0),
          cenacles: Number(metrics.cenacles ?? 0),
          eventsThisMonth: Number(metrics.eventsThisMonth ?? metrics.events ?? 0),
          attendancesThisMonth: Number(metrics.attendancesThisMonth ?? 0),
          somaThisMonth: Number(metrics.somaThisMonth ?? 0),
        },
        latestNotifications: Array.isArray(payload.latestNotifications) ? payload.latestNotifications : [],
      });
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const monthLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date()), []);
  const money = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), []);
  const firstName = user?.name?.split(' ')[0] ?? 'Administrador';

  if (loading && !data) {
    return <Box><Skeleton width={360} height={54} /><Skeleton width={260} /><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', xl: 'repeat(4,1fr)' }, gap: 2.25, mt: 4 }}>{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} variant="rounded" height={152} />)}</Box></Box>;
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
        <Box>
          <Chip label="Área Administrativa" size="small" sx={{ mb: 1.25, bgcolor: 'rgba(211,154,87,.12)', color: 'primary.main', fontWeight: 800 }} />
          <Typography variant="h4">Olá, {firstName}! 👋</Typography>
          <Typography color="text.secondary" mt={0.5}>Visão geral da Missão Brasília em {monthLabel}.</Typography>
        </Box>
        <Tooltip title="Atualizar indicadores"><span><IconButton onClick={() => void load()} disabled={loading} aria-label="Atualizar dashboard">{loading ? <CircularProgress size={22} /> : <RefreshOutlined />}</IconButton></span></Tooltip>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 99 }} />}
      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>Tentar novamente</Button>} sx={{ mb: 3 }}>{error}</Alert>}

      {data && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', xl: 'repeat(4,1fr)' }, gap: 2.25 }}>
            <MetricCard icon={<GroupsOutlined />} label="Membros ativos" value={String(data.metrics.members)} detail="Cadastros ativos na planilha" onClick={() => navigate('/membros')} />
            <MetricCard icon={<VolunteerActivismOutlined />} label="Ministérios" value={String(data.metrics.ministries)} detail="Frentes de serviço cadastradas" onClick={() => navigate('/ministerios')} />
            <MetricCard icon={<Diversity3Outlined />} label="Células" value={String(data.metrics.cells)} detail="Comunidades ativas" onClick={() => navigate('/celulas')} />
            <MetricCard icon={<Diversity3Outlined />} label="Cenáculos" value={String(data.metrics.cenacles)} detail="Encontros ativos" onClick={() => navigate('/cenaculos')} />
            <MetricCard icon={<CalendarMonthOutlined />} label="Eventos do mês" value={String(data.metrics.eventsThisMonth)} detail={`Programação de ${monthLabel}`} onClick={() => navigate('/eventos')} />
            <MetricCard icon={<EventAvailableOutlined />} label="Presenças registradas" value={String(data.metrics.attendancesThisMonth)} detail="Registros no mês atual" />
            <MetricCard icon={<AccountBalanceWalletOutlined />} label="Soma+ no mês" value={money.format(data.metrics.somaThisMonth)} detail="Contribuições confirmadas" onClick={() => navigate('/soma')} />
            <MetricCard icon={<NotificationsNoneOutlined />} label="Notificações recentes" value={String(data.latestNotifications.length)} detail="Últimas atualizações do sistema" onClick={() => navigate('/notificacoes')} />
          </Box>

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box><Typography variant="h6">Últimas notificações</Typography><Typography variant="body2" color="text.secondary">Atividades mais recentes da administração.</Typography></Box>
                <Button size="small" onClick={() => navigate('/notificacoes')}>Ver todas</Button>
              </Stack>
              <Divider />
              {data.latestNotifications.length === 0 ? (
                <Box py={5} textAlign="center"><NotificationsNoneOutlined sx={{ fontSize: 42, color: 'text.secondary', mb: 1 }} /><Typography color="text.secondary">Nenhuma notificação encontrada.</Typography></Box>
              ) : (
                <Stack divider={<Divider flexItem />}>
                  {data.latestNotifications.map((notification) => (
                    <Stack key={notification.id || `${notification.title}-${notification.date}`} direction="row" spacing={2} py={2} alignItems="flex-start">
                      <Avatar sx={{ width: 38, height: 38, bgcolor: notification.read ? 'action.selected' : 'rgba(211,154,87,.14)', color: notification.read ? 'text.secondary' : 'primary.main' }}><NotificationsNoneOutlined fontSize="small" /></Avatar>
                      <Box flex={1} minWidth={0}><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><Typography fontWeight={800}>{notification.title}</Typography>{!notification.read && <Chip label="Nova" size="small" color="primary" />}</Stack><Typography variant="body2" color="text.secondary" mt={0.35}>{notification.message}</Typography><Typography variant="caption" color="text.secondary">{timeAgo(notification.date)} · {notification.type}</Typography></Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
