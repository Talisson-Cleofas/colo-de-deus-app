type Environment = Record<string, unknown>;

function text(environment: Environment, key: string): string {
  const value = environment[key];
  return typeof value === 'string' ? value.trim() : '';
}

function requireValue(environment: Environment, key: string): void {
  if (!text(environment, key)) throw new Error(`Variável obrigatória ausente: ${key}`);
}

export function validateEnvironment(environment: Environment): Environment {
  environment.NODE_ENV ??= 'development';
  environment.API_PORT ??= '4000';
  environment.WEB_URL ??= 'http://localhost:5173';
  environment.DEMO_MODE ??= 'true';
  environment.DATABASE_PROVIDER ??= 'google-sheets';

  const databaseProvider = text(environment, 'DATABASE_PROVIDER');
  if (!['google-sheets', 'postgres', 'mongodb'].includes(databaseProvider)) {
    throw new Error('DATABASE_PROVIDER deve ser google-sheets, postgres ou mongodb.');
  }

  const demoMode = text(environment, 'DEMO_MODE').toLowerCase() !== 'false';
  const port = Number(text(environment, 'API_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT deve ser uma porta válida entre 1 e 65535.');
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
  }

  return environment;
}
