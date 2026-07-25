import {
  CakeOutlined,
  CalendarMonthOutlined,
  CelebrationOutlined,
  SearchOutlined,
  SendOutlined,
  NotificationsOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
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
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../services/api';
import { useAuth } from '../auth/AuthContext';

type Option = { id: string; name: string };
type Birthday = {
  id: string;
  name: string;
  photo: string;
  day: number;
  month: number;
  age?: number;
  isToday: boolean;
  daysUntil: number;
  city: string;
  state: string;
  ministryNames: string[];
  cellNames: string[];
  cenacleNames: string[];
};
type BirthdayResponse = {
  enabled: boolean;
  showAge: boolean;
  selectedMonth: number;
  today: Birthday[];
  upcoming: Birthday[];
  birthdays: Birthday[];
  options: { ministries: Option[]; cells: Option[]; cenacles: Option[] };
};

const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function BirthdayCard({ item, onOpen, onMessage }: { item: Birthday; onOpen: () => void; onMessage?: () => void }) {
  const details = [...item.ministryNames, ...item.cellNames, ...item.cenacleNames];
  return (
    <Card
      sx={{
        p: 2.25,
        border: item.isToday ? '1px solid' : undefined,
        borderColor: item.isToday ? 'primary.main' : undefined,
        background: item.isToday ? 'linear-gradient(135deg, rgba(211,154,87,.17), rgba(167,93,180,.08))' : undefined,
      }}
    >
      <Stack direction="row" gap={2} alignItems="center">
        <Avatar src={item.photo} sx={{ width: 62, height: 62 }}>{item.name.charAt(0)}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6" noWrap>{item.name}</Typography>
            {item.isToday && <Chip size="small" color="primary" icon={<CelebrationOutlined />} label="Aniversário hoje" />}
          </Stack>
          <Typography color="text.secondary">
            {String(item.day).padStart(2, '0')} de {months[item.month - 1]}
            {typeof item.age === 'number' ? ` • ${item.age} anos` : ''}
          </Typography>
          {details.length > 0 && <Typography variant="body2" color="text.secondary" noWrap>{details.join(' • ')}</Typography>}
        </Box>
        <Stack gap={1}><Button variant={item.isToday ? 'contained' : 'outlined'} onClick={onOpen}>Abrir perfil</Button>{onMessage && <Button size="small" startIcon={<SendOutlined />} onClick={onMessage}>Mensagem</Button>}</Stack>
      </Stack>
    </Card>
  );
}

export function BirthdaysPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSend = ['DEVELOPER','ADMIN','MINISTRY_LEADER','CELL_LEADER'].includes(user?.profile || '');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [search, setSearch] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [cellId, setCellId] = useState('');
  const [cenacleId, setCenacleId] = useState('');
  const [data, setData] = useState<BirthdayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageTarget, setMessageTarget] = useState<Birthday | null>(null);
  const [message, setMessage] = useState('Parabéns, {nome}! Que Deus abençoe sua vida, sua caminhada e sua missão.');
  const [audience, setAudience] = useState<'ALL' | 'LEADERS'>('ALL');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<BirthdayResponse>('/birthdays', { params: { month, search: search || undefined, ministryId: ministryId || undefined, cellId: cellId || undefined, cenacleId: cenacleId || undefined } });
        setData(response.data);
      } catch (requestError) {
        setError(apiErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [month, search, ministryId, cellId, cenacleId]);

  const summary = useMemo(() => ({
    month: data?.birthdays.length || 0,
    today: data?.today.length || 0,
    next: data?.upcoming[0]?.daysUntil,
  }), [data]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Typography variant="h4">Aniversários</Typography>
          <Typography color="text.secondary">Celebre a vida dos membros da missão e acompanhe os próximos aniversariantes.</Typography>
        </Box>
        <Stack direction="row" gap={1.5}><Button startIcon={<NotificationsOutlined />} onClick={() => navigate('/notificacoes')}>Histórico</Button><TextField select label="Mês" value={month} onChange={(event) => setMonth(Number(event.target.value))} sx={{ minWidth: 210 }}>
          {months.map((name, index) => <MenuItem key={name} value={index + 1}>{name}</MenuItem>)}
        </TextField></Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {data && !data.enabled && <Alert severity="info" sx={{ mb: 2 }}>O módulo de aniversários está desativado nas Configurações Gerais.</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2.5 }}><Stack direction="row" gap={2} alignItems="center"><CakeOutlined color="primary" /><Box><Typography variant="h4">{summary.month}</Typography><Typography color="text.secondary">No mês selecionado</Typography></Box></Stack></Paper>
        <Paper sx={{ p: 2.5 }}><Stack direction="row" gap={2} alignItems="center"><CelebrationOutlined color="primary" /><Box><Typography variant="h4">{summary.today}</Typography><Typography color="text.secondary">Aniversariantes hoje</Typography></Box></Stack></Paper>
        <Paper sx={{ p: 2.5 }}><Stack direction="row" gap={2} alignItems="center"><CalendarMonthOutlined color="primary" /><Box><Typography variant="h4">{typeof summary.next === 'number' ? summary.next : '—'}</Typography><Typography color="text.secondary">Dias para o próximo</Typography></Box></Stack></Paper>
      </Box>

      {data && data.today.length > 0 && (
        <Box mb={3}>
          <Typography variant="h5" mb={1.5}>Aniversariantes do dia</Typography>
          <Stack gap={1.5}>{data.today.map((item) => <BirthdayCard key={item.id} item={item} onOpen={() => navigate(`/membros/${item.id}`)} onMessage={canSend ? () => setMessageTarget(item) : undefined} />)}</Stack>
        </Box>
      )}

      {data && data.upcoming.length > 0 && (
        <Box mb={3}>
          <Typography variant="h5" mb={1.5}>Próximos aniversários</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 1.5 }}>
            {data.upcoming.slice(0, 4).map((item) => <BirthdayCard key={item.id} item={item} onOpen={() => navigate(`/membros/${item.id}`)} onMessage={canSend ? () => setMessageTarget(item) : undefined} />)}
          </Box>
        </Box>
      )}

      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="h6" mb={2}>Filtrar aniversariantes</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr repeat(3,1fr)' }, gap: 1.5 }}>
          <TextField label="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }} />
          <TextField select label="Ministério" value={ministryId} onChange={(event) => setMinistryId(event.target.value)}><MenuItem value="">Todos</MenuItem>{data?.options.ministries.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
          <TextField select label="Célula" value={cellId} onChange={(event) => setCellId(event.target.value)}><MenuItem value="">Todas</MenuItem>{data?.options.cells.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
          <TextField select label="Cenáculo" value={cenacleId} onChange={(event) => setCenacleId(event.target.value)}><MenuItem value="">Todos</MenuItem>{data?.options.cenacles.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
        </Box>
      </Paper>

      {loading ? <Box textAlign="center" py={9}><CircularProgress /></Box> : data?.birthdays.length ? (
        <Stack gap={1.5}>{data.birthdays.map((item) => <BirthdayCard key={item.id} item={item} onOpen={() => navigate(`/membros/${item.id}`)} onMessage={canSend ? () => setMessageTarget(item) : undefined} />)}</Stack>
      ) : <Alert severity="info">Nenhum aniversariante encontrado para os filtros selecionados.</Alert>}

      <Dialog open={Boolean(messageTarget)} onClose={() => setMessageTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Enviar mensagem de aniversário</DialogTitle>
        <DialogContent><Stack gap={2} mt={1}><Typography color="text.secondary">A mensagem será registrada e enviada pela Central de Notificações.</Typography><TextField multiline minRows={4} label="Mensagem personalizada" value={message} onChange={(e) => setMessage(e.target.value)} helperText="Use {nome} para inserir o nome automaticamente." /><TextField select label="Destinatários" value={audience} onChange={(e) => setAudience(e.target.value as 'ALL' | 'LEADERS')}><MenuItem value="ALL">Todos os membros</MenuItem><MenuItem value="LEADERS">Somente líderes</MenuItem></TextField></Stack></DialogContent>
        <DialogActions><Button onClick={() => setMessageTarget(null)}>Cancelar</Button><Button variant="contained" disabled={sending || message.trim().length < 3} onClick={async () => { if (!messageTarget) return; setSending(true); try { await api.post(`/birthdays/${messageTarget.id}/message`, { message, audience }); setSuccess('Mensagem enviada e registrada na Central de Notificações.'); setMessageTarget(null); } catch (requestError) { setError(apiErrorMessage(requestError)); } finally { setSending(false); } }}>{sending ? <CircularProgress size={18} /> : 'Enviar'}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
