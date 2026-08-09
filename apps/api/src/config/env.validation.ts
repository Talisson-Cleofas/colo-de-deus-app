type Environment = Record<string, unknown>;

const TRUE_VALUES = new Set(['true', '1', 'yes', 'sim']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'nao', 'não']);

function text(environment: Environment, key: string): string {
  const value = environment[key];
  return typeof value === 'string' ? value.trim() : '';
}

function requireValue(environment: Environment, key: string): void {
  if (!text(environment, key)) throw new Error(`Variável obrigatória ausente: ${key}`);
}

function booleanValue(environment: Environment, key: string): boolean {
  const value = text(environment, key).toLowerCase();
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  throw new Error(`${key} deve ser true ou false.`);
}

function positiveInteger(environment: Environment, key: string): number {
  const value = Number(text(environment, key));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${key} deve ser um número inteiro positivo.`);
  }
  return value;
}

function requireHttpsUrl(environment: Environment, key: string): void {
  requireValue(environment, key);
  let url: URL;
  try {
    url = new URL(text(environment, key));
  } catch {
    throw new Error(`${key} deve conter uma URL válida.`);
  }
  if (url.protocol !== 'https:') throw new Error(`${key} deve usar HTTPS em produção.`);
}

export function validateEnvironment(environment: Environment): Environment {
  environment.NODE_ENV ??= 'development';
  const nodeEnvironment = text(environment, 'NODE_ENV').toLowerCase();
  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }

  environment.API_PORT ??= text(environment, 'PORT') || '4000';
  environment.DEMO_MODE ??= 'false';
  environment.DATABASE_PROVIDER ??= 'google-sheets';
  environment.WEB_URL ??= nodeEnvironment === 'production' ? '' : 'http://localhost:5173';
  environment.TRUST_PROXY ??= nodeEnvironment === 'production' ? 'true' : 'false';
  environment.SWAGGER_ENABLED ??= nodeEnvironment === 'production' ? 'false' : 'true';
  environment.THROTTLE_TTL_MS ??= '60000';
  environment.THROTTLE_LIMIT ??= '120';
  environment.MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS ??= 'false';
  environment.MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS ??= '900';
  environment.MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS ??= '5';
  environment.MERCADO_PAGO_API_TIMEOUT_MS ??= '10000';

  if (text(environment, 'DATABASE_PROVIDER') !== 'google-sheets') {
    throw new Error(
      'A Sprint 7.2 suporta somente DATABASE_PROVIDER=google-sheets. Os adapters PostgreSQL e MongoDB ainda não estão implementados.',
    );
  }

  const demoMode = booleanValue(environment, 'DEMO_MODE');
  booleanValue(environment, 'TRUST_PROXY');
  booleanValue(environment, 'SWAGGER_ENABLED');
  const allowUnsignedWebhook = booleanValue(environment, 'MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS');

  const port = Number(text(environment, 'API_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT deve ser uma porta válida entre 1 e 65535.');
  }

  positiveInteger(environment, 'THROTTLE_TTL_MS');
  positiveInteger(environment, 'THROTTLE_LIMIT');
  positiveInteger(environment, 'MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS');
  positiveInteger(environment, 'MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS');
  positiveInteger(environment, 'MERCADO_PAGO_API_TIMEOUT_MS');

  if (nodeEnvironment === 'production' && demoMode) {
    throw new Error(
      'DEMO_MODE=true é proibido em produção. Publique o ambiente demo separadamente.',
    );
  }

  if (!demoMode) {
    for (const key of [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'GOOGLE_SHEETS_ID',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
    ]) {
      requireValue(environment, key);
    }
    if (allowUnsignedWebhook) {
      throw new Error(
        'MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS deve permanecer false fora do modo demo.',
      );
    }
  }

  if (nodeEnvironment === 'production') {
    requireHttpsUrl(environment, 'WEB_URL');
    if (text(environment, 'MERCADO_PAGO_ACCESS_TOKEN')) {
      requireValue(environment, 'MERCADO_PAGO_WEBHOOK_SECRET');
      requireHttpsUrl(environment, 'PUBLIC_API_URL');
      requireHttpsUrl(environment, 'FRONTEND_URL');
    }
  }

  return environment;
}
