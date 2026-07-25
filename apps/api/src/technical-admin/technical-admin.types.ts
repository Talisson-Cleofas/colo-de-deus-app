export type IntegrationKey = 'GOOGLE_SHEETS' | 'GOOGLE_DRIVE' | 'FIREBASE' | 'GOOGLE_MAPS' | 'MERCADO_PAGO';
export type IntegrationStatus = {
  key: IntegrationKey;
  name: string;
  configured: boolean;
  connected: boolean | null;
  message: string;
  lastCheckedAt: string;
};
export type PermissionRecord = {
  id: string; profileCode: string; resource: string; action: string; allowed: boolean; scope: string;
  createdAt: string; updatedAt: string;
};
