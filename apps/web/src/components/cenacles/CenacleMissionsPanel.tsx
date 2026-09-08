import {
  AddOutlined,
  EditOutlined,
  RateReviewOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';

type MemberOption = { id: string; name: string };
type MinistryOption = { id: string; name: string };
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
  canManage: boolean;
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

export function CenacleMissionsPanel() {
  const [items, setItems] = useState<Mission[]>([]),
    [members, setMembers] = useState<MemberOption[]>([]),
    [ministries, setMinistries] = useState<MinistryOption[]>([]);
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
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, options] = await Promise.all([
        api.get<Mission[]>('/cenacle-missions'),
        api.get<{ members: MemberOption[]; ministries: MinistryOption[]; canCreate: boolean }>(
          '/cenacle-missions/options',
        ),
      ]);
      setItems(list.data);
      setMembers(options.data.members);
      setMinistries(options.data.ministries);
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
  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Missões do Ministério de Missões
          </Typography>
          <Typography color="text.secondary">
            Agenda das missões e feedback identificado dos participantes enviados.
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
                    Enviados: {item.participantNames.join(', ') || 'Nenhum'}
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'row', md: 'column' }} alignItems="stretch">
                  {item.canManage && (
                    <Button startIcon={<EditOutlined />} onClick={() => openEdit(item)}>
                      Editar
                    </Button>
                  )}
                  {item.canManage && (
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
            <Autocomplete
              multiple
              options={members}
              getOptionLabel={(m) => m.name}
              value={members.filter((m) => form.participantIds.includes(m.id))}
              onChange={(_, value) => setForm({ ...form, participantIds: value.map((m) => m.id) })}
              renderInput={(params) => <TextField {...params} required label="Membros enviados" />}
            />
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
            disabled={
              saving ||
              !form.title.trim() ||
              !form.location.trim() ||
              !form.ministryId ||
              !form.participantIds.length
            }
            onClick={() => void save()}
          >
            Salvar
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
