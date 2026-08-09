import { readFile } from 'node:fs/promises';

const API_REQUIRED_KEYS = [
  'NODE_ENV',
  'API_PORT',
  'WEB_URL',
  'DEMO_MODE',
  'DATABASE_PROVIDER',
  'TRUST_PROXY',
  'SWAGGER_ENABLED',
  'THROTTLE_TTL_MS',
  'THROTTLE_LIMIT',
  'MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS',
  'MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS',
  'MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS',
  'MERCADO_PAGO_API_TIMEOUT_MS',
];

const API_REAL_KEYS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SHEETS_ID',
];

const WEB_REQUIRED_KEYS = ['VITE_API_URL', 'VITE_DEMO_MODE'];
const WEB_REAL_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

async function parse(path) {
  let source;
  try {
    source = await readFile(path, 'utf8');
  } catch {
    throw new Error(`Arquivo não encontrado: ${path}`);
  }

  const values = {};
  const duplicates = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    if (Object.hasOwn(values, key)) duplicates.push(key);
    values[key] = line.slice(index + 1).trim();
  }
  if (duplicates.length) {
    throw new Error(`Chaves duplicadas em ${path}: ${[...new Set(duplicates)].join(', ')}`);
  }
  return values;
}

function requireKeys(values, keys, path, requireValues) {
  const missing = keys.filter((key) => !(key in values) || (requireValues && !values[key]));
  if (missing.length) throw new Error(`Variáveis ausentes em ${path}: ${missing.join(', ')}`);
}

function requireHttps(values, key, path) {
  let url;
  try {
    url = new URL(values[key]);
  } catch {
    throw new Error(`${key} deve conter uma URL válida em ${path}.`);
  }
  if (url.protocol !== 'https:') throw new Error(`${key} deve usar HTTPS em ${path}.`);
}

function validatePair(api, web, apiPath, webPath, allowEmptyRealValues = false) {
  requireKeys(api, API_REQUIRED_KEYS, apiPath, true);
  requireKeys(web, WEB_REQUIRED_KEYS, webPath, true);

  const apiDemo = api.DEMO_MODE === 'true';
  const webDemo = web.VITE_DEMO_MODE === 'true';
  if (apiDemo !== webDemo) {
    throw new Error('DEMO_MODE e VITE_DEMO_MODE precisam possuir o mesmo valor.');
  }

  if (api.NODE_ENV === 'production' && apiDemo) {
    throw new Error('DEMO_MODE=true é proibido em produção.');
  }
  if (!apiDemo) {
    requireKeys(api, API_REAL_KEYS, apiPath, !allowEmptyRealValues);
    requireKeys(web, WEB_REAL_KEYS, webPath, !allowEmptyRealValues);
  }
  if (!apiDemo && api.MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS !== 'false') {
    throw new Error('Webhooks sem assinatura são proibidos fora do modo demo.');
  }
  if (api.NODE_ENV === 'production' && !allowEmptyRealValues) {
    requireHttps(api, 'WEB_URL', apiPath);
    requireHttps(web, 'VITE_API_URL', webPath);
    if (api.MERCADO_PAGO_ACCESS_TOKEN) {
      requireKeys(
        api,
        ['MERCADO_PAGO_WEBHOOK_SECRET', 'PUBLIC_API_URL', 'FRONTEND_URL'],
        apiPath,
        true,
      );
      requireHttps(api, 'PUBLIC_API_URL', apiPath);
      requireHttps(api, 'FRONTEND_URL', apiPath);
    }
  }
  return apiDemo ? 'demo' : 'real';
}

async function main() {
  if (process.argv.includes('--examples')) {
    const realApiPath = 'apps/api/.env.example';
    const realWebPath = 'apps/web/.env.example';
    const demoApiPath = 'apps/api/demo.env.example';
    const demoWebPath = 'apps/web/demo.env.example';
    validatePair(
      await parse(realApiPath),
      await parse(realWebPath),
      realApiPath,
      realWebPath,
      true,
    );
    validatePair(await parse(demoApiPath), await parse(demoWebPath), demoApiPath, demoWebPath);
    console.log('Templates de ambiente válidos (real e demo).');
    return;
  }

  const apiPath = 'apps/api/.env';
  const webPath = 'apps/web/.env';
  const mode = validatePair(await parse(apiPath), await parse(webPath), apiPath, webPath);
  console.log(`Ambiente válido (${mode}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
