const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');

const baseUser = {
  uid: 'member-sent', id: 'member-sent', memberId: 'member-sent', name: 'Missionário Enviado',
  email: 'sent@example.test', profile: 'MEMBER', role: 'MEMBER', ministry: 'Missões', cell: '',
  photo: '', phone: '', active: true, bio: '', instagram: '', birthDate: '', joinedAt: '',
  city: 'Brasília', state: 'DF', gifts: [], formator: '',
};

const agenda = {
  id: 'agenda-e2e', missionId: 'missao-brasilia', title: 'Missão E2E local',
  description: 'Validação local sem dados produtivos.', type: 'MISSAO', status: 'ENVIADA_AOS_MEMBROS',
  startDate: '2026-09-05', endDate: '2026-09-05', startTime: '16:00', endTime: '18:00',
  location: 'Local fictício', address: '', neighborhood: '', city: 'Brasília', state: 'DF', zipCode: '',
  responsibleId: '', responsibleName: '', ministryId: 'ministry-1', ministryName: 'Missões',
  participantLimit: 10, meetingPoint: '', transport: '', notes: '', submittedBy: '', submittedAt: '',
  approvedBy: '', approvedAt: '', approvalNotes: '', rejectedBy: '', rejectedAt: '', rejectionReason: '',
  membersSentBy: 'leader', membersSentAt: '2026-09-01T10:00:00.000Z', completedBy: '', completedAt: '',
  completionRole: '', participantIds: ['member-sent'], participantNames: ['Missionário Enviado'],
  accompanyingIds: [], accompanyingNames: [], intercessorIds: [], intercessorNames: [],
  canEdit: false, canSubmit: false, canReview: false, canSelectMembers: false, canComplete: true,
  active: true, createdBy: 'agenda-leader', createdAt: '2026-08-30T10:00:00.000Z',
  updatedBy: 'leader', updatedAt: '2026-09-01T10:00:00.000Z',
};

async function configure(page, user, canComplete) {
  let current = { ...agenda, canComplete };
  let completeCalls = 0;
  const history = [{
    id: 'history-sent', agendaId: current.id, previousStatus: 'AGUARDANDO_INDICACOES',
    status: 'ENVIADA_AOS_MEMBROS', action: 'ENVIADA_AOS_MEMBROS', note: 'Membro selecionado.',
    userId: 'leader', userName: 'Líder', createdAt: '2026-09-01T10:00:00.000Z',
  }];
  await page.addInitScript((snapshot) => localStorage.setItem('colo:user', JSON.stringify(snapshot)), user);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/me') return json({ user });
    if (path === '/rbac/me') return json({
      profile: user.profile, permissions: ['DASHBOARD:READ', 'MISSIONARY_AGENDA:READ'],
      scopes: { 'MISSIONARY_AGENDA:READ': 'OWN' }, ministryModules: [],
    });
    if (path === '/missionary-agenda/options') return json({ currentMemberId: user.memberId, members: [], ministries: [] });
    if (path === '/missionary-agenda' && request.method() === 'GET') return json([current]);
    if (path === `/missionary-agenda/${current.id}/history`) return json(history);
    if (path === `/missionary-agenda/${current.id}/complete` && request.method() === 'POST') {
      completeCalls += 1;
      current = {
        ...current, status: 'CONCLUIDA', canComplete: false, completedBy: user.memberId,
        completedAt: '2026-09-05T18:01:00.000Z', completionRole: 'MISSIONARIO_ENVIADO',
      };
      history.push({
        id: 'history-complete', agendaId: current.id, previousStatus: 'ENVIADA_AOS_MEMBROS',
        status: 'CONCLUIDA', action: 'CONCLUIDA', note: 'Missão concluída.', userId: user.memberId,
        userName: user.name, createdAt: current.completedAt,
      });
      return json(current);
    }
    if (path === '/notifications/state') return json({ notifications: [], items: [], unreadCount: 0, readCount: 0, total: 0, updatedAt: new Date().toISOString() });
    return json({});
  });
  return { completeCalls: () => completeCalls };
}

async function axe(page, context) {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async (selector) => {
    const root = selector ? document.querySelector(selector) : document;
    return window.axe.run(root);
  }, context);
  return result.violations
    .filter((violation) => !violation.tags.includes('best-practice'))
    .map((violation) => ({ id: violation.id, impact: violation.impact, targets: violation.nodes.map((node) => node.target) }));
}

let browser;

(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const authorizedPage = await context.newPage();
  authorizedPage.setDefaultTimeout(10_000);
  const authorized = await configure(authorizedPage, baseUser, true);
  await authorizedPage.goto('http://127.0.0.1:4173/agenda-missionaria');
  await authorizedPage.getByRole('button', { name: 'Concluir missão' }).click();
  await authorizedPage.getByRole('dialog', { name: 'Concluir missão' }).waitFor();
  const dialogA11y = await axe(authorizedPage, '[role="dialog"]');
  await authorizedPage.getByRole('button', { name: 'Confirmar conclusão' }).click();
  await authorizedPage.getByText('Missão concluída com sucesso.').waitFor();
  await authorizedPage.getByText('Concluída', { exact: true }).waitFor();
  if (authorized.completeCalls() !== 1) throw new Error(`completeCalls=${authorized.completeCalls()}`);
  if (await authorizedPage.getByRole('button', { name: 'Concluir missão' }).count()) throw new Error('Botão de conclusão permaneceu visível.');
  await authorizedPage.getByRole('button', { name: 'Histórico' }).click();
  await authorizedPage.getByText('CONCLUIDA', { exact: true }).waitFor();

  const deniedPage = await context.newPage();
  deniedPage.setDefaultTimeout(10_000);
  await configure(deniedPage, { ...baseUser, uid: 'outsider', id: 'outsider', memberId: 'outsider', name: 'Não enviado' }, false);
  await deniedPage.goto('http://127.0.0.1:4173/agenda-missionaria');
  await deniedPage.getByText('Missão E2E local').waitFor();
  if (await deniedPage.getByRole('button', { name: 'Concluir missão' }).count()) throw new Error('Usuário não autorizado recebeu ação de conclusão.');

  await browser.close();
  console.log(JSON.stringify({ authorizedFlow: 'PASS', unauthorizedButton: 'PASS', completeCalls: authorized.completeCalls(), dialogA11y }));
  if (dialogA11y.length) process.exitCode = 1;
})().catch(async (error) => {
  console.error(error.message);
  await browser?.close();
  process.exitCode = 1;
});
