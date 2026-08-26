const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { ForbiddenException, NotFoundException, UnauthorizedException, ValidationPipe } = require('@nestjs/common');
const { APP_GUARD } = require('@nestjs/core');
const { Test } = require('@nestjs/testing');
const { AuthController } = require('../dist/auth/auth.controller');
const { AuthService } = require('../dist/auth/auth.service');
const { FirebaseAuthGuard } = require('../dist/auth/guards/firebase-auth.guard');
const { RolesGuard } = require('../dist/auth/guards/roles.guard');
const { MembersController } = require('../dist/members/members.controller');
const { MEMBER_REPOSITORY } = require('../dist/persistence/interfaces/member-repository.interface');
const { MemberProfileService } = require('../dist/members/member-profile.service');
const { MinistryScopeService } = require('../dist/rbac/ministry-scope.service');
const { MapsSyncService } = require('../dist/google-maps/maps-sync.service');
const { ProfilesService } = require('../dist/rbac/profiles.service');
const { CommunitiesController } = require('../dist/communities/communities.controller');
const { CommunitiesService } = require('../dist/communities/communities.service');
const { NotificationsController } = require('../dist/notifications/notifications.controller');
const { NotificationsService } = require('../dist/notifications/notifications.service');
const { MissionaryAgendaController } = require('../dist/missionary-agenda/missionary-agenda.controller');
const { MissionaryAgendaService } = require('../dist/missionary-agenda/missionary-agenda.service');
const { SomaController } = require('../dist/soma/soma.controller');
const { SomaService } = require('../dist/soma/soma.service');
const { AdminDashboardController } = require('../dist/admin/admin-dashboard.controller');
const { AdminDashboardService } = require('../dist/admin/admin-dashboard.service');
const { GoogleSheetsService } = require('../dist/google/google-sheets.service');
const { PermissionsGuard } = require('../dist/rbac/guards/permissions.guard');
const { PermissionService } = require('../dist/rbac/permission.service');
const { Permission } = require('../dist/rbac/enums/permission.enum');

const users = {
  admin: { uid: 'admin', id: 'admin', memberId: 'admin', email: 'admin@example.test', name: 'Admin', profile: 'ADMIN', active: true },
  a: { uid: 'a', id: 'a', memberId: 'a', email: 'a@example.test', name: 'Membro A', profile: 'MEMBER', active: true, cell: 'Cenáculo A' },
  b: { uid: 'b', id: 'b', memberId: 'b', email: 'b@example.test', name: 'Membro B', profile: 'MEMBER', active: true, cell: 'Cenáculo B' },
  sent: { uid: 'sent', id: 'sent', memberId: 'sent', email: 'sent@example.test', name: 'Enviado', profile: 'MEMBER', active: true },
};

const allPermissions = Object.values(Permission);
const memberPermissions = [Permission.DASHBOARD_READ, Permission.MEMBERS_READ, Permission.CENACLES_READ,
  Permission.MISSIONARY_AGENDA_READ, Permission.SOMA_READ, Permission.NOTIFICATIONS_READ];

