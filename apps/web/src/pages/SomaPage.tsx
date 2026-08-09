import {
  AccountBalanceOutlined,
  CancelOutlined,
  ContentCopyOutlined,
  CreditCardOutlined,
  FavoriteOutlined,
  PixOutlined,
  RefreshOutlined,
  SettingsOutlined,
  UploadFileOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';
import { DrivePage } from './DrivePage';
import { FinancialEnterprisePanel } from './FinancialEnterprisePanel';
import { ReportsPage } from './ReportsPage';

type Settings = {
  campaignName: string;
  description: string;
  pixKey: string;
  pixKeyType: string;
  beneficiary: string;
  goal: number;
  active: boolean;
  pixBank: string;
  pixAgency: string;
  pixAccount: string;
  pixCnpj: string;
  subscriptionUrl: string;
  pixQrCodeUrl: string;
};
type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'PAUSED' | 'CANCELLED';
type Subscription = {
  id: string | null;
  status: SubscriptionStatus;
  providerStatus: string;
  plan: string;
  amount: number | null;
  nextCharge: string | null;
  cardLastFour: string | null;
  manageUrl: string;
  canCancel: boolean;
  updatedAt: string | null;
};
type Contribution = {
  id: string;
  memberName: string;
  amount: number;
  date: string;
  status: string;
  method: string;
};
type Payment = {
  id: string;
  payment_id: string;
  member_name: string;
  payer_email: string;
  status: string;
  amount: number;
  payment_method: string;
  date_created: string;
  date_approved: string;
  description: string;
};
type SubscriptionCheckout = { checkoutUrl: string };

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const subscriptionLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Ativa',
  INACTIVE: 'Não vinculada',
  PENDING: 'Aguardando autorização',
  PAUSED: 'Pausada',
  CANCELLED: 'Cancelada',
};

