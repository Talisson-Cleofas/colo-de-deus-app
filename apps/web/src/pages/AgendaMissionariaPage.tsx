import {
  AddOutlined,
  ApprovalOutlined,
  CalendarMonthOutlined,
  EditOutlined,
  ForwardToInboxOutlined,
  LocationOnOutlined,
  PersonOutline,
  SearchOutlined,
  SendOutlined,
  ThumbDownOutlined,
  ThumbUpOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  AgendaMissionariaForm,
  type AgendaMissionariaFormValue,
} from '../components/missionary-agenda/AgendaMissionariaForm';
import { Permission } from '../rbac/permissions';
import { usePermission } from '../rbac/usePermission';
import { api, apiErrorMessage } from '../services/api';
import type {
  MissionaryAgenda,
  MissionaryAgendaOptions,
  MissionaryAgendaStatus,
  MissionaryAgendaType,
} from '../types';

const statusLabels: Record<MissionaryAgendaStatus, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguardando líder de missão',
  NAO_APROVADA: 'Não aprovada',
  AGUARDANDO_INDICACOES: 'Aprovada • aguardando membros',
  ENVIADA_AOS_MEMBROS: 'Enviada aos membros',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};
const typeLabels: Record<MissionaryAgendaType, string> = {
  MISSAO: 'Missão',
  EVANGELIZACAO: 'Evangelização',
  VISITA: 'Visita',
  FORMACAO: 'Formação',
  RETIRO: 'Retiro',
  OUTRO: 'Outro',
};
const statusColors: Record<
  MissionaryAgendaStatus,
  'default' | 'info' | 'success' | 'warning' | 'error'