async function createApp() {
  const members = Object.values(users);
  const readBy = new Map();
  const notifications = [
    { id: 'individual-a', audience: 'INDIVIDUAL', recipientId: 'a' },
    { id: 'cenacle-a', audience: 'CENACULO', cenacleId: 'cenacle-a' },
    { id: 'todos', audience: 'TODOS' },
  ];
  const canReadNotification = (id, user) => id === 'todos' || id === 'individual-a' && user.memberId === 'a' || id === 'cenacle-a' && user.memberId === 'a';
  const notificationState = (user) => ({ notifications: notifications.filter((item) => canReadNotification(item.id, user)), unreadCount: 0 });
  const mockNotifications = {
    state: async (user) => notificationState(user), options: async () => ({}), preferences: async () => ({}),
    updatePreferences: async () => ({}), deliveryHistory: async () => [], processAutomations: async () => ({}),
    create: async () => ({}), markAll: async () => ({}), remove: async () => ({}),
    markRead: async (id, user) => { if (!canReadNotification(id, user)) throw new NotFoundException(); readBy.set(`${user.memberId}:${id}`, true); return { id, read: true }; },
  };
  const mission = { id: 'mission-a', status: 'ENVIADA_AOS_MEMBROS', createdBy: 'leader', participantIds: ['sent'] };
  const visibleMission = (id, user) => id === mission.id && (user.memberId === 'sent' || user.profile === 'ADMIN');
  const mockMissionary = {
    list: async (_filters, user) => visibleMission(mission.id, user) ? [mission] : [], options: async () => ({}),
    findOne: async (id, user) => { if (!visibleMission(id, user)) throw new NotFoundException(); return mission; },
    history: async (id, user) => { if (!visibleMission(id, user)) throw new NotFoundException(); return []; },
    complete: async (id, user) => { if (!visibleMission(id, user)) throw new ForbiddenException(); mission.status = 'CONCLUIDA'; return mission; },
  };
  const mockCommunities = {
    list: async (_type, user) => [{ id: user.memberId === 'a' ? 'cenacle-a' : 'cenacle-b' }],
    detail: async (id, user) => { const own = user.memberId === 'a' ? 'cenacle-a' : user.memberId === 'b' ? 'cenacle-b' : id; if (user.profile !== 'ADMIN' && id !== own) throw new NotFoundException(); return { id }; },
  };
  const mockSoma = {
    settings: async () => ({}), list: async (user) => [{ memberId: user.memberId }],
    receipt: async (paymentId, user) => { if (paymentId !== `payment-${user.memberId}` && user.profile !== 'ADMIN') throw new NotFoundException(); return Buffer.from('pdf'); },
  };
  const memberRepository = { listMembers: async () => members, read: async () => [], parseActive: () => true };
  const auth = {
    authenticateToken: async (token) => {
      if (token === 'invalid') throw new UnauthorizedException('Token inválido');
      if (token === 'no-member') throw new ForbiddenException('Membro não registrado');
      if (token === 'inactive') throw new ForbiddenException('Membro inativo');
      const user = users[token];
      if (!user) throw new UnauthorizedException('Token inválido');
      return user;
    },
    login: async (token) => ({ user: await auth.authenticateToken(token) }),
  };
  const permissions = {
    has: async (user, ...required) => required.every((permission) => (user.profile === 'ADMIN' ? allPermissions : memberPermissions).includes(permission)),
    forUser: async (user) => ({ permissions: user.profile === 'ADMIN' ? allPermissions : memberPermissions }),
  };
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController, MembersController, CommunitiesController, NotificationsController, MissionaryAgendaController, SomaController, AdminDashboardController],
    providers: [
      { provide: AuthService, useValue: auth }, { provide: PermissionService, useValue: permissions },
      { provide: MEMBER_REPOSITORY, useValue: memberRepository }, { provide: MemberProfileService, useValue: {} },
      { provide: MinistryScopeService, useValue: { memberIds: async () => new Set() } },
      { provide: MapsSyncService, useValue: {} }, { provide: ProfilesService, useValue: {} },
      { provide: CommunitiesService, useValue: mockCommunities }, { provide: NotificationsService, useValue: mockNotifications },
      { provide: MissionaryAgendaService, useValue: mockMissionary }, { provide: SomaService, useValue: mockSoma },
      { provide: AdminDashboardService, useValue: { getDashboard: async () => ({ ok: true }) } },
      { provide: GoogleSheetsService, useValue: { schemaStatus: async () => [] } },
      { provide: APP_GUARD, useClass: FirebaseAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard },
      { provide: APP_GUARD, useClass: PermissionsGuard },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

let app;
test.before(async () => { app = await createApp(); });
test.after(async () => { await app.close(); });
const get = (path, token) => request(app.getHttpServer()).get(`/api${path}`).set(token ? { Authorization: `Bearer ${token}` } : {});

test('autenticação HTTP rejeita ausência, token inválido, membro ausente e inativo', async () => {
  assert.equal((await get('/auth/me')).status, 401);
  assert.equal((await get('/auth/me', 'invalid')).status, 401);
  assert.equal((await get('/auth/me', 'no-member')).status, 403);
  assert.equal((await get('/auth/me', 'inactive')).status, 403);
  assert.equal((await get('/auth/me', 'a')).status, 200);
});

test('Membros aplica gestão por perfil e bloqueia edição privada de terceiro', async () => {
  assert.equal((await get('/members', 'admin')).status, 200);
  assert.equal((await get('/members/a', 'a')).status, 200);
  assert.equal((await request(app.getHttpServer()).put('/api/members/b').set('Authorization', 'Bearer a').send({ name: 'Ataque' })).status, 404);
});

test('Cenáculos limita o escopo e alteração manual do ID não amplia acesso', async () => {
  assert.equal((await get('/communities/cenacle-a', 'a')).status, 200);
  assert.equal((await get('/communities/cenacle-a', 'b')).status, 404);
  assert.equal((await get('/communities/cenacle-b', 'a')).status, 404);
});

test('Notificações respeita INDIVIDUAL, CENACULO, TODOS, state e leitura BOLA', async () => {
  const a = await get('/notifications/state', 'a');
  const b = await get('/notifications/state', 'b');
  assert.deepEqual(a.body.notifications.map((item) => item.id).sort(), ['cenacle-a', 'individual-a', 'todos']);
  assert.deepEqual(b.body.notifications.map((item) => item.id), ['todos']);
  assert.equal((await request(app.getHttpServer()).patch('/api/notifications/individual-a/read').set('Authorization', 'Bearer b').send({ read: true })).status, 404);
  assert.equal((await request(app.getHttpServer()).patch('/api/notifications/cenacle-a/read').set('Authorization', 'Bearer a').send({ read: true })).status, 200);
});

test('Agenda Missionária bloqueia BOLA e permite conclusão do enviado', async () => {
  assert.equal((await get('/missionary-agenda/mission-a', 'a')).status, 404);
  assert.equal((await get('/missionary-agenda/mission-a', 'sent')).status, 200);
  assert.equal((await request(app.getHttpServer()).post('/api/missionary-agenda/mission-a/complete').set('Authorization', 'Bearer a')).status, 403);
  assert.equal((await request(app.getHttpServer()).post('/api/missionary-agenda/mission-a/complete').set('Authorization', 'Bearer sent').set('Idempotency-Key', 'e2e-complete')).status, 201);
});

test('Soma+ mantém contribuição e recibo no proprietário', async () => {
  assert.deepEqual((await get('/soma/contributions', 'a')).body, [{ memberId: 'a' }]);
  assert.equal((await get('/soma/receipts/payment-b', 'a')).status, 404);
  assert.equal((await get('/soma/receipts/payment-a', 'a')).status, 200);
});

test('Administração exige SETTINGS_READ', async () => {
  assert.equal((await get('/admin/dashboard', 'admin')).status, 200);
  assert.equal((await get('/admin/dashboard', 'a')).status, 403);
});
