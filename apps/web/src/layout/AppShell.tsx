import {
  AccountCircleOutlined,
  AccountTreeOutlined,
  ArticleOutlined,
  AssessmentOutlined,
  CakeOutlined,
  CalendarMonthOutlined,
  CelebrationOutlined,
  DeleteOutline,
  ExpandLess,
  ExpandMore,
  FavoriteBorderOutlined,
  GroupsOutlined,
  HistoryOutlined,
  HomeOutlined,
  HubOutlined,
  LogoutOutlined,
  MapOutlined,
  MenuOutlined,
  NotificationsNoneOutlined,
  SecurityOutlined,
  SettingsOutlined,
  SettingsSuggestOutlined,
  SpeedOutlined,
  VolunteerActivismOutlined,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, type ReactElement, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../components/Brand';
import { Can } from '../components/rbac/Can';
import { useNotificationState } from '../notifications/notificationStore';
import { Permission, type PermissionCode } from '../rbac/permissions';

const drawerWidth = 304;
type MenuItem = {
  icon: ReactElement;
  label: string;
  path: string;
  permission?: PermissionCode;
  anyOf?: PermissionCode[];
  hiddenFor?: string[];
};

const items: MenuItem[] = [
  { icon: <HomeOutlined />, label: 'Início', path: '/', permission: Permission.DASHBOARD_READ },
  { icon: <ArticleOutlined />, label: 'Lectio Divina', path: '/lectio', permission: Permission.LECTIO_READ },
  { icon: <CalendarMonthOutlined />, label: 'Agenda', path: '/agenda', permission: Permission.EVENTS_READ },
  { icon: <CelebrationOutlined />, label: 'Eventos', path: '/eventos', permission: Permission.EVENTS_READ },
  { icon: <FavoriteBorderOutlined />, label: 'Soma+', path: '/soma', permission: Permission.SOMA_READ },
  { icon: <GroupsOutlined />, label: 'Células', path: '/celulas', permission: Permission.CELLS_READ },
  { icon: <GroupsOutlined />, label: 'Cenáculos', path: '/cenaculos', permission: Permission.CENACLES_READ },
  { icon: <GroupsOutlined />, label: 'Membros', path: '/membros', permission: Permission.MEMBERS_READ },
  { icon: <MapOutlined />, label: 'Mapa', path: '/mapa', anyOf: [Permission.MEMBERS_READ, Permission.CELLS_READ, Permission.CENACLES_READ] },
  { icon: <NotificationsNoneOutlined />, label: 'Notificações', path: '/notificacoes', permission: Permission.DASHBOARD_READ },
  { icon: <CakeOutlined />, label: 'Aniversários', path: '/aniversarios', permission: Permission.MEMBERS_READ },
  { icon: <AssessmentOutlined />, label: 'Relatórios', path: '/relatorios', permission: Permission.REPORTS_READ },
  { icon: <AccountCircleOutlined />, label: 'Perfil', path: '/perfil', permission: Permission.DASHBOARD_READ },
];

const organizationItems: MenuItem[] = [
  { icon: <HubOutlined />, label: 'Dashboard', path: '/organizacao', permission: Permission.SETTINGS_READ },
  { icon: <AccountTreeOutlined />, label: 'Missões', path: '/missoes', permission: Permission.MINISTRIES_READ, hiddenFor: ['MEMBER'] },
  { icon: <VolunteerActivismOutlined />, label: 'Ministérios', path: '/ministerios', permission: Permission.MINISTRIES_READ },
  { icon: <AccountCircleOutlined />, label: 'Perfis', path: '/configuracoes/perfis', permission: Permission.SETTINGS_MANAGE },
  { icon: <SecurityOutlined />, label: 'Permissões', path: '/configuracoes/rbac', permission: Permission.SETTINGS_MANAGE },
  { icon: <HistoryOutlined />, label: 'Auditoria', path: '/auditoria', anyOf: [Permission.LOGS_READ, Permission.SETTINGS_READ] },
];

const adminItems: MenuItem[] = [
  { icon: <DeleteOutline />, label: 'Lixeira', path: '/lixeira', anyOf: [Permission.SETTINGS_MANAGE, Permission.MEMBERS_DELETE] },
  { icon: <SettingsOutlined />, label: 'Configurações', path: '/configuracoes', permission: Permission.SETTINGS_READ },
  { icon: <SettingsSuggestOutlined />, label: 'Integrações', path: '/configuracoes/integracoes', permission: Permission.INTEGRATIONS_READ },
  { icon: <SpeedOutlined />, label: 'Performance', path: '/configuracoes/performance', permission: Permission.SETTINGS_READ },
  { icon: <SettingsSuggestOutlined />, label: 'Administração técnica', path: '/configuracoes/tecnico', permission: Permission.TECHNICAL_ADMIN_READ },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationState();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const safeUnreadCount = Number.isFinite(unreadCount) ? Math.max(0, unreadCount) : 0;

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const renderMenuItem = ({ icon, label, path, permission, anyOf, hiddenFor }: MenuItem, nested = false) => {
    if (user && hiddenFor?.includes(user.profile)) return null;
    const selected = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

    return (
      <Can key={path} permission={permission} anyOf={anyOf}>
        <ListItemButton
          selected={selected}
          onClick={() => go(path)}
          sx={{
            minHeight: 44,
            mb: 0.25,
            px: nested ? 3.25 : 1.75,
            borderRadius: 2,
            '&.Mui-selected': { background: 'linear-gradient(90deg,#2c2119,#17120f)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: selected ? 'primary.main' : 'text.secondary' }}>
            {path === '/notificacoes' ? (
              <Badge color="primary" badgeContent={safeUnreadCount} max={99} invisible={safeUnreadCount === 0}>
                {icon}
              </Badge>
            ) : icon}
          </ListItemIcon>
          <ListItemText primary={label} primaryTypographyProps={{ fontSize: nested ? 14 : 15 }} />
        </ListItemButton>
      </Can>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', px: 2.5, py: 2.25, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Brand />
      <List sx={{ mt: 2, flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
        {items.map((item) => renderMenuItem(item))}
        <Can anyOf={[Permission.SETTINGS_READ, Permission.SETTINGS_MANAGE, Permission.MINISTRIES_READ, Permission.LOGS_READ]}>
          <ListItemButton
            onClick={() => setOrganizationOpen((value) => !value)}
            selected={location.pathname.startsWith('/organizacao')}
            sx={{ minHeight: 46, mb: 0.25, px: 1.75, borderRadius: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}><AccountTreeOutlined /></ListItemIcon>
            <ListItemText primary="Organização" primaryTypographyProps={{ fontSize: 15, fontWeight: 700 }} />
            {organizationOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={organizationOpen} timeout="auto" unmountOnExit>
            <List disablePadding>{organizationItems.map((item) => renderMenuItem(item, true))}</List>
          </Collapse>
        </Can>
        {adminItems.map((item) => renderMenuItem(item))}
      </List>
      <Box sx={{ flex: '0 0 auto', pt: 0.75 }}>
        <Divider sx={{ mb: 0.75 }} />
        <ListItemButton
          onClick={async () => {
            setOpen(false);
            await logout();
          }}
          sx={{ minHeight: 44, height: 44, px: 1.75, borderRadius: 2, color: 'text.secondary' }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><LogoutOutlined fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sair" primaryTypographyProps={{ fontSize: 15, fontWeight: 500 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {mobile ? (
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{ sx: { width: 'min(302px,88vw)', background: '#050505' } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: drawerWidth, background: '#050505', overflow: 'hidden' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          left: { xs: 0, md: `${drawerWidth}px` },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'rgba(5,5,5,.78)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 72, md: 76 }, px: { xs: 2, md: 4 } }}>
          {mobile && (
            <Tooltip title="Abrir menu">
              <IconButton aria-label="Abrir menu" onClick={() => setOpen(true)} edge="start">
                <MenuOutlined />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ flex: 1 }} />
          <Can permission={Permission.DASHBOARD_READ}>
            <Tooltip title={safeUnreadCount ? `${safeUnreadCount} notificação(ões) não lida(s)` : 'Notificações'}>
              <IconButton aria-label="Abrir notificações" onClick={() => go('/notificacoes')}>
                <Badge color="primary" badgeContent={safeUnreadCount} max={99} invisible={safeUnreadCount === 0}>
                  <NotificationsNoneOutlined />
                </Badge>
              </IconButton>
            </Tooltip>
          </Can>
          <Tooltip title="Abrir perfil">
            <IconButton aria-label="Abrir perfil" onClick={() => go('/perfil')} sx={{ ml: 1, p: 0.25 }}>
              <Avatar src={user?.photo} alt={user?.name ?? 'Perfil'} sx={{ width: 42, height: 42 }}>
                {user?.name?.[0] ?? '?'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 4, md: 5 },
          pt: { xs: 11, md: 12 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
