import { ChevronLeft, ChevronRight, SearchOutlined } from '@mui/icons-material';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { MissionEvent } from '../types';

const monthLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`));
const isoMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export function AgendaPage() {
  const [month, setMonth] = useState('2026-07');
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<MissionEvent[]>('/events', { params: { month, category: category || undefined, q: search || undefined } }),
      api.get<string[]>('/events/categories'),
    ])
      .then(([eventResponse, categoryResponse]) => {
        setEvents(eventResponse.data);
        setCategories(categoryResponse.data);
        setError('');
      })
      .catch(() => setError('Não foi possível carregar a agenda.'))
      .finally(() => setLoading(false));
  }, [month, category, search]);

  const days = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const total = new Date(year, monthNumber, 0).getDate();
    return [...Array(first.getDay()).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)];
  }, [month]);

  const moveMonth = (offset: number) => {
    const [year, monthNumber] = month.split('-').map(Number);
    setMonth(isoMonth(new Date(year, monthNumber - 1 + offset, 1)));
  };

  return (
    <Box>
      <Typography variant="h4">Agenda</Typography>
      <Typography color="text.secondary" mt={0.5} mb={3}>Acompanhe encontros, formações, retiros e celebrações da missão.</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} mb={3}>
        <TextField
          fullWidth
          placeholder="Buscar evento, local ou ministério"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
        />
        <TextField select label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)} sx={{ minWidth: 210 }}>
          <MenuItem value="">Todas</MenuItem>
          {categories.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
        </TextField>
      </Stack>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <IconButton onClick={() => moveMonth(-1)}><ChevronLeft /></IconButton>
            <Typography variant="h5" textTransform="capitalize">{monthLabel(month)}</Typography>
            <IconButton onClick={() => moveMonth(1)}><ChevronRight /></IconButton>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 0.7 }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day) => <Typography key={day} textAlign="center" color="text.secondary" fontSize={12} py={1}>{day}</Typography>)}
            {days.map((day, index) => {
              const date = day ? `${month}-${String(day).padStart(2, '0')}` : '';
              const dayEvents = events.filter((event) => event.startDate === date);
              return (
                <Box
                  key={`${day ?? 'blank'}-${index}`}
                  sx={{ minHeight: { xs: 78, md: 118 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1, bgcolor: dayEvents.length ? 'rgba(155,107,62,.08)' : 'transparent' }}
                >
                  {day && <Typography fontWeight={700}>{day}</Typography>}
                  <Stack gap={0.5} mt={0.5}>
                    {dayEvents.slice(0, 2).map((event) => (
                      <Chip key={event.id} label={`${event.startTime} ${event.title}`} size="small" onClick={() => navigate(`/eventos/${event.id}`)} sx={{ justifyContent: 'flex-start', maxWidth: '100%' }} />
                    ))}
                    {dayEvents.length > 2 && <Typography fontSize={11} color="primary.main">+{dayEvents.length - 2} evento(s)</Typography>}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
      {loading && <Box py={4} textAlign="center"><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
}