function SomaContributionPanel({
  showRecent = true,
  canAdmin = false,
}: {
  showRecent?: boolean;
  canAdmin?: boolean;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [items, setItems] = useState<Contribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [subscriptionAmount, setSubscriptionAmount] = useState('50');
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [form, setForm] = useState({ memberName: '', email: '', amount: '', notes: '' });
  const [edit, setEdit] = useState<Settings | null>(null);

  const load = useCallback(async () => {
    try {
      const [settingsResponse, subscriptionResponse, paymentsResponse] = await Promise.all([
        api.get<Settings>('/soma/settings'),
        api.get<Subscription>('/soma/subscription/current'),
        api.get<Payment[]>('/soma/payments/my'),
      ]);
      setSettings(settingsResponse.data);
      setEdit(settingsResponse.data);
      setSubscription(subscriptionResponse.data);
      setPayments(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : []);
      setError('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      await load();
      if (!mounted) return;
      if (showRecent) {
        try {
          const response = await api.get<Contribution[]>('/soma/contributions');
          if (mounted) setItems(Array.isArray(response.data) ? response.data : []);
        } catch (requestError) {
          if (mounted) setError(apiErrorMessage(requestError));
        }
      }
      const query = new URLSearchParams(window.location.search);
      if (query.get('subscription') === 'return') {
        try {
          const response = await api.post<Subscription>('/soma/subscription/refresh');
          if (mounted) {
            setSubscription(response.data);
            setMessage('Status da assinatura atualizado.');
          }
          query.delete('subscription');
          window.history.replaceState({}, '', `${window.location.pathname}?${query.toString()}`);
        } catch (requestError) {
          if (mounted) setError(apiErrorMessage(requestError));
        }
      }
    };
    void initialize();
    return () => {
      mounted = false;
    };
  }, [load, showRecent]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setMessage(`${label} copiado.`);
  };
  const ted = settings
    ? `Banco: ${settings.pixBank}\nAgência: ${settings.pixAgency}\nConta: ${settings.pixAccount}\nCNPJ: ${settings.pixCnpj}`
    : '';
  const submit = async () => {
    try {
      await api.post('/soma/contributions', {
        ...form,
        amount: Number(form.amount),
        method: 'PIX',
      });
      setSaved(true);
      setOpen(false);
      if (showRecent) {
        const response = await api.get<Contribution[]>('/soma/contributions');
        setItems(Array.isArray(response.data) ? response.data : []);
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  };
  const saveSettings = async () => {
    if (!edit) return;
    try {
      const response = await api.patch<Settings>('/soma/settings', edit);
      setSettings(response.data);
      setEdit(response.data);
      setAdminOpen(false);
      setMessage('Configurações financeiras atualizadas.');
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  };
  const createSubscription = async () => {
    setSubscriptionBusy(true);
    setError('');
    try {
      const response = await api.post<SubscriptionCheckout>('/soma/subscription/checkout', {
        amount: Number(subscriptionAmount),
      });
      window.location.assign(response.data.checkoutUrl);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
      setSubscriptionBusy(false);
    }
  };
  const refreshSubscription = async () => {
    setSubscriptionBusy(true);
    setError('');
    try {
      const response = await api.post<Subscription>('/soma/subscription/refresh');
      setSubscription(response.data);
      setMessage('Status da assinatura atualizado.');
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setSubscriptionBusy(false);
    }
  };
  const cancelSubscription = async () => {
    if (!window.confirm('Cancelar a assinatura mensal e interromper as próximas cobranças?'))
      return;
    setSubscriptionBusy(true);
    setError('');
    try {
      const response = await api.post<Subscription>('/soma/subscription/cancel');
      setSubscription(response.data);
      setMessage('Assinatura cancelada.');
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setSubscriptionBusy(false);
    }
  };

  if (!settings || !subscription)
    return (
      <Box minHeight={400} display="grid" sx={{ placeItems: 'center' }}>
        <CircularProgress aria-label="Carregando dados do Soma+" />
      </Box>
    );

  const statusColor =
    subscription.status === 'ACTIVE'
      ? 'success'
      : subscription.status === 'PENDING' || subscription.status === 'PAUSED'
        ? 'warning'
        : 'default';
  const canStartSubscription = ['INACTIVE', 'CANCELLED'].includes(subscription.status);

  return (
    <Box>
      <Card
        sx={{
          mb: 2,
          background: 'linear-gradient(135deg,rgba(25,118,210,.16),rgba(156,39,176,.10))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h4" fontWeight={900}>
            💙 Soma+
          </Typography>
          <Typography variant="h6" mt={1}>
            “Cada um contribua segundo propôs em seu coração.”
          </Typography>
          <Typography color="text.secondary" mt={1}>
            {settings.description}
          </Typography>
        </CardContent>
      </Card>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Contribuição registrada. A confirmação será feita pela administração.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <CreditCardOutlined color="primary" sx={{ fontSize: 42 }} />
            <Typography variant="h5" fontWeight={800} mt={1}>
              Contribuição mensal
            </Typography>
            <Typography color="text.secondary" my={1.5}>
              Escolha o valor e cadastre o cartão no ambiente seguro do Mercado Pago. As renovações
              serão identificadas automaticamente no seu cadastro.
            </Typography>
            {subscription.status === 'PENDING' && subscription.manageUrl ? (
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<FavoriteOutlined />}
                href={subscription.manageUrl}
              >
                Continuar autorização
              </Button>
            ) : (
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<FavoriteOutlined />}
                disabled={!canStartSubscription}
                onClick={() => setSubscriptionOpen(true)}
              >
                {canStartSubscription ? 'Assinar mensalmente' : 'Assinatura já vinculada'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight={800}>
              Minha assinatura
            </Typography>
            <Stack spacing={1.3} mt={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Typography color="text.secondary">Status</Typography>
                <Chip
                  size="small"
                  color={statusColor}
                  label={subscriptionLabels[subscription.status]}
                />
              </Stack>
              <Divider />
              <Info label="Plano" value={subscription.plan} />
              <Info
                label="Valor"
                value={subscription.amount === null ? 'Não definido' : money(subscription.amount)}
              />
              <Info
                label="Próxima cobrança"
                value={
                  subscription.nextCharge
                    ? new Date(subscription.nextCharge).toLocaleDateString('pt-BR')
                    : 'Disponível após a ativação'
                }
              />
              <Info
                label="Cartão"
                value={
                  subscription.cardLastFour
                    ? `•••• ${subscription.cardLastFour}`
                    : 'Gerenciado pelo Mercado Pago'
                }
              />
              {subscription.id && (
                <Button
                  variant="outlined"
                  startIcon={<RefreshOutlined />}
                  disabled={subscriptionBusy}
                  onClick={refreshSubscription}
                >
                  Atualizar status
                </Button>
              )}
              {subscription.canCancel && (
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<CancelOutlined />}
                  disabled={subscriptionBusy}
                  onClick={cancelSubscription}
                >
                  Cancelar assinatura
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PixOutlined color="primary" />
              <Typography variant="h6" fontWeight={800}>
                Contribuição via PIX
              </Typography>
            </Stack>
            <Box
              component="img"
              src={settings.pixQrCodeUrl}
              alt="QR Code Pix"
              sx={{
                display: 'block',
                width: '100%',
                maxWidth: 210,
                aspectRatio: '1 / 1',
                objectFit: 'contain',
                mx: 'auto',
                my: 1.5,
                borderRadius: 1,
              }}
            />
            <Box
              sx={{
                p: 1.25,
                border: '1px dashed',
                borderColor: 'primary.main',
                borderRadius: 1.5,
                wordBreak: 'break-all',
              }}
            >
              <Typography fontSize={11} color="text.secondary">
                Chave PIX ({settings.pixKeyType})
              </Typography>
              <Typography fontSize={14} fontWeight={800}>
                {settings.pixKey}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={1.5}>
              <Button
                size="small"
                fullWidth
                variant="outlined"
                startIcon={<ContentCopyOutlined />}
                onClick={() => copy(settings.pixKey, 'Chave PIX')}
              >
                Copiar chave
              </Button>
              <Button
                size="small"
                fullWidth
                variant="contained"
                startIcon={<UploadFileOutlined />}
                onClick={() => setOpen(true)}
              >
                Registrar
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AccountBalanceOutlined color="primary" />
              <Typography variant="h6" fontWeight={800}>
                Dados para TED
              </Typography>
            </Stack>
            <Stack spacing={0.65} mt={1.5}>
              <Info label="Banco" value={settings.pixBank} />
              <Info label="Agência" value={settings.pixAgency} />
              <Info label="Conta" value={settings.pixAccount} />
              <Info label="CNPJ" value={settings.pixCnpj} />
            </Stack>
            <Button
              fullWidth
              size="small"
              sx={{ mt: 1.5 }}
              variant="outlined"
              startIcon={<ContentCopyOutlined />}
              onClick={() => copy(ted, 'Dados bancários')}
            >
              Copiar dados
            </Button>
          </CardContent>
        </Card>
      </Box>

      {payments.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} mb={1.5}>
              Meus pagamentos confirmados
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  'th,td': {
                    p: 1.2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Forma</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.payment_id || payment.id}>
                      <td>
                        {new Date(payment.date_approved || payment.date_created).toLocaleDateString(
                          'pt-BR',
                        )}
                      </td>
                      <td>{payment.description || 'Contribuição Soma+'}</td>
                      <td>{money(Number(payment.amount))}</td>
                      <td>{payment.payment_method || 'Mercado Pago'}</td>
                      <td>
                        <Chip
                          size="small"
                          color={payment.status === 'approved' ? 'success' : 'default'}
                          label={payment.status === 'approved' ? 'Aprovado' : payment.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
      {canAdmin && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Administração financeira
                </Typography>
                <Typography color="text.secondary">
                  Altere Pix, TED e QR Code. As assinaturas são criadas automaticamente pela API.
                </Typography>
              </Box>
              <Button
                startIcon={<SettingsOutlined />}
                variant="outlined"
                onClick={() => setAdminOpen(true)}
              >
                Configurar
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      {showRecent && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Contribuições recentes
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  'th,td': {
                    p: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'left',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Nome</th>
                    <th>Valor</th>
                    <th>Forma</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                      <td>{item.memberName}</td>
                      <td>{money(item.amount)}</td>
                      <td>{item.method}</td>
                      <td>
                        {item.status === 'CONFIRMED'
                          ? 'Confirmada'
                          : item.status === 'PENDING'
                            ? 'Pendente'
                            : 'Cancelada'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={subscriptionOpen}
        onClose={() => !subscriptionBusy && setSubscriptionOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Assinatura mensal Soma+</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Alert severity="info">
              O valor será cobrado mensalmente no cartão cadastrado no Mercado Pago. Você poderá
              cancelar pelo app.
            </Alert>
            <TextField
              autoFocus
              label="Valor mensal"
              type="number"
              value={subscriptionAmount}
              onChange={(event) => setSubscriptionAmount(event.target.value)}
              inputProps={{ min: 1, step: '0.01' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscriptionOpen(false)} disabled={subscriptionBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={createSubscription}
            disabled={subscriptionBusy || Number(subscriptionAmount) < 1}
          >
            {subscriptionBusy ? 'Criando...' : 'Continuar no Mercado Pago'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar contribuição</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nome"
              value={form.memberName}
              onChange={(event) => setForm({ ...form, memberName: event.target.value })}
            />
            <TextField
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <TextField
              label="Valor"
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            <TextField select label="Forma" value="PIX">
              <MenuItem value="PIX">PIX</MenuItem>
            </TextField>
            <TextField
              label="Observações"
              multiline
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
            <Button component="label" variant="outlined" startIcon={<UploadFileOutlined />}>
              Selecionar comprovante
              <input hidden type="file" accept="image/*,.pdf" />
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.memberName || Number(form.amount) <= 0}
            onClick={submit}
          >
            Enviar registro
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={adminOpen} onClose={() => setAdminOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Configurações financeiras</DialogTitle>
        <DialogContent>
          {edit && (
            <Stack spacing={2} mt={1}>
              <TextField
                label="Chave PIX"
                value={edit.pixKey}
                onChange={(event) => setEdit({ ...edit, pixKey: event.target.value })}
              />
              <TextField
                label="Banco"
                value={edit.pixBank}
                onChange={(event) => setEdit({ ...edit, pixBank: event.target.value })}
              />
              <TextField
                label="Agência"
                value={edit.pixAgency}
                onChange={(event) => setEdit({ ...edit, pixAgency: event.target.value })}
              />
              <TextField
                label="Conta"
                value={edit.pixAccount}
                onChange={(event) => setEdit({ ...edit, pixAccount: event.target.value })}
              />
              <TextField
                label="CNPJ"
                value={edit.pixCnpj}
                onChange={(event) => setEdit({ ...edit, pixCnpj: event.target.value })}
              />
              <TextField
                label="URL do QR Code"
                value={edit.pixQrCodeUrl}
                onChange={(event) => setEdit({ ...edit, pixQrCodeUrl: event.target.value })}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveSettings}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={800} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export function SomaPage() {
  const { hasRole } = useAuth();
  const isCommonMember =
    hasRole('MEMBER') &&
    !hasRole('ADMIN', 'DEVELOPER', 'MISSION_LEADER', 'MINISTRY_LEADER', 'CELL_LEADER');
  const canViewReports = hasRole('ADMIN', 'DEVELOPER', 'MINISTRY_LEADER');
  const canAdmin = hasRole('ADMIN', 'DEVELOPER', 'MISSION_LEADER');
  const [params, setParams] = useSearchParams();
  const values = canViewReports
    ? ['contribuicoes', 'financeiro', 'relatorios', 'drive']
    : ['contribuicoes', 'financeiro', 'drive'];
  const requested = params.get('tab') || 'contribuicoes';
  const current = Math.max(0, values.indexOf(requested));
  const setTab = (index: number) => setParams(index === 0 ? {} : { tab: values[index] });
  return (
    <Box>
      <Typography variant="h4">Soma+</Typography>
      <Typography color="text.secondary" mb={2}>
        Contribuições recorrentes e avulsas em um só lugar.
      </Typography>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={current} onChange={(_, value) => setTab(value)} variant="scrollable">
          <Tab label="Contribuições e PIX" />
          <Tab label={canViewReports ? 'Centro Financeiro' : 'Minhas Contribuições'} />
          {canViewReports && <Tab label="Relatórios" />}
          <Tab label="Google Drive" />
        </Tabs>
      </Paper>
      {values[current] === 'contribuicoes' ? (
        <SomaContributionPanel showRecent={!isCommonMember} canAdmin={canAdmin} />
      ) : values[current] === 'financeiro' ? (
        <FinancialEnterprisePanel admin={canViewReports} />
      ) : values[current] === 'relatorios' ? (
        <ReportsPage embedded />
      ) : (
        <DrivePage embedded />
      )}
    </Box>
  );
}
