import {
  AlternateEmailOutlined,
  CakeOutlined,
  EventOutlined,
  ImageOutlined,
  LocationOnOutlined,
  SaveOutlined,
  SettingsOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';

type GeneralSettings = {
  missionName: string;
  communityName: string;
  primaryLogo: string;
  whiteLogo: string;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  birthdaysEnabled: boolean;
  showBirthdayAge: boolean;
  birthdayNotificationsEnabled: boolean;
  birthdayReminderDays: number;
  birthdayNotificationAudience: 'ALL' | 'LEADERS';
  birthdayDefaultMessage: string;
  birthdayLeaderReminderMessage: string;
  absenceLimit: number;
  justificationsEnabled: boolean;
  eventConfirmationRequired: boolean;
  eventDefaultScope: 'GENERAL' | 'MINISTRY' | 'CELL' | 'CENACLE';
  eventDefaultDurationMinutes: number;
  eventReminderDays: number;
  updatedAt: string;
  updatedBy: string;
};

const initial: GeneralSettings = {
  missionName: '', communityName: '', primaryLogo: '', whiteLogo: '', coverImage: '',
  primaryColor: '#d39a57', secondaryColor: '#a75db4', city: '', state: '', email: '', phone: '', website: '', instagram: '',
  birthdaysEnabled: true, showBirthdayAge: false, birthdayNotificationsEnabled: true, birthdayReminderDays: 3, birthdayNotificationAudience: 'ALL',
  birthdayDefaultMessage: 'Hoje celebramos a vida de {nome}! Que Deus abençoe sua caminhada e missão.',
  birthdayLeaderReminderMessage: 'Em {dias} dia(s), {nome} celebrará seu aniversário. Prepare uma mensagem especial!', absenceLimit: 3,
  justificationsEnabled: true, eventConfirmationRequired: true, eventDefaultScope: 'GENERAL',
  eventDefaultDurationMinutes: 120, eventReminderDays: 3, updatedAt: '', updatedBy: '',
};

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}>
    <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>{icon}<Typography variant="h6">{title}</Typography></Stack>
    <Typography color="text.secondary" mb={2.5}>{description}</Typography>
    {children}
  </CardContent></Card>;
}

