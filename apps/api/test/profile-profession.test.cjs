const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleSheetsService } = require('../dist/google/google-sheets.service');
const { MembersController } = require('../dist/members/members.controller');
const { SHEET_SCHEMAS } = require('../dist/google/sheet-schemas');

test('profession is persisted, preserved when omitted and can be cleared', async () => {
  const service = Object.create(GoogleSheetsService.prototype);
  let member = { id: 'member-test', email: 'member@example.com', profession: '', gifts: ['Música'] };
  let saved;
  service.listMembers = async () => [member];
  service.isDemo = () => false;
  service.updateRecord = async (_tab, _key, _id, row) => { saved = row; };
  service.membersByEmail = new Map();
  service.membersById = new Map();
  member = await service.updateMember(member.id, { profession: '  Professor  ' });
  assert.equal(member.profession, 'Professor');
  assert.equal(saved.profissao, 'Professor');
  assert.equal(saved.dons, 'Música');
  member = await service.updateMember(member.id, { phone: '00000000' });
  assert.equal(saved.profissao, 'Professor');
  await service.updateMember(member.id, { profession: '' });
  assert.equal(saved.profissao, '');
  assert.ok(SHEET_SCHEMAS.Membros.includes('profissao'));
});

test('own profile accepts profession without forwarding administrative fields', async () => {
  const controller = Object.create(MembersController.prototype);
  let saved;
  controller.sheets = {
    listMembers: async () => [{ id: 'member-test', email: 'member@example.com' }],
    updateMember: async (_id, dto) => { saved = dto; return dto; },
  };
  await controller.updateMyProfile(
    { profession: 'Professor', vocationalYear: 'DISCIPULO', profile: 'DEVELOPER' },
    { memberId: 'member-test', email: 'member@example.com' },
  );
  assert.equal(saved.profession, 'Professor');
  assert.equal(saved.vocationalYear, 'DISCIPULO');
  assert.equal(saved.profile, undefined);
});

test('vocational year is persisted in the member sheet', async () => {
  const service = Object.create(GoogleSheetsService.prototype);
  const member = { id: 'member-test', email: 'member@example.com', vocationalYear: '', gifts: [] };
  let saved;
  service.listMembers = async () => [member];
  service.isDemo = () => false;
  service.updateRecord = async (_tab, _key, _id, row) => { saved = row; };
  service.membersByEmail = new Map();
  service.membersById = new Map();
  const updated = await service.updateMember(member.id, { vocationalYear: 'POSTULANTE' });
  assert.equal(updated.vocationalYear, 'POSTULANTE');
  assert.equal(saved.ano_vocacional, 'POSTULANTE');
  assert.ok(SHEET_SCHEMAS.Membros.includes('ano_vocacional'));
});
