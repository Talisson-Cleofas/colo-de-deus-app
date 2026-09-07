const test = require('node:test');
const assert = require('node:assert/strict');
const { EvaluationsService } = require('../dist/evaluations/evaluations.service');
const { AuditInterceptor } = require('../dist/audit/audit.interceptor');
const { validate } = require('class-validator');
const { AnswerEvaluationDto } = require('../dist/evaluations/evaluations.dto');

function fixture() {
  const members = ['MEMBER', 'MINISTRY_LEADER', 'MISSION_LEADER', 'DEVELOPER', 'CELL_LEADER'].map((profile, i) => ({ id: String(i), memberId: String(i), name: `Pessoa ${i}`, profile, active: true, ministry: '' }));
  const tabs = { AvaliacoesCiclos: [], AvaliacoesRespostas: [], 'Notificações': [], 'Ministérios': [{ id: 'm1', nome: 'Música', lider_id: '1', ativo: 'TRUE' }], Participantes: [{ tipo: 'MINISTERIO', referencia_id: 'm1', membro_id: '0', ativo: 'TRUE' }] };
  let notifications = 0;
  const sheets = { ensureTab: async () => {}, read: async t => tabs[t], listMembers: async () => members, parseActive: (v, fallback) => v ? v === 'TRUE' : fallback,
    appendRecord: async (t, r) => tabs[t].push({ ...r }), updateRecord: async (t, k, id, r) => { tabs[t][tabs[t].findIndex(x => x[k] === id)] = { ...r }; } };
  const service = new EvaluationsService(sheets, { createSystem: async dto => { notifications++; assert.equal(dto.audience, 'TODOS'); assert.equal(dto.link, '/avaliacoes'); tabs['Notificações'].push({ referencia_tipo: dto.referenceType, referencia_id: dto.referenceId }); } });
  const dto = { targetId: 'MISSION:2', scores: [5, 4, 3, 2], strengths: 'Escuta', improvements: 'Comunicação', reflection: '' };
  return { service, members, tabs, dto, notifications: () => notifications };
}

test('evaluation participation follows roles and ministry membership', async () => {
  const f = fixture(); const cycle = await f.service.create({ title: 'Ano 2026', year: 2026 }, f.members[3]);
  assert.equal((await f.service.mine(f.members[0])).cycles.length, 0);
  await f.service.open(cycle.id, f.members[2]);
  const targets = async i => (await f.service.mine(f.members[i])).cycles[0].targets.map(t => t.id);
  assert.deepEqual(await targets(0), ['MISSION:2', 'MINISTRY:m1:1']);
  assert.deepEqual(await targets(1), ['MISSION:2']);
  assert.deepEqual(await targets(2), ['SELF:2', 'MINISTRY:m1:1']);
  assert.deepEqual((await f.service.mine(f.members[4])).cycles, []);
  await f.service.open(cycle.id, f.members[3]);
  assert.equal(f.notifications(), 1);
});

test('cell leader only receives evaluation targets when also linked to an eligible ministry role', async () => {
  const f = fixture(); const cycle = await f.service.create({ title: 'Ano 2026', year: 2026 }, f.members[3]);
  await f.service.open(cycle.id, f.members[3]);
  assert.deepEqual((await f.service.mine(f.members[4])).cycles, []);
  f.tabs.Participantes.push({ tipo: 'MINISTERIO', referencia_id: 'm1', membro_id: '4', ativo: 'TRUE' });
  assert.deepEqual((await f.service.mine(f.members[4])).cycles[0].targets.map(t => t.id), ['MISSION:2', 'MINISTRY:m1:1']);
});

test('only central leadership manages and reads identified answers', async () => {
  const f = fixture(); const c = await f.service.create({ title: 'Ano 2026', year: 2026 }, f.members[3]);
  for (const i of [0, 1, 4]) {
    for (const op of [() => f.service.list(f.members[i]), () => f.service.results(c.id, f.members[i]), () => f.service.open(c.id, f.members[i]), () => f.service.close(c.id, f.members[i]), () => f.service.create({ title: 'Novo', year: 2026 }, f.members[i])]) await assert.rejects(op, e => e.getStatus() === 403);
  }
  await f.service.open(c.id, f.members[2]);
  await f.service.answer(c.id, { ...f.dto, respondentId: 'forged' }, f.members[0]);
  for (const i of [2, 3]) { const results = await f.service.results(c.id, f.members[i]); assert.equal(results.answers[0].respondentId, '0'); assert.equal(results.answers[0].respondent, 'Pessoa 0'); }
  const personal = await f.service.mine(f.members[1]);
  assert.ok(!JSON.stringify(personal).includes('Escuta'));
  assert.ok(!JSON.stringify(personal).includes('Pessoa 0'));
});

test('draft, closed, duplicate, forged target and inactive answers blocked', async () => {
  const f = fixture(); const c = await f.service.create({ title: 'Ano 2026', year: 2026 }, f.members[3]);
  await assert.rejects(() => f.service.answer(c.id, f.dto, f.members[0]), e => e.getStatus() === 409);
  await f.service.open(c.id, f.members[3]);
  await assert.rejects(() => f.service.answer(c.id, { ...f.dto, targetId: 'MINISTRY:m1:1' }, f.members[4]), e => e.getStatus() === 403);
  await assert.rejects(() => f.service.answer(c.id, { ...f.dto, targetId: 'SELF:2' }, f.members[2]), e => e.getStatus() === 400);
  const parallel = await Promise.allSettled([f.service.answer(c.id, f.dto, f.members[0]), f.service.answer(c.id, f.dto, f.members[0])]);
  assert.equal(parallel.filter(r => r.status === 'fulfilled').length, 1);
  f.members[4].active = false;
  await assert.rejects(() => f.service.answer(c.id, f.dto, f.members[4]), e => e.getStatus() === 403);
  await f.service.close(c.id, f.members[2]);
  await assert.rejects(() => f.service.answer(c.id, f.dto, f.members[1]), e => e.getStatus() === 409);
});

test('scores are validated and evaluations never enter general audit', async () => {
  assert.ok((await validate(Object.assign(new AnswerEvaluationDto(), { targetId: 'x', scores: [0, 6, 1.5, 4], strengths: '', improvements: '', reflection: '' }))).length);
  let audits = 0;
  const audit = new AuditInterceptor({ record: async () => { audits++; } });
  await audit.capture({ body: { reflection: 'Private' } }, 'POST', '/api/evaluations/abc/answers', { success: true });
  assert.equal(audits, 0);
});
