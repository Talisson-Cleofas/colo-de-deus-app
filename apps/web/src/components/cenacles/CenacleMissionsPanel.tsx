import {
  AddOutlined,
  CalendarMonthOutlined,
  CancelOutlined,
  CheckCircleOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  EditOutlined,
  LockOpenOutlined,
  RateReviewOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';

type MinistryOption = { id: string; name: string };
type MemberOption = { id: string; name: string };
type Mission = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  ministryId: string;
  status: string;
  participantIds: string[];
  participantNames: string[];
  authorizedYearTwoIds: string[];
  authorizedYearTwoNames: string[];
  participants: { id: string; name: string; presenceStatus: string }[];
  presenceStatus: string;
  canConfirmPresence: boolean;
  participationBlockedReason?: string;
  confirmedCount: number;
  feedbackOpen: boolean;
  canManage: boolean;
  canManageFeedback: boolean;
  canGiveFeedback: boolean;
  feedbackSubmitted: boolean;
  feedbackCount: number;
};
type Feedback = {
  id: string;
  memberName: string;
  rating: number;
  strengths: string;
  improvements: string;
  createdAt: string;
};
const empty = () => ({
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  time: '19:00',
  location: '',
  ministryId: '',
  participantIds: [] as string[],
  status: 'AGENDADA',
});

const dateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

