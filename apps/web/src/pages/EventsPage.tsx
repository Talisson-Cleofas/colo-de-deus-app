import {
  AddOutlined,
  DeleteOutline,
  EditOutlined,
  PublishOutlined,
  SearchOutlined,
  UnpublishedOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { EventCard } from '../components/events/EventCard';
import { api, apiErrorMessage } from '../services/api';
import type { EventManagementOptions, EventResponse, EventScope, MissionEvent } from '../types';
import { formatDateTimeSafe, isValidDateOnly } from '../utils/date';
import { usePermission } from '../rbac/usePermission';
import { Permission } from '../rbac/permissions';

type FormState = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  category: string;
  scope: EventScope;
  ministryId: string;
  cellId: string;
  cenacleId: string;
  capacity: number;
  image: string;
  confirmationRequired: boolean;
  published: boolean;
};
const emptyForm: FormState = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  address: '',
  category: '',
  scope: 'GERAL',
  ministryId: '',
  cellId: '',
  cenacleId: '',
  capacity: 0,
  image: '',
  confirmationRequired: true,
  published: false,
};

export function EventsPage() {
  const { user } = useAuth();
  const { hasPermission, hasMinistryModule } = usePermission();
  const isMember = user?.profile === 'MEMBER';
  const canCreateByRbac = hasPermission(Permission.EVENTS_CREATE) && hasMinistryModule('EVENTOS');
  const [tab, setTab] = useState(0),
    [events, setEvents] = useState<MissionEvent[]>([]),
    [responses, setResponses] = useState<EventResponse[]>([]),
    [options, setOptions] = useState<EventManagementOptions>({
      canCreate: false,
      canCreateGeneral: false,
      ministries: [],
      cells: [],
      cenacles: [],
    });
  const [categories, setCategories] = useState<string[]>([]),
    [category, setCategory] = useState(''),
    [scope, setScope] = useState(''),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [editing, setEditing] = useState<MissionEvent | null>(null),
    [form, setForm] = useState<FormState>(emptyForm);
  const load = () => {
    setLoading(true);
    const eventRequest = api.get<MissionEvent[]>('/events', {
      params: {
        category: category || undefined,
        scope: scope || undefined,
        q: search || undefined,
      },
    });
    const categoryRequest = api.get<string[]>('/events/categories');
    if (isMember) {
      Promise.all([eventRequest, categoryRequest])
        .then(([a, b]) => {
          setEvents(a.data);
          setCategories(b.data);
          setOptions({
            canCreate: false,
            canCreateGeneral: false,
            ministries: [],
            cells: [],
            cenacles: [],
          });
          setResponses([]);
          setTab(0);
          setError('');
        })
        .catch((e) => setError(apiErrorMessage(e)))
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      eventRequest,
      categoryRequest,
      api.get<EventManagementOptions>('/events/management/options'),
      api.get<EventResponse[]>('/events/responses/inbox'),
    ])
      .then(([a, b, c, d]) => {
        setEvents(a.data);
        setCategories(b.data);
        setOptions(c.data);
        setResponses(d.data);
        setError('');
      })
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [category, scope, search]);
  const availableScopes = useMemo(
    () =>
      [
        { value: 'GERAL', label: 'Geral', enabled: options.canCreateGeneral },
        { value: 'MINISTERIO', label: 'Ministério', enabled: options.ministries.length > 0 },
        { value: 'CELULA', label: 'Célula', enabled: options.cells.length > 0 },
        { value: 'CENACULO', label: 'Cenáculo', enabled: options.cenacles.length > 0 },
      ].filter((x) => x.enabled),
    [options],
  );
  const openCreate = () => {
    const first = (availableScopes[0]?.value || 'GERAL') as EventScope;
    setEditing(null);
    setForm({ ...emptyForm, scope: first });
    setOpen(true);
  };
  const openEdit = (e: MissionEvent) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description,
      startDate: e.startDate,
      endDate: e.endDate,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      address: e.address,
      category: e.category,
      scope: e.scope,
      ministryId: e.ministryId,
      cellId: e.cellId,
      cenacleId: e.cenacleId,
      capacity: e.capacity,
      image: e.image,
      confirmationRequired: e.confirmationRequired,
      published: e.published,
    });
    setOpen(true);
  };
  const save = async () => {
    setError('');
    if (!form.title.trim()) {
      setError('Informe o título do evento.');
      return;
    }
    if (!isValidDateOnly(form.startDate)) {
      setError('Informe uma data inicial válida.');
      return;
    }
    if (form.endDate && !isValidDateOnly(form.endDate)) {
      setError('Informe uma data final válida.');
      return;
    }
    if (form.endDate && form.endDate < form.startDate) {
      setError('A data final não pode ser anterior à data inicial.');
      return;
    }
    setSaving(true);
    try {
      if (editing) await api.patch(`/events/${editing.id}`, form);
      else await api.post('/events', form);
      setOpen(false);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const remove = async (e: MissionEvent) => {
    if (!confirm(`Excluir o evento ${e.title}?`)) return;
    try {
      await api.delete(`/events/${e.id}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };
  const togglePublication = async (e: MissionEvent) => {
    try {
      await api.patch(`/events/${e.id}/publication`, { published: !e.published });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };
  const scopeLabel = (e: MissionEvent) =>
    e.scope === 'MINISTERIO'
      ? e.ministry
      : e.scope === 'CELULA'
        ? e.cellName
        : e.scope === 'CENACULO'
          ? e.cenacleName
          : 'Toda a missão';
  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Eventos</Typography>
          <Typography color="text.secondary" mt={0.5}>
            Criação, publicação, confirmações e justificativas por área responsável.
          </Typography>
        </Box>
        {options.canCreate && canCreateByRbac && (
          <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>
            Criar evento
          </Button>
        )}
      </Stack>
      {!isMember && (
        <Paper sx={{ mt: 2, mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Eventos" />
            <Tab label={`Presenças e justificativas (${responses.length})`} />
          </Tabs>
        </Paper>
      )}
      {tab === 1 ? (
        <Box>
          {responses.length === 0 ? (
            <Alert severity="info">
              Nenhuma confirmação ou justificativa disponível para sua responsabilidade.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {responses.map((r) => (
                <Paper key={r.id} sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    gap={1}
                  >
                    <Box>
                      <Typography fontWeight={800}>
                        {r.memberName} — {r.eventTitle}
                      </Typography>
                      <Typography color="text.secondary" fontSize={14}>
                        {r.memberMinistry || 'Sem ministério'} •{' '}
                        {formatDateTimeSafe(r.createdAt, 'Data não informada')}
                      </Typography>
                      {r.justification && <Typography mt={1}>{r.justification}</Typography>}
                    </Box>
                    <Chip
                      color={r.status === 'CONFIRMED' ? 'success' : 'warning'}
                      label={
                        r.status === 'CONFIRMED' ? 'Presença confirmada' : 'Ausência justificada'
                      }
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      ) : (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} my={3}>
            <TextField
              fullWidth
              placeholder="Buscar eventos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {categories.map((i) => (
                <MenuItem key={i} value={i}>
                  {i}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Abrangência"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="GERAL">Geral</MenuItem>
              <MenuItem value="MINISTERIO">Ministério</MenuItem>
              <MenuItem value="CELULA">Célula</MenuItem>
              <MenuItem value="CENACULO">Cenáculo</MenuItem>
            </TextField>
          </Stack>
          {loading ? (
            <Box py={10} textAlign="center">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : events.length === 0 ? (
            <Alert severity="info">Nenhum evento encontrado.</Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                gap: 2,
                alignItems: 'stretch',
              }}
            >
              {events.map((e) => (
                <Box key={e.id} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <EventCard event={e} />
                  <Paper
                    sx={{
                      p: 1.5,
                      mt: -1,
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      position: 'relative',
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                      gap={1}
                    >
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip size="small" label={scopeLabel(e)} variant="outlined" />
                        <Chip
                          size="small"
                          color={e.published ? 'success' : 'default'}
                          label={e.published ? 'Publicado' : 'Rascunho'}
                        />
                      </Stack>
                      {!isMember && e.canManage && (
                        <Stack direction="row" flexWrap="wrap" justifyContent="flex-end">
                          <Button
                            size="small"
                            startIcon={<EditOutlined />}
                            onClick={() => openEdit(e)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteOutline />}
                            onClick={() => void remove(e)}
                          >
                            Excluir
                          </Button>
                          <Button
                            size="small"
                            startIcon={e.published ? <UnpublishedOutlined /> : <PublishOutlined />}
                            onClick={() => void togglePublication(e)}
                          >
                            {e.published ? 'Despublicar' : 'Publicar'}
                          </Button>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Editar evento' : 'Criar evento'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              required
              label="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              label="Categoria"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <TextField
              select
              label="Abrangência"
              value={form.scope}
              onChange={(e) =>
                setForm({
                  ...form,
                  scope: e.target.value as EventScope,
                  ministryId: '',
                  cellId: '',
                  cenacleId: '',
                })
              }
            >
              {availableScopes.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            {form.scope === 'MINISTERIO' && (
              <TextField
                select
                label="Ministério"
                value={form.ministryId}
                onChange={(e) => setForm({ ...form, ministryId: e.target.value })}
              >
                {options.ministries.map((x) => (
                  <MenuItem key={x.id} value={x.id}>
                    {x.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {form.scope === 'CELULA' && (
              <TextField
                select
                label="Célula"
                value={form.cellId}
                onChange={(e) => setForm({ ...form, cellId: e.target.value })}
              >
                {options.cells.map((x) => (
                  <MenuItem key={x.id} value={x.id}>
                    {x.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {form.scope === 'CENACULO' && (
              <TextField
                select
                label="Cenáculo"
                value={form.cenacleId}
                onChange={(e) => setForm({ ...form, cenacleId: e.target.value })}
              >
                {options.cenacles.map((x) => (
                  <MenuItem key={x.id} value={x.id}>
                    {x.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              required
              type="date"
              label="Data inicial"
              value={form.startDate}
              onChange={(e) =>
                setForm({
                  ...form,
                  startDate: e.target.value,
                  endDate: form.endDate || e.target.value,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="Data final"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="time"
              label="Início"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="time"
              label="Término"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Local"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <TextField
              label="Endereço"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <TextField
              type="number"
              label="Limite de participantes"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            />
            <TextField
              label="Imagem (URL)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
            <TextField
              label="Descrição"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              sx={{ gridColumn: { md: '1/-1' } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.confirmationRequired}
                    onChange={(e) => setForm({ ...form, confirmationRequired: e.target.checked })}
                  />
                }
                label="Exigir confirmação"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                }
                label="Publicar imediatamente"
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              saving ||
              !form.title.trim() ||
              !form.startDate ||
              (form.scope === 'MINISTERIO' && !form.ministryId) ||
              (form.scope === 'CELULA' && !form.cellId) ||
              (form.scope === 'CENACULO' && !form.cenacleId)
            }
            onClick={() => void save()}
          >
            {editing ? 'Salvar alterações' : 'Criar evento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
