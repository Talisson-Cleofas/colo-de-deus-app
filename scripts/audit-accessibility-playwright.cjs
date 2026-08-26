const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');

const routes = [
  ['Início', '/'], ['Lectio', '/lectio'], ['Agenda Geral', '/agenda'],
  ['Agenda Missionária', '/agenda-missionaria'], ['Eventos', '/eventos'], ['Soma+', '/soma'],
  ['Células', '/celulas'], ['Cenáculos', '/cenaculos'], ['Ministérios', '/ministerios'],
  ['Membros', '/membros'], ['Notificações', '/notificacoes'], ['Perfil', '/perfil'],
  ['Administração', '/configuracoes'], ['Auditoria', '/auditoria'], ['RBAC', '/configuracoes/rbac'],
];
const permissions = [
  'TECHNICAL_ADMIN:READ','TECHNICAL_ADMIN:MANAGE','INTEGRATIONS:READ','INTEGRATIONS:MANAGE','LOGS:READ',
  'BACKUP:MANAGE','SETTINGS:READ','SETTINGS:MANAGE','DASHBOARD:READ','MEMBERS:READ','MEMBERS:CREATE',
  'MEMBERS:UPDATE','MEMBERS:DELETE','MINISTRIES:READ','MINISTRIES:MANAGE','CELLS:READ','CELLS:CREATE',
  'CELLS:UPDATE','CELLS:DELETE','CELLS:MANAGE','ATTENDANCE:READ','ATTENDANCE:CREATE','CENACLES:READ',
  'CENACLES:CREATE','CENACLES:UPDATE','CENACLES:DELETE','CENACLES:MANAGE','EVENTS:READ','EVENTS:CREATE',
  'EVENTS:UPDATE','EVENTS:DELETE','EVENTS:MANAGE','MISSIONARY_AGENDA:READ','MISSIONARY_AGENDA:CREATE',
  'MISSIONARY_AGENDA:UPDATE','LECTIO:READ','LECTIO:MANAGE','SOMA:READ','SOMA:WRITE','SOMA:MANAGE',
  'FINANCIAL_REPORT:READ','NOTIFICATIONS:READ','NOTIFICATIONS:CREATE','NOTIFICATIONS:SEND','REPORTS:READ',
];
const user = { uid: 'a11y-admin', id: 'a11y-admin', memberId: 'a11y-admin', name: 'Administrador local',
  email: 'a11y@example.test', profile: 'ADMIN', role: 'ADMIN', active: true, ministry: '', cell: '', photo: '' };

function responseFor(path) {
  if (path === '/auth/me') return { user };
  if (path === '/rbac/me') return { profile: 'ADMIN', permissions, scopes: {}, ministryModules: [] };
  if (path === '/notifications/state' || path === '/notifications') return { notifications: [], items: [], unreadCount: 0, readCount: 0, total: 0, updatedAt: new Date().toISOString() };
  if (path === '/notifications/preferences') return { events:true,confirmations:true,justifications:true,memberships:true,leadership:true,birthdays:true,birthdayAdvance:true,app:true,push:false,sendTime:'08:00',firebaseToken:'' };
  if (path === '/notifications/options') return { members:[],ministries:[],cells:[],cenacles:[],profiles:[] };
  if (path === '/missionary-agenda/options') return { currentMemberId:user.memberId,members:[],ministries:[] };
  if (path === '/members') return { members: [], total: 0 };
  if (path === '/members/facets') return { ministries:[], cells:[], roles:[] };
  if (path === '/members/me/profile') return { member:user,links:{ministries:[],cells:[],cenacles:[],leader:'',leaders:[],formator:''} };
  if (path.includes('/dashboard')) return { cards:[], indicators:[], upcomingEvents:[], lectio:null };
  if (path.includes('/settings')) return {};
  if (path.includes('/summary')) return { total:0, received:0, pending:0, overdue:0, balance:0 };
  if (path.includes('/facets')) return { ministries:[], cells:[], roles:[] };
  return [];
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  await page.addInitScript((snapshot) => localStorage.setItem('colo:user', JSON.stringify(snapshot)), user);
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseFor(path)) });
  });
  const results = [];
  for (const [name, path] of routes) {
    await page.goto(`http://127.0.0.1:4173${path}`);
    await page.locator('main').waitFor();
    await page.waitForTimeout(500);
    await page.addScriptTag({ path: axePath });
    const audit = await page.evaluate(async () => window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] },
    }));
    const violations = audit.violations.filter((item) => !item.tags.includes('best-practice'));
    results.push({ page: name, path, count: violations.length, violations: violations.map((item) => ({
      id: item.id, impact: item.impact, targets: item.nodes.map((node) => node.target),
    })) });
  }
  await browser.close();
  console.log(JSON.stringify(results));
  if (results.some((item) => item.count)) process.exitCode = 1;
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
