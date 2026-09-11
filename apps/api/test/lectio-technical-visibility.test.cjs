const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const page = fs.readFileSync(path.join(root, 'web/src/pages/LectioPage.tsx'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'api/src/lectio/lectio.controller.ts'), 'utf8');

test('exibe diagnóstico e origem da Lectio somente para desenvolvedor', () => {
  assert.match(page, /const isDeveloper = user\?\.profile === 'DEVELOPER'/);
  assert.match(page, /isDeveloper&&<Card[^>]*>.*Sincronização com fallback/s);
  assert.match(page, /isDeveloper&&<Tab label="Histórico técnico"/);
  assert.match(page, /isDeveloper&&` • \$\{item\.source\}`/);
  assert.doesNotMatch(page, /isAdmin&&<Card[^>]*>.*Sincronização com fallback/s);
});

test('protege rotas de diagnóstico da Lectio exclusivamente com DEVELOPER', () => {
  for (const route of ['settings', 'sync-logs', 'providers/status', 'sync', 'sync/cnbb', 'retention/run']) {
    const escaped = route.replace('/', '\\/');
    assert.match(controller, new RegExp(`(?:Get|Post|Patch)\\('${escaped}'\\) @Roles\\('DEVELOPER'\\)`));
  }
});