> = {
  RASCUNHO: 'default',
  AGUARDANDO_APROVACAO: 'warning',
  NAO_APROVADA: 'error',
  AGUARDANDO_INDICACOES: 'success',
  ENVIADA_AOS_MEMBROS: 'success',
  CONCLUIDA: 'default',
  CANCELADA: 'error',
};
const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`))
    : 'Data não informada';

export function AgendaMissionariaPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(Permission.MISSIONARY_AGENDA_CREATE);
  const [items, setItems] = useState<MissionaryAgenda[]>([]),
    [options, setOptions] = useState<MissionaryAgendaOptions>({
      currentMemberId: '',
      members: [],
      ministries: [],
    });
  const [status, setStatus] = useState(''),
    [type, setType] = useState(''),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false),
    [editing, setEditing] = useState<MissionaryAgenda | null>(null),
    [formError, setFormError] = useState('');
  const [rejecting, setRejecting] = useState<MissionaryAgenda | null>(null),
    [reason, setReason] = useState('');
  const [sending, setSending] = useState<MissionaryAgenda | null>(null),
    [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        api.get<MissionaryAgenda[]>('/missionary-agenda', {
          params: { status: status || undefined, type: type || undefined, q: search || undefined },
        }),
        api.get<MissionaryAgendaOptions>('/missionary-agenda/options'),
      ]);
      setItems(a.data);
      setOptions(b.data);
      setError('');
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [status, type, search]);
  const action = async (path: string, body: unknown = {}) => {
    setSaving(true);
    setError('');
    try {
      await api.post(path, body);
      setRejecting(null);
      setSending(null);
      setReason('');
      setSelectedIds([]);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };
  const save = async (value: AgendaMissionariaFormValue) => {
    setSaving(true);
    setFormError('');
    try {
      if (editing) await api.patch(`/missionary-agenda/${editing.id}`, value);
      else await api.post('/missionary-agenda', value);
      setFormOpen(false);
      await load();
    } catch (cause) {
      setFormError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };
  const candidates = useMemo(
    () =>
      sending
        ? options.members.filter((member) =>
            member.ministry
              .split(',')
              .map((value) => value.trim().toLocaleLowerCase('pt-BR'))
              .includes(sending.ministryName.toLocaleLowerCase('pt-BR')),
          )
        : [],
    [sending, options.members],
  );

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4">Agenda Missionária</Typography>
          <Typography color="text.secondary" mt={0.5}>
            Fluxo de criação, aprovação da missão e envio pelos ministérios.
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => {
              setEditing(null);
              setFormError('');
              setFormOpen(true);
            }}
          >
            Nova agenda
          </Button>
        )}
      </Stack>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
          <TextField
            fullWidth
            placeholder="Buscar por título, local, cidade ou responsável"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
            label="Tipo"
            value={type}
            onChange={(event) => setType(event.target.value)}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(typeLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Etapa"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box textAlign="center" py={10}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">Nenhuma agenda disponível para o seu perfil nesta etapa.</Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2,minmax(0,1fr))',
              xl: 'repeat(3,minmax(0,1fr))',
            },
            gap: 2,
          }}
        >
          {items.map((item) => (
            <Paper
              key={item.id}
              sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 300 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box>
                  <Chip size="small" label={typeLabels[item.type]} variant="outlined" />
                  <Typography variant="h6" mt={1}>
                    {item.title}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  color={statusColors[item.status]}
                  label={statusLabels[item.status]}
                />
              </Stack>
              {item.rejectionReason && (
                <Alert severity="error">
                  <strong>Motivo da devolução:</strong> {item.rejectionReason}
                </Alert>
              )}
              {item.description && (
                <Typography
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.description}
                </Typography>
              )}
              <Stack spacing={1} color="text.secondary">
                <Stack direction="row" gap={1}>
                  <CalendarMonthOutlined fontSize="small" />
                  <Typography variant="body2">
                    {formatDate(item.startDate)} às {item.startTime}
                  </Typography>
                </Stack>
                <Stack direction="row" gap={1}>
                  <LocationOnOutlined fontSize="small" />
                  <Typography variant="body2">
                    {item.location} • {item.city}/{item.state}
                  </Typography>
                </Stack>
                <Stack direction="row" gap={1}>
                  <PersonOutline fontSize="small" />
                  <Typography variant="body2">
                    {item.responsibleName} • {item.ministryName || 'Ministério não definido'}
                  </Typography>
                </Stack>
              </Stack>
              {item.participantNames.length > 0 && (
                <Typography variant="body2">
                  <strong>Membros enviados:</strong> {item.participantNames.join(', ')}
                </Typography>
              )}
              {item.accompanyingNames.length > 0 && (
                <Typography variant="body2">
                  <strong>Acompanhantes:</strong> {item.accompanyingNames.join(', ')}
                </Typography>
              )}
              {item.intercessorNames.length > 0 && (
                <Typography variant="body2">
                  <strong>Intercessores:</strong> {item.intercessorNames.join(', ')}
                </Typography>
              )}
              <Box sx={{ flex: 1 }} />
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {item.canEdit && (
                  <Button
                    startIcon={<EditOutlined />}
                    onClick={() => {
                      setEditing(item);
                      setFormError('');
                      setFormOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                )}
                {item.canSubmit && (
                  <Button
                    variant="contained"
                    startIcon={<SendOutlined />}
                    disabled={saving}
                    onClick={() => void action(`/missionary-agenda/${item.id}/submit`)}
                  >
                    Enviar para aprovação
                  </Button>
                )}
                {item.canReview && (
                  <>
                    <Button
                      color="success"
                      variant="contained"
                      startIcon={<ThumbUpOutlined />}
                      disabled={saving}
                      onClick={() =>
                        void action(`/missionary-agenda/${item.id}/approve`, { notes: '' })
                      }
                    >
                      Aprovar
                    </Button>
                    <Button
                      color="error"
                      startIcon={<ThumbDownOutlined />}
                      onClick={() => {
                        setRejecting(item);
                        setReason('');
                      }}
                    >
                      Não aprovar
                    </Button>
                  </>
                )}
                {item.canSelectMembers && (
                  <Button
                    variant="contained"
                    startIcon={<ForwardToInboxOutlined />}
                    onClick={() => {
                      setSending(item);
                      setSelectedIds([]);
                    }}
                  >
                    Selecionar membros
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          {editing ? 'Editar agenda missionária' : 'Nova agenda missionária'}
        </DialogTitle>
        <AgendaMissionariaForm
          agenda={editing}
          options={options}
          saving={saving}
          serverError={formError}
          onCancel={() => setFormOpen(false)}
          onSubmit={save}
        />
      </Dialog>
      <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" gap={1} alignItems="center">
            <ApprovalOutlined />
            Não aprovar agenda
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            A agenda retornará ao líder responsável para ajustes e poderá ser reenviada.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            required
            multiline
            minRows={4}
            label="Motivo da não aprovação"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving || reason.trim().length < 3}
            onClick={() => void action(`/missionary-agenda/${rejecting?.id}/reject`, { reason })}
          >
            Devolver ao líder
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(sending)} onClose={() => setSending(null)} fullWidth maxWidth="sm">
        <DialogTitle>Selecionar membros do ministério</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Somente membros de {sending?.ministryName} podem ser enviados nesta etapa.
          </Alert>
          <Autocomplete
            multiple
            options={candidates}
            value={candidates.filter((member) => selectedIds.includes(member.id))}
            getOptionLabel={(member) => member.name}
            onChange={(_, value) => setSelectedIds(value.map((member) => member.id))}
            renderInput={(params) => (
              <TextField {...params} label="Membros" placeholder="Selecione um ou mais" />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSending(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving || selectedIds.length === 0}
            onClick={() =>
              void action(`/missionary-agenda/${sending?.id}/send`, { memberIds: selectedIds })
            }
          >
            Enviar para membros
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
