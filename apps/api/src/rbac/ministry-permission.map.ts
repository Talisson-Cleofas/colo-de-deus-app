import { Permission } from './enums/permission.enum';

export type MinistryModuleCode = 'CELULAS' | 'EVENTOS' | 'CENACULO' | 'FINANCAS' | 'COMUNICACAO';

export const MINISTRY_PERMISSION_MAP: Record<MinistryModuleCode, Permission[]> = {
  CELULAS: [
    Permission.CELLS_READ,
    Permission.CELLS_CREATE,
    Permission.CELLS_UPDATE,
    Permission.CELLS_DELETE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_CREATE,
  ],
  EVENTOS: [
    Permission.EVENTS_READ,
    Permission.EVENTS_CREATE,
    Permission.EVENTS_UPDATE,
    Permission.EVENTS_DELETE,
  ],
  CENACULO: [
    Permission.CENACLES_READ,
    Permission.CENACLES_CREATE,
    Permission.CENACLES_UPDATE,
    Permission.CENACLES_DELETE,
  ],
  FINANCAS: [
    Permission.SOMA_READ,
    Permission.SOMA_WRITE,
    Permission.FINANCIAL_REPORT_READ,
  ],
  COMUNICACAO: [
    Permission.NOTIFICATIONS_READ,
    Permission.NOTIFICATIONS_CREATE,
    Permission.NOTIFICATIONS_SEND,
  ],
};

const aliases: Record<string, MinistryModuleCode> = {
  CELULA: 'CELULAS', CELULAS: 'CELULAS', CELL: 'CELULAS', CELLS: 'CELULAS',
  EVENTO: 'EVENTOS', EVENTOS: 'EVENTOS', EVENT: 'EVENTOS', EVENTS: 'EVENTOS',
  CENACULO: 'CENACULO', CENACULOS: 'CENACULO', CENACLE: 'CENACULO', CENACLES: 'CENACULO',
  FINANCA: 'FINANCAS', FINANCAS: 'FINANCAS', FINANCEIRO: 'FINANCAS', SOMA: 'FINANCAS',
  COMUNICACAO: 'COMUNICACAO', COMMUNICATION: 'COMUNICACAO', NOTIFICACOES: 'COMUNICACAO',
};

export function normalizeMinistryModule(value: string): MinistryModuleCode | null {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return aliases[normalized] ?? null;
}
