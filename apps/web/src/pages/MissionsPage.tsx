import {
  AccountTreeOutlined, AddOutlined, CalendarMonthOutlined, ChevronLeftOutlined,
  ChevronRightOutlined, EditOutlined, SyncOutlined,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';
import type { Mission, MissionaryAgenda, MissionaryAgendaStatus } from '../types';

type MissionForm = {
  name: string; acronym: string; description: string; city: string; state: string; country: string;
};
const empty: MissionForm = {
  name: '', acronym: '', description: '', city: '', state: '', country: 'Brasil',
};
const publicStatuses: MissionaryAgendaStatus[] = [
  'AGUARDANDO_INDICACOES', 'ENVIADA_AOS_MEMBROS', 'CONCLUIDA',
];
const statusLabels: Partial<Record<MissionaryAgendaStatus, string>> = {
  AGUARDANDO_INDICACOES: 'Aprovada',
  ENVIADA_AOS_MEMBROS: 'Equipe enviada',
  CONCLUIDA: 'Concluída',
};
const dateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

function MissionCalendar({ items }: { items: MissionaryAgenda[] }) {
  const [month, setMonth] = useState(() => {
    const next = items.find((item) => item.startDate >= dateKey(new Date()));
    const reference = next ? new Date(`${next.startDate}T12:00:00`) : new Date();
    return new Date(reference.getFullYear(), reference.getMonth(), 1);
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
    <Paper sx={{ p: { xs: 1.5, md: 2.5 }, mb: 4, overflowX: 'auto' }}>
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
          const scheduled = items.filter(
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

export function MissionsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'DEVELOPER');
  const [items, setItems] = useState<Mission[]>([]);
  const [agendaItems, setAgendaItems] = useState<MissionaryAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [form, setForm] = useState<MissionForm>(empty);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [missions, agenda] = await Promise.all([
        api.get<Mission[]>('/missions'),
        api.get<MissionaryAgenda[]>('/missionary-agenda'),
      ]);
      setItems(missions.data);
      setAgendaItems(agenda.data.filter((item) => publicStatuses.includes(item.status)));
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (mission: Mission) => {
    setEditing(mission);
    setForm({
      name: mission.name,
      acronym: mission.acronym,
      description: mission.description,
      city: mission.city,
      state: mission.state,
      country: mission.country,
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editing) await api.patch(`/missions/${editing.id}`, form);
      else await api.post('/missions', form);
      setOpen(false);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };
  const seed = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/missions/seed/default');
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4">Missões</Typography>
          <Typography color="text.secondary">
            Estrutura territorial e calendário missionário da Comunidade Colo de Deus.
          </Typography>
        </Box>
        {canManage && (
          <Stack direction="row" gap={1}>
            <Button
              variant="outlined"
              startIcon={<SyncOutlined />}
              onClick={() => void seed()}
              disabled={saving}
            >
              Aplicar seed
            </Button>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={startCreate}>
              Nova missão
            </Button>
          </Stack>
        )}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box textAlign="center" py={10}><CircularProgress /></Box>
      ) : (
        <>
          <MissionCalendar items={agendaItems} />
          <Typography variant="h5" mb={2}>Comunidades missionárias</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' },
              gap: 2,
            }}
          >
            {items.map((mission) => (
              <Card key={mission.id} sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2,
                      bgcolor: 'rgba(158,105,57,.18)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <AccountTreeOutlined color="primary" />
                  </Box>
                  {canManage && (
                    <IconButton
                      onClick={() => startEdit(mission)}
                      aria-label={`Editar ${mission.name}`}
                    >
                      <EditOutlined />
                    </IconButton>
                  )}
                </Stack>
                <Stack direction="row" gap={1} alignItems="center" mt={2}>
                  <Typography variant="h5">{mission.name}</Typography>
                  {mission.acronym && <Chip size="small" label={mission.acronym} />}
                </Stack>
                <Typography color="text.secondary" minHeight={48} mt={1}>
                  {mission.description || 'Sem descrição.'}
                </Typography>
                <Typography mt={2}>
                  {[mission.city, mission.state, mission.country].filter(Boolean).join(' • ')}
                </Typography>
                <Chip
                  sx={{ mt: 2 }}
                  label={`${mission.ministriesCount} ministérios`}
                  variant="outlined"
                />
              </Card>
            ))}
          </Box>
        </>
      )}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Editar missão' : 'Nova missão'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField required label="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <TextField label="Sigla" value={form.acronym} onChange={(event) => setForm({ ...form, acronym: event.target.value })} />
            <TextField label="Descrição" multiline minRows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField fullWidth label="Cidade" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              <TextField fullWidth label="Estado" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
            </Stack>
            <TextField label="País" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving || !form.name.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
