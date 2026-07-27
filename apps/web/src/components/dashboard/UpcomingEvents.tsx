import { CalendarMonthOutlined, LocationOnOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import type { DashboardEvent } from '../../dashboard/useMemberDashboard';
import { formatDateSafe } from '../../utils/date';

const month = (date: string) =>
  formatDateSafe(date, { month: 'short' }, '---').replace('.', '').toUpperCase();
const day = (date: string) => (date?.length >= 10 ? date.slice(8, 10) : '--');
const when = (event: DashboardEvent) =>
  `${formatDateSafe(event.startDate, { weekday: 'long' }, 'Data não informada')} • ${event.startTime || 'Horário a definir'}`;

export function UpcomingEvents({
  onOpen,
  items,
  loading,
  error,
}: {
  onOpen: () => void;
  items?: DashboardEvent[];
  loading?: boolean;
  error?: string;
}) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} mb={2}>
        <Typography variant="h5" fontWeight={900}>Próximos eventos</Typography>
        <Button onClick={onOpen}>Ver agenda completa →</Button>
      </Stack>

      {loading ? (
        <Box textAlign="center" py={5}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="warning">{error}</Alert>
      ) : safeItems.length === 0 ? (
        <Alert severity="info">Nenhum evento futuro publicado.</Alert>
      ) : (
        <Stack spacing={1.25}>
          {safeItems.map((event, index) => (
            <Card key={event.id || `${event.startDate}-${event.title}-${index}`} sx={{ p: 2, borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
                <Box sx={{ minWidth: 70, textAlign: 'center', borderRight: { sm: '1px solid' }, borderColor: 'divider', pr: { sm: 2 } }}>
                  <Typography color="primary.main" variant="h4" fontWeight={900}>{day(event.startDate)}</Typography>
                  <Typography color="primary.main" fontWeight={800}>{month(event.startDate)}</Typography>
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={800} fontSize={18}>{event.title || 'Evento'}</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={{ xs: 0.5, sm: 2 }} mt={0.75} color="text.secondary">
                    <Typography fontSize={13} display="flex" gap={0.7} alignItems="center">
                      <CalendarMonthOutlined fontSize="small" />{when(event)}
                    </Typography>
                    <Typography fontSize={13} display="flex" gap={0.7} alignItems="center">
                      <LocationOnOutlined fontSize="small" />{event.location || 'Local a definir'}
                    </Typography>
                  </Stack>
                </Box>
                <Chip label={event.category || 'EVENTO'} size="small" />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