export function SettingsPage() {
  const { hasRole } = useAuth();
  const [data, setData] = useState<GeneralSettings>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!hasRole('ADMIN','DEVELOPER')) return;
    api.get<GeneralSettings>('/settings').then(({ data: value }) => setData(value)).catch((requestError) => setError(apiErrorMessage(requestError))).finally(() => setLoading(false));
  }, [hasRole]);

  if (!hasRole('ADMIN','DEVELOPER')) return <Navigate to="/sem-permissao" replace />;
  const set = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => setData((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const { updatedAt: _updatedAt, updatedBy: _updatedBy, ...payload } = data;
      const response = await api.patch<GeneralSettings>('/settings', payload);
      setData(response.data);
      setSuccess('Configurações gerais salvas no Google Sheets.');
    } catch (requestError) { setError(apiErrorMessage(requestError)); }
    finally { setSaving(false); }
  };

  if (loading) return <Box display="grid" minHeight="50vh" sx={{ placeItems: 'center' }}><CircularProgress /></Box>;

  return <Box maxWidth={1180}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={2} mb={3}>
      <Box><Typography variant="h4">Configurações gerais</Typography><Typography color="text.secondary">Identidade, contato e regras padrão da missão.</Typography></Box>
      <Button variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveOutlined />} disabled={saving} onClick={save}>Salvar configurações</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
    <Stack spacing={2.5}>
      <Section icon={<SettingsOutlined color="primary" />} title="Identidade institucional" description="Nomes que serão utilizados na identificação da missão e da comunidade.">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField label="Nome da missão" value={data.missionName} onChange={(e) => set('missionName', e.target.value)} required />
          <TextField label="Nome da comunidade" value={data.communityName} onChange={(e) => set('communityName', e.target.value)} required />
        </Box>
      </Section>
      <Section icon={<ImageOutlined color="primary" />} title="Imagens e identidade visual" description="Informe URLs públicas ou caminhos internos das imagens utilizadas pelo aplicativo.">
        <Stack spacing={2}>
          <TextField label="Logo principal" value={data.primaryLogo} onChange={(e) => set('primaryLogo', e.target.value)} helperText="Ex.: /brand/logo-principal.png ou uma URL HTTPS" />
          <TextField label="Logo branca" value={data.whiteLogo} onChange={(e) => set('whiteLogo', e.target.value)} />
          <TextField label="Imagem de capa" value={data.coverImage} onChange={(e) => set('coverImage', e.target.value)} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField type="color" label="Cor principal" value={data.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="color" label="Cor secundária" value={data.secondaryColor} onChange={(e) => set('secondaryColor', e.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {[data.primaryLogo, data.whiteLogo, data.coverImage].filter(Boolean).map((source, index) => <Box key={`${source}-${index}`} component="img" src={source} alt="Prévia" sx={{ width: 150, height: 90, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1 }} />)}
          </Stack>
        </Stack>
      </Section>
      <Section icon={<LocationOnOutlined color="primary" />} title="Localização e contato" description="Dados institucionais exibidos nas áreas públicas e administrativas.">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField label="Cidade" value={data.city} onChange={(e) => set('city', e.target.value)} />
          <TextField label="Estado (UF)" value={data.state} onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2))} inputProps={{ maxLength: 2 }} />
          <TextField label="E-mail" type="email" value={data.email} onChange={(e) => set('email', e.target.value)} />
          <TextField label="Telefone" value={data.phone} onChange={(e) => set('phone', e.target.value)} />
          <TextField label="Site" value={data.website} onChange={(e) => set('website', e.target.value)} />
          <TextField label="Instagram" value={data.instagram} onChange={(e) => set('instagram', e.target.value)} InputProps={{ startAdornment: <AlternateEmailOutlined sx={{ mr: 1, color: 'text.secondary' }} /> }} />
        </Box>
      </Section>
      <Section icon={<CakeOutlined color="primary" />} title="Aniversários" description="Regras gerais que serão utilizadas pelo módulo de aniversários.">
        <Stack spacing={1.5}>
          <FormControlLabel control={<Switch checked={data.birthdaysEnabled} onChange={(e) => set('birthdaysEnabled', e.target.checked)} />} label="Ativar módulo e notificações de aniversários" />
          <FormControlLabel control={<Switch checked={data.showBirthdayAge} onChange={(e) => set('showBirthdayAge', e.target.checked)} />} label="Permitir exibição da idade" />
          <FormControlLabel control={<Switch checked={data.birthdayNotificationsEnabled} onChange={(e) => set('birthdayNotificationsEnabled', e.target.checked)} />} label="Ativar lembretes e mensagens automáticas" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField label="Antecedência do lembrete (dias)" type="number" value={data.birthdayReminderDays} onChange={(e) => set('birthdayReminderDays', Number(e.target.value))} inputProps={{ min: 0, max: 30 }} />
            <FormControl><InputLabel>Destinatários do aviso do dia</InputLabel><Select label="Destinatários do aviso do dia" value={data.birthdayNotificationAudience} onChange={(e) => set('birthdayNotificationAudience', e.target.value as GeneralSettings['birthdayNotificationAudience'])}><MenuItem value="ALL">Todos os membros</MenuItem><MenuItem value="LEADERS">Somente líderes</MenuItem></Select></FormControl>
          </Box>
          <TextField multiline minRows={3} label="Mensagem padrão de aniversário" value={data.birthdayDefaultMessage} onChange={(e) => set('birthdayDefaultMessage', e.target.value)} helperText="Use {nome} para inserir automaticamente o nome do aniversariante." />
          <TextField multiline minRows={3} label="Mensagem antecipada para líderes" value={data.birthdayLeaderReminderMessage} onChange={(e) => set('birthdayLeaderReminderMessage', e.target.value)} helperText="Use {nome} e {dias} como variáveis automáticas." />
        </Stack>
      </Section>
      <Section icon={<EventOutlined color="primary" />} title="Presenças, justificativas e eventos" description="Valores padrão utilizados na criação e no acompanhamento das atividades.">
        <Stack spacing={2}>
          <FormControlLabel control={<Switch checked={data.justificationsEnabled} onChange={(e) => set('justificationsEnabled', e.target.checked)} />} label="Permitir justificativas de ausência" />
          <FormControlLabel control={<Switch checked={data.eventConfirmationRequired} onChange={(e) => set('eventConfirmationRequired', e.target.checked)} />} label="Exigir confirmação de presença por padrão" />
          <Divider />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            <TextField label="Limite de ausências para alerta" type="number" value={data.absenceLimit} onChange={(e) => set('absenceLimit', Number(e.target.value))} inputProps={{ min: 0, max: 100 }} />
            <FormControl><InputLabel>Abrangência padrão do evento</InputLabel><Select label="Abrangência padrão do evento" value={data.eventDefaultScope} onChange={(e) => set('eventDefaultScope', e.target.value as GeneralSettings['eventDefaultScope'])}><MenuItem value="GENERAL">Geral</MenuItem><MenuItem value="MINISTRY">Ministério</MenuItem><MenuItem value="CELL">Célula</MenuItem><MenuItem value="CENACLE">Cenáculo</MenuItem></Select></FormControl>
            <TextField label="Duração padrão (minutos)" type="number" value={data.eventDefaultDurationMinutes} onChange={(e) => set('eventDefaultDurationMinutes', Number(e.target.value))} inputProps={{ min: 15, max: 1440 }} />
            <TextField label="Antecedência do lembrete (dias)" type="number" value={data.eventReminderDays} onChange={(e) => set('eventReminderDays', Number(e.target.value))} inputProps={{ min: 0, max: 30 }} />
          </Box>
        </Stack>
      </Section>
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mt={3}>
      <Typography variant="body2" color="text.secondary">{data.updatedAt ? `Última atualização: ${new Date(data.updatedAt).toLocaleString('pt-BR')}` : 'Ainda não houve atualização registrada.'}</Typography>
      <Button variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveOutlined />} disabled={saving} onClick={save}>Salvar configurações</Button>
    </Stack>
  </Box>;
}