function MissionsCalendar({ items }: { items: Mission[] }) {
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
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(month);
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
            <Typography variant="h6" fontWeight={800}>Calendário de missões</Typography>
            <Typography color="text.secondary" variant="body2">
              Programação do Ministério de Missões.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5}>
          <IconButton onClick={() => changeMonth(-1)} aria-label="Mês anterior">
            <ChevronLeftOutlined />
          </IconButton>
          <Typography
            fontWeight={700}
            textTransform="capitalize"
            textAlign="center"
            sx={{ minWidth: 170 }}
          >
            {label}
          </Typography>
          <IconButton onClick={() => changeMonth(1)} aria-label="Próximo mês">
            <ChevronRightOutlined />
          </IconButton>
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
          >
            {day}
          </Typography>
        ))}
        {days.map((date, index) => {
          if (!date) return <Box key={`empty-${index}`} minHeight={104} />;
          const key = dateKey(date);
          const scheduled = items.filter((item) => item.date === key);
          const today = key === dateKey(new Date());
          return (
            <Box
              key={key}
              sx={{
                minWidth: 0,
                minHeight: 104,
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
                  <Box
                    key={item.id}
                    title={`${item.title}${item.location ? ` • ${item.location}` : ''}`}
                    sx={{
                      px: 0.75,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: 'rgba(224, 158, 84, 0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} noWrap display="block">
                      {item.time ? `${item.time} ` : ''}{item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {item.status}
                    </Typography>
                  </Box>
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

export function CenacleMissionsPanel() {
  const [items, setItems] = useState<Mission[]>([]),
    [ministries, setMinistries] = useState<MinistryOption[]>([]),
    [yearTwoMembers, setYearTwoMembers] = useState<MemberOption[]>([]);
  const [canCreate, setCanCreate] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [formOpen, setFormOpen] = useState(false),
    [editing, setEditing] = useState<Mission | null>(null),
    [form, setForm] = useState(empty());
  const [feedbackMission, setFeedbackMission] = useState<Mission | null>(null),
    [feedback, setFeedback] = useState({ rating: 0, strengths: '', improvements: '' });
  const [resultsMission, setResultsMission] = useState<Mission | null>(null),
    [results, setResults] = useState<Feedback[]>([]);
  const [authorizationMission, setAuthorizationMission] = useState<Mission | null>(null),
    [authorizationMemberId, setAuthorizationMemberId] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, options] = await Promise.all([
        api.get<Mission[]>('/cenacle-missions'),
        api.get<{
          ministries: MinistryOption[];
          yearTwoMembers: MemberOption[];
          canCreate: boolean;
        }>('/cenacle-missions/options'),
      ]);
      setItems(list.data);
      setMinistries(options.data.ministries);
      setYearTwoMembers(options.data.yearTwoMembers || []);
      setCanCreate(options.data.canCreate);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const openCreate = () => {
    setEditing(null);
    const value = empty();
    if (ministries.length === 1) value.ministryId = ministries[0].id;
    setForm(value);
    setFormOpen(true);
  };
  const openEdit = (item: Mission) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      date: item.date,
      time: item.time,
      location: item.location,
      ministryId: item.ministryId,
      participantIds: item.participantIds,
      status: item.status,
    });
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(empty());
  };
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      editing
        ? await api.patch(`/cenacle-missions/${editing.id}`, form)
        : await api.post('/cenacle-missions', form);
      setSuccess(editing ? 'Missão atualizada.' : 'Missão criada.');
      closeForm();
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const sendFeedback = async () => {
    if (!feedbackMission) return;
    setSaving(true);
    try {
      await api.post(`/cenacle-missions/${feedbackMission.id}/feedback`, feedback);
      setSuccess('Feedback enviado com sucesso.');
      setFeedbackMission(null);
      setFeedback({ rating: 0, strengths: '', improvements: '' });
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const showResults = async (item: Mission) => {
    try {
      const response = await api.get<Feedback[]>(`/cenacle-missions/${item.id}/feedback`);
      setResults(response.data);
      setResultsMission(item);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };
  const confirmPresence = async (item: Mission, confirmed: boolean) => {
    try {
      await api.post(`/cenacle-missions/${item.id}/presence`, { confirmed });
      setSuccess(confirmed ? 'Presença confirmada.' : 'Participação recusada.');
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };
  const openMissionFeedback = async (item: Mission) => {
    try {
      const response = await api.post<{ notified: number }>(
        `/cenacle-missions/${item.id}/feedback/open`,
      );
      setSuccess(`Feedback liberado para ${response.data.notified} participante(s) confirmado(s).`);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };
  const authorizeYearTwo = async () => {
    if (!authorizationMission || !authorizationMemberId) return;
    setSaving(true);
    try {
      const response = await api.post<{ message: string }>(
        `/cenacle-missions/${authorizationMission.id}/authorize-year-two`,
        { memberId: authorizationMemberId },
      );
      setSuccess(response.data.message);
      setAuthorizationMission(null);
      setAuthorizationMemberId('');
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Missões do Ministério de Missões
          </Typography>
          <Typography color="text.secondary">
            Agenda das missões e feedback identificado dos participantes confirmados.
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>
            Criar missão
          </Button>
        )}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {loading ? (
        <Box textAlign="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <MissionsCalendar items={items} />
          <Stack gap={2}>
            {items.map((item) => (
            <Card key={item.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                <Box>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Typography variant="h6" fontWeight={800}>
                      {item.title}
                    </Typography>
                    <Chip size="small" label={item.status} />
                  </Stack>
                  <Typography color="text.secondary" mt={0.5}>
                    {item.description || 'Sem descrição.'}
                  </Typography>
                  <Typography mt={1}>
                    {item.date.split('-').reverse().join('/')} às {item.time} • {item.location}
                  </Typography>
                  <Typography color="text.secondary" mt={1}>
                    Participação confirmada:{' '}
                    {item.participantNames.join(', ') || 'Ninguém confirmou ainda'}
                  </Typography>
                  {item.authorizedYearTwoNames.length ? (
                    <Typography color="text.secondary" mt={0.5}>
                      Ano 2 autorizado: {item.authorizedYearTwoNames.join(', ')}
                    </Typography>
                  ) : null}
                  <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                    {item.participants.map((participant) => (
                      <Chip
                        key={participant.id}
                        size="small"
                        label={`${participant.name}: ${participant.presenceStatus.toLowerCase()}`}
                        color={
                          participant.presenceStatus === 'CONFIRMADA'
                            ? 'success'
                            : participant.presenceStatus === 'RECUSADA'
                              ? 'error'
                              : 'default'
                        }
                      />
                    ))}
                  </Stack>
                </Box>
                <Stack direction={{ xs: 'row', md: 'column' }} alignItems="stretch">
                  {item.canManage && (
                    <Button startIcon={<EditOutlined />} onClick={() => openEdit(item)}>
                      Editar
                    </Button>
                  )}
                  {item.canManage &&
                  yearTwoMembers.some(
                    (member) => !item.authorizedYearTwoIds.includes(member.id),
                  ) ? (
                    <Button
                      startIcon={<LockOpenOutlined />}
                      onClick={() => setAuthorizationMission(item)}
                    >
                      Autorizar Ano 2
                    </Button>
                  ) : null}
                  {item.canManageFeedback && !item.feedbackOpen && (
                    <Button
                      startIcon={<LockOpenOutlined />}
                      onClick={() => void openMissionFeedback(item)}
                    >
                      Liberar feedback ({item.confirmedCount})
                    </Button>
                  )}
                  {item.feedbackOpen && <Chip color="info" label="Feedback liberado" />}
                  {item.canConfirmPresence && item.presenceStatus !== 'CONFIRMADA' && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleOutlined />}
                      onClick={() => void confirmPresence(item, true)}
                    >
                      Confirmar presença
                    </Button>
                  )}
                  {item.participationBlockedReason ? (
                    <Alert severity="info" sx={{ width: '100%' }}>
                      {item.participationBlockedReason}
                    </Alert>
                  ) : null}
                  {item.canConfirmPresence && item.presenceStatus !== 'RECUSADA' && (
                    <Button
                      color="error"
                      startIcon={<CancelOutlined />}
                      onClick={() => void confirmPresence(item, false)}
                    >
                      Não participarei
                    </Button>
                  )}
                  {item.canManageFeedback && (
                    <Button
                      startIcon={<VisibilityOutlined />}
                      onClick={() => void showResults(item)}
                    >
                      Feedbacks ({item.feedbackCount})
                    </Button>
                  )}
                  {item.canGiveFeedback && (
                    <Button
                      variant="contained"
                      startIcon={<RateReviewOutlined />}
                      onClick={() => setFeedbackMission(item)}
                    >
                      Enviar feedback
                    </Button>
                  )}
                  {item.feedbackSubmitted && <Chip color="success" label="Feedback enviado" />}
                </Stack>
              </Stack>
            </Card>
            ))}
            {!items.length && (
              <Alert severity="info">Nenhuma missão disponível para este perfil.</Alert>
            )}
          </Stack>
        </>
      )}
      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Editar missão' : 'Criar missão'}</DialogTitle>
        <DialogContent dividers>
          <Stack gap={2}>
            <TextField
              required
              label="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              label="Descrição"
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField
                required
                fullWidth
                type="date"
                label="Data"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                required
                fullWidth
                type="time"
                label="Horário"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              required
              label="Local"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <TextField
              select
              required
              label="Ministério"
              value={form.ministryId}
              onChange={(e) => setForm({ ...form, ministryId: e.target.value })}
            >
              {ministries.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="AGENDADA">Agendada</MenuItem>
              <MenuItem value="CONCLUIDA">Concluída</MenuItem>
              <MenuItem value="CANCELADA">Cancelada</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving || !form.title.trim() || !form.location.trim() || !form.ministryId}
            onClick={() => void save()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(authorizationMission)}
        onClose={() => setAuthorizationMission(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Autorizar membro do Ano 2 — {authorizationMission?.title}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            A autorização vale somente para esta missão e será registrada.
          </Alert>
          <TextField
            select
            fullWidth
            label="Membro do Ano 2"
            value={authorizationMemberId}
            onChange={(event) => setAuthorizationMemberId(event.target.value)}
          >
            {yearTwoMembers
              .filter((member) => !authorizationMission?.authorizedYearTwoIds.includes(member.id))
              .map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuthorizationMission(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving || !authorizationMemberId}
            onClick={() => void authorizeYearTwo()}
          >
            Autorizar e notificar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(feedbackMission)}
        onClose={() => setFeedbackMission(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Feedback — {feedbackMission?.title}</DialogTitle>
        <DialogContent dividers>
          <Stack gap={2}>
            <Box>
              <Typography mb={1}>Como foi a missão?</Typography>
              <Rating
                value={feedback.rating}
                onChange={(_, value) => setFeedback({ ...feedback, rating: value || 0 })}
              />
            </Box>
            <TextField
              label="Pontos positivos"
              multiline
              minRows={3}
              value={feedback.strengths}
              onChange={(e) => setFeedback({ ...feedback, strengths: e.target.value })}
            />
            <TextField
              label="Sugestões de melhoria"
              multiline
              minRows={3}
              value={feedback.improvements}
              onChange={(e) => setFeedback({ ...feedback, improvements: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackMission(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving || !feedback.rating}
            onClick={() => void sendFeedback()}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(resultsMission)}
        onClose={() => setResultsMission(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Feedbacks identificados — {resultsMission?.title}</DialogTitle>
        <DialogContent dividers>
          <Stack gap={2}>
            {results.map((item) => (
              <Card key={item.id} variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={800}>{item.memberName}</Typography>
                <Rating readOnly value={item.rating} />
                <Typography mt={1}>
                  <b>Pontos positivos:</b> {item.strengths || 'Não informado'}
                </Typography>
                <Typography>
                  <b>Melhorias:</b> {item.improvements || 'Não informado'}
                </Typography>
              </Card>
            ))}
            {!results.length && <Alert severity="info">Nenhum feedback enviado.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsMission(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
