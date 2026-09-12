import { CalendarMonthOutlined, ChevronLeftOutlined, ChevronRightOutlined } from '@mui/icons-material';
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import type { MissionaryAgenda, MissionaryAgendaStatus } from '../../types';

const visibleStatuses: MissionaryAgendaStatus[] = [
  'AGUARDANDO_INDICACOES',
  'ENVIADA_AOS_MEMBROS',
  'CONCLUIDA',
];
const statusLabels: Partial<Record<MissionaryAgendaStatus, string>> = {
  AGUARDANDO_INDICACOES: 'Aprovada',
  ENVIADA_AOS_MEMBROS: 'Equipe enviada',
  CONCLUIDA: 'Concluída',
};
const dateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

export function MissionaryAgendaCalendar({ items }: { items: MissionaryAgenda[] }) {
  const publishedItems = useMemo(
    () => items.filter((item) => visibleStatuses.includes(item.status)),
    [items],
  );
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const offset = new Date(year, monthIndex, 1).getDay();
    const total = new Date(year, monthIndex + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: total }, (_, index) => new Date(year, monthIndex, index + 1)),
    ];
  }, [month]);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month);
  const changeMonth = (offset: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <Paper sx={{ p: { xs: 1.5, md: 2.5 }, mb: 3, overflowX: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        gap={1.5}
        mb={2}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <CalendarMonthOutlined color="primary" />
          <Box>
            <Typography variant="h5">Calendário de missões</Typography>
            <Typography color="text.secondary" variant="body2">
              Missões aprovadas, enviadas e concluídas.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5}>
          <Tooltip title="Mês anterior">
            <IconButton onClick={() => changeMonth(-1)} aria-label="Mês anterior">
              <ChevronLeftOutlined />
            </IconButton>
          </Tooltip>
          <Typography
            fontWeight={700}
            textTransform="capitalize"
            textAlign="center"
            sx={{ minWidth: 170 }}
          >
            {label}
          </Typography>
          <Tooltip title="Próximo mês">
            <IconButton onClick={() => changeMonth(1)} aria-label="Próximo mês">
              <ChevronRightOutlined />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Box
        sx={{
          minWidth: 700,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 1,
        }}
      >
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <Typography
            key={day}
            variant="caption"
            color="text.secondary"
            textAlign="center"
            fontWeight={700}
            py={0.5}
          >
            {day}
          </Typography>
        ))}
        {days.map((date, index) => {
          if (!date) return <Box key={`empty-${index}`} minHeight={112} />;
          const key = dateKey(date);
          const scheduled = publishedItems.filter(
            (item) => item.startDate <= key && (item.endDate || item.startDate) >= key,
          );
          const today = key === dateKey(new Date());
          return (
            <Box
              key={key}
              sx={{
                minWidth: 0,
                minHeight: 112,
                p: 1,
                border: '1px solid',
                borderColor: today ? 'primary.main' : 'divider',
                borderRadius: 1.5,
                bgcolor: today ? 'rgba(224, 158, 84, 0.08)' : 'background.default',
              }}
            >
              <Typography variant="caption" fontWeight={today ? 800 : 600}>
                {date.getDate()}
              </Typography>
              <Stack gap={0.5} mt={0.5}>
                {scheduled.slice(0, 2).map((item) => (
                  <Tooltip
                    key={item.id}
                    title={`${item.title}${item.location ? ` • ${item.location}` : ''}`}
                  >
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: 'rgba(224, 158, 84, 0.18)',
                        overflow: 'hidden',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} noWrap display="block">
                        {item.startTime ? `${item.startTime} ` : ''}{item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {statusLabels[item.status]}
                      </Typography>
                    </Box>
                  </Tooltip>
                ))}
                {scheduled.length > 2 && (
                  <Typography variant="caption" color="primary.main" fontWeight={700}>
                    +{scheduled.length - 2} missões
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
