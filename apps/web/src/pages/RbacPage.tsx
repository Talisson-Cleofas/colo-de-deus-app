import {
  AddOutlined,
  DeleteOutline,
  EditOutlined,
  ExpandMoreOutlined,
  RefreshOutlined,
  SaveOutlined,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';

type Profile = { id?: string; code: string; name: string; description: string; level: number; active: boolean };
type Perm = { id?: string; code: string; resource: string; action: string; description: string; active: boolean };
type ProfilePermission = Perm & { allowed: boolean; scope: string; linkActive?: boolean };
type Catalog = { profiles: Profile[]; permissions: Perm[]; profilePermissions: unknown[] };
type Form = { id?: string; resource: string; action: string; description: string; active: boolean };

const empty: Form = { resource: '', action: '', description: '', active: true };
const displayCode = (code: string) => String(code || '').toLowerCase().replace(':', '.').replaceAll('_', '-');
const resourceLabels: Record<string, string> = {
  DASHBOARD: 'Dashboard', MEMBERS: 'Membros', MINISTRIES: 'Ministérios', CELLS: 'Células',
  ATTENDANCE: 'Presenças', CENACLES: 'Cenáculos', EVENTS: 'Eventos', LECTIO: 'Lectio Divina',
  SOMA: 'Soma+', FINANCIAL_REPORT: 'Relatórios financeiros', NOTIFICATIONS: 'Notificações',
  REPORTS: 'Relatórios', SETTINGS: 'Configurações', INTEGRATIONS: 'Integrações',
  TECHNICAL_ADMIN: 'Administração técnica', LOGS: 'Logs', BACKUP: 'Backup',
};
const profileLabels: Record<string, { name: string; description: string; level: number }> = {
  DEVELOPER: { name: 'Desenvolvedor', description: 'Administração técnica total da plataforma.', level: 100 },
  MISSION_LEADER: { name: 'Líder Missão', description: 'Responsável pela administração funcional da missão.', level: 90 },
  MINISTRY_LEADER: { name: 'Líder de Ministério', description: 'Gestão limitada ao módulo do próprio ministério.', level: 60 },
  CELL_LEADER: { name: 'Líder de Célula', description: 'Gestão no escopo da própria célula.', level: 40 },
  MEMBER: { name: 'Membro', description: 'Acesso pessoal e consultas gerais.', level: 10 },
};
const profileView = (profile: Profile) => ({
  name: profile.name || profileLabels[profile.code]?.name || profile.code || 'Perfil sem nome',
  description: profile.description || profileLabels[profile.code]?.description || 'Sem descrição.',
  level: Number.isFinite(Number(profile.level)) && Number(profile.level) > 0 ? Number(profile.level) : (profileLabels[profile.code]?.level || 0),
});

export function RbacPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('DEVELOPER');
  const [tab, setTab] = useState(2);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Perm[]>([]);
  const [profilePermissions, setProfilePermissions] = useState<ProfilePermission[]>([]);
  const [draft, setDraft] = useState<Record<string, { allowed: boolean; scope: string }>>({});
  const [selectedProfile, setSelectedProfile] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [catalogResponse, permissionsResponse] = await Promise.all([
        api.get<Catalog>('/rbac/catalog'),
        api.get<Perm[]>('/rbac/permissions'),
      ]);
      setProfiles(catalogResponse.data.profiles || []);
      setPermissions(permissionsResponse.data || []);
      setSelectedProfile((current) => current || catalogResponse.data.profiles?.[0]?.code || '');
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async (profileCode: string) => {
    if (!profileCode) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ProfilePermission[]>(`/rbac/profiles/${encodeURIComponent(profileCode)}/permissions`);
      setProfilePermissions(response.data || []);
      setDraft(Object.fromEntries((response.data || []).map((item) => [item.code, { allowed: item.allowed, scope: item.scope || scopeFor(profileCode) }])));
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => { if (selectedProfile) void loadProfile(selectedProfile); }, [selectedProfile, loadProfile]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return permissions.filter((permission) => !query
      || displayCode(permission.code).includes(query)
      || permission.description.toLowerCase().includes(query)
      || permission.resource.toLowerCase().includes(query)
      || permission.action.toLowerCase().includes(query));
  }, [permissions, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Perm[]>();
    for (const permission of filtered) groups.set(permission.resource, [...(groups.get(permission.resource) || []), permission]);
    return [...groups.entries()].sort(([a], [b]) => (resourceLabels[a] || a).localeCompare(resourceLabels[b] || b));
  }, [filtered]);

  const grantedCount = useMemo(() => Object.values(draft).filter((item) => item.allowed).length, [draft]);
  const changed = useMemo(() => profilePermissions.some((item) => {
    const current = draft[item.code];
    return Boolean(current) && (current.allowed !== item.allowed || current.scope !== item.scope);
  }), [profilePermissions, draft]);

  const saveMatrix = async () => {
    if (!canEdit || !selectedProfile) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/rbac/profiles/${encodeURIComponent(selectedProfile)}/permissions`, {
        items: permissions.map((permission) => ({
          permissionCode: permission.code,
          allowed: draft[permission.code]?.allowed ?? false,
          scope: draft[permission.code]?.scope || scopeFor(selectedProfile),
        })),
      });
      setSuccess(`Matriz salva: ${grantedCount} permissões concedidas ao perfil ${profileView(profiles.find((item) => item.code === selectedProfile) || { code: selectedProfile, name: '', description: '', level: 0, active: true }).name}.`);
      await loadProfile(selectedProfile);
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const savePermission = async () => {
    setSaving(true);
    setError('');
    try {
      if (form.id) await api.patch(`/permissions/${form.id}`, form);
      else await api.post('/permissions', form);
      setDialog(false);
      setSuccess('Permissão salva com sucesso.');
      await loadBase();
      if (selectedProfile) await loadProfile(selectedProfile);
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (permission: Perm) => {
    if (!permission.id || !confirm(`Excluir a permissão ${displayCode(permission.code)}?`)) return;
    setSaving(true);
    try {
      await api.delete(`/permissions/${permission.id}`);
      await loadBase();
      if (selectedProfile) await loadProfile(selectedProfile);
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    setSaving(true);
    try {
      await api.post('/permissions/seed/default');
      setSuccess('Permissões e matriz padrão restauradas.');
      await loadBase();
      if (selectedProfile) await loadProfile(selectedProfile);
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profiles.length) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;

  return <Box>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
      <Box>
        <Typography variant="h4" fontWeight={800}>Sistema de permissões</Typography>
        <Typography color="text.secondary">Todas as permissões por perfil e escopo real por ministério.</Typography>
      </Box>
      {canEdit && <Stack direction="row" gap={1}>
        <Button variant="outlined" startIcon={<RefreshOutlined />} disabled={saving} onClick={() => void seed()}>Restaurar padrões</Button>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setForm(empty); setDialog(true); }}>Criar permissão</Button>
      </Stack>}
    </Stack>

    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

    <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
      <Tab label={`Perfis (${profiles.length})`} />
      <Tab label={`Permissões (${permissions.length})`} />
      <Tab label={`Matriz de acesso (${grantedCount})`} />
    </Tabs>

    {tab === 0 && <Stack spacing={1.5}>{profiles.map((profile) => {
      const view = profileView(profile);
      return <Card key={profile.id || profile.code} variant="outlined"><CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} flexWrap="wrap">
          <Typography fontWeight={800} variant="h6">{view.name}</Typography>
          <Chip size="small" label={profile.code} />
          <Chip size="small" label={`Nível ${view.level}`} />
          <Chip size="small" color={profile.active ? 'success' : 'default'} label={profile.active ? 'Ativo' : 'Inativo'} />
        </Stack>
        <Typography color="text.secondary" mt={1}>{view.description}</Typography>
      </CardContent></Card>;
    })}</Stack>}

    {tab === 1 && <>
      <TextField fullWidth size="small" label="Buscar permissão" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 1.5 }}>
        {filtered.map((permission) => <Card key={permission.code} variant="outlined"><CardContent>
          <Stack direction="row" justifyContent="space-between" gap={1}>
            <Box>
              <Typography fontWeight={800}>{resourceLabels[permission.resource] || permission.resource}: {permission.action}</Typography>
              <Typography variant="caption" color="primary.main">{permission.code}</Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>{permission.description}</Typography>
              <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
                <Chip size="small" label={`Módulo: ${resourceLabels[permission.resource] || permission.resource}`} />
                <Chip size="small" label={`Ação: ${permission.action}`} />
                <Chip size="small" color={permission.active ? 'success' : 'default'} label={permission.active ? 'Ativa' : 'Inativa'} />
              </Stack>
            </Box>
            {canEdit && <Stack direction="row">
              <Tooltip title="Editar"><IconButton onClick={() => { setForm({ id: permission.id, resource: permission.resource, action: permission.action, description: permission.description, active: permission.active }); setDialog(true); }}><EditOutlined /></IconButton></Tooltip>
              <Tooltip title="Excluir"><IconButton color="error" onClick={() => void remove(permission)}><DeleteOutline /></IconButton></Tooltip>
            </Stack>}
          </Stack>
        </CardContent></Card>)}
      </Box>
    </>}

    {tab === 2 && <Card variant="outlined"><CardContent>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between" alignItems={{ md: 'center' }} mb={2}>
        <TextField select label="Perfil" value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)} sx={{ minWidth: 280 }}>
          {profiles.filter((profile) => profile.active && profile.code).map((profile) => {
            const view = profileView(profile);
            return <MenuItem key={profile.code} value={profile.code}>{view.name} — Nível {view.level}</MenuItem>;
          })}
        </TextField>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
          <Chip color="primary" label={`${grantedCount} de ${permissions.length} concedidas`} />
          <TextField size="small" label="Buscar permissão" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { sm: 300 } }} />
          {canEdit && <Button variant="contained" startIcon={<SaveOutlined />} disabled={saving || !changed} onClick={() => void saveMatrix()}>Salvar matriz</Button>}
        </Stack>
      </Stack>

      {selectedProfile === 'MINISTRY_LEADER' && <Alert severity="info" sx={{ mb: 2 }}>
        As permissões marcadas habilitam as ações do perfil, mas o MinistryModuleGuard limita cada líder ao código estável do próprio ministério: CÉLULAS, EVENTOS, CENÁCULO, FINANÇAS ou COMUNICAÇÃO.
      </Alert>}

      {loading ? <Stack alignItems="center" py={5}><CircularProgress /></Stack> : grouped.map(([resource, items]) => {
        const allowedInGroup = items.filter((permission) => draft[permission.code]?.allowed).length;
        return <Accordion key={resource} defaultExpanded={['CELLS', 'CENACLES', 'EVENTS'].includes(resource)}>
          <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
            <Stack direction="row" gap={1.5} alignItems="center" width="100%">
              <Typography fontWeight={800}>{resourceLabels[resource] || resource}</Typography>
              <Chip size="small" label={`${allowedInGroup}/${items.length}`} color={allowedInGroup ? 'primary' : 'default'} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>{items.map((permission) => {
              const value = draft[permission.code] || { allowed: false, scope: scopeFor(selectedProfile) };
              return <Card key={permission.code} variant="outlined" sx={{ p: 1.5, opacity: permission.active ? 1 : 0.6 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={800}>{permission.action === 'READ' ? 'Visualizar' : permission.action === 'CREATE' ? 'Criar' : permission.action === 'UPDATE' ? 'Editar' : permission.action === 'DELETE' ? 'Excluir' : permission.action}</Typography>
                    <Typography variant="caption" color="primary.main">{permission.code}</Typography>
                    <Typography variant="body2" color="text.secondary">{permission.description}</Typography>
                    <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
                      <Chip size="small" label={`Módulo: ${resourceLabels[permission.resource] || permission.resource}`} />
                      <Chip size="small" label={`Escopo: ${value.scope}`} />
                      <Chip size="small" color={permission.active ? 'success' : 'default'} label={permission.active ? 'Ativa' : 'Inativa'} />
                    </Stack>
                  </Box>
                  <TextField select size="small" label="Escopo" value={value.scope} disabled={!canEdit || saving} onChange={(event) => setDraft((current) => ({ ...current, [permission.code]: { ...value, scope: event.target.value } }))} sx={{ width: 150 }}>
                    <MenuItem value="OWN">Próprio</MenuItem><MenuItem value="CELL">Célula</MenuItem><MenuItem value="MINISTRY">Ministério</MenuItem><MenuItem value="MISSION">Missão</MenuItem><MenuItem value="ALL">Todos</MenuItem>
                  </TextField>
                  <FormControlLabel control={<Checkbox checked={value.allowed} disabled={!canEdit || saving || !permission.active} onChange={(event) => setDraft((current) => ({ ...current, [permission.code]: { ...value, allowed: event.target.checked } }))} />} label={value.allowed ? 'Permitido' : 'Negado'} />
                </Stack>
              </Card>;
            })}</Stack>
          </AccordionDetails>
        </Accordion>;
      })}
      {!canEdit && <Alert severity="info" sx={{ mt: 2 }}>Somente o perfil Desenvolvedor pode editar a matriz.</Alert>}
    </CardContent></Card>}

    <Dialog open={dialog} onClose={() => !saving && setDialog(false)} fullWidth maxWidth="sm">
      <DialogTitle>{form.id ? 'Editar permissão' : 'Criar permissão'}</DialogTitle>
      <DialogContent><Stack gap={2} mt={1}>
        <TextField required label="Recurso" placeholder="MEMBERS" value={form.resource} onChange={(event) => setForm({ ...form, resource: event.target.value })} />
        <TextField required label="Ação" placeholder="READ" value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })} />
        <TextField label="Descrição" multiline minRows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <FormControlLabel control={<Switch checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />} label="Permissão ativa" />
        <Alert severity="info">Código gerado: {displayCode(`${form.resource || 'resource'}:${form.action || 'action'}`)}</Alert>
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setDialog(false)}>Cancelar</Button><Button variant="contained" startIcon={<SaveOutlined />} disabled={saving || !form.resource.trim() || !form.action.trim()} onClick={() => void savePermission()}>Salvar</Button></DialogActions>
    </Dialog>
  </Box>;
}

function scopeFor(profile: string) {
  if (profile === 'DEVELOPER' || profile === 'MISSION_LEADER') return 'ALL';
  if (profile === 'MINISTRY_LEADER') return 'MINISTRY';
  if (profile === 'CELL_LEADER') return 'CELL';
  return 'OWN';
}
