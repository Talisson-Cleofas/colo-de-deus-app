export type LectioStatus = 'SINCRONIZADA' | 'FONTE_ALTERNATIVA' | 'REVISADA' | 'MANUAL' | 'ERRO';
export type LectioSource = 'CNBB' | 'CANCAO_NOVA';

export type LectioEntry = {
  id: string;
  date: string;
  title: string;
  celebration: string;
  liturgicalTime: string;
  liturgicalColor: string;
  firstReadingReference: string;
  firstReadingTitle: string;
  firstReadingText: string;
  psalmReference: string;
  psalmResponse: string;
  psalmText: string;
  secondReadingReference: string;
  secondReadingTitle: string;
  secondReadingText: string;
  acclamationReference: string;
  acclamationText: string;
  gospelReference: string;
  gospelTitle: string;
  gospelText: string;
  entranceAntiphon: string;
  communionAntiphon: string;
  reflection: string;
  prayer: string;
  source: LectioSource | 'MANUAL';
  status: LectioStatus;
  protected: boolean;
  syncedAt: string;
  updatedAt: string;
  active: boolean;
};

export type LectioSyncLog = {
  id: string;
  liturgyDate: string;
  primarySource: LectioSource;
  usedSource: LectioSource | '';
  status: 'SUCESSO' | 'ERRO' | 'LIMPEZA';
  attempts: number;
  created: number;
  updated: number;
  removed: number;
  protected: number;
  error: string;
  startedAt: string;
  finishedAt: string;
};

export type LectioSettings = {
  primarySource: LectioSource;
  fallbackSource: LectioSource;
  cnbbEnabled: boolean;
  cancaoNovaEnabled: boolean;
  retentionDays: number;
  deleteOldRecords: boolean;
};


export type LectioProviderAttempt = { source: LectioSource; priority: number; status: 'SUCESSO' | 'ERRO' | 'DESATIVADA'; startedAt: string; finishedAt: string; durationMs: number; fromCache: boolean; error: string };

export type LectioSyncResult = {
  status: 'CRIADA' | 'ATUALIZADA' | 'SEM_ALTERACOES' | 'PRESERVADA' | 'ERRO';
  date: string;
  source: LectioSource;
  primarySource: LectioSource;
  fallbackUsed: boolean;
  attempts: number;
  providerErrors: Partial<Record<LectioSource, string>>;
  providerAttempts: LectioProviderAttempt[];
  changed: boolean;
  message: string;
  startedAt: string;
  finishedAt: string;
  entry: LectioEntry | null;
};
