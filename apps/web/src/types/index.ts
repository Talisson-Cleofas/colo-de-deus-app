export type AccessProfile = 'DEVELOPER' | 'MISSION_LEADER' | 'ADMIN' | 'MINISTRY_LEADER' | 'CELL_LEADER' | 'MEMBER';

export type Member = {
  id:string; name:string; email:string; photo:string; role:string; ministry:string; cell:string; phone:string;
  profile:AccessProfile; active:boolean; bio:string; instagram:string; birthDate:string; joinedAt:string;
  city:string; state:string; gifts:string[]; formator:string;
};
export type AuthUser = Member & { uid?: string; memberId?: string };
export type MemberFacets={ministries:string[];cells:string[];roles:string[]};
export type Mission={id:string;name:string;acronym:string;description:string;city:string;state:string;country:string;responsibleId:string;active:boolean;createdAt:string;updatedAt:string;ministriesCount:number};
export type Ministry={id:string;missionId:string;name:string;description:string;leaderId:string;leaderEmail:string;leaderName:string;viceLeaderId:string;viceLeaderEmail:string;viceLeaderName:string;color:string;icon:string;type:string;order:number;createdAt:string;updatedAt:string;active:boolean;notes:string;membersCount:number};
export type MinistryMember={participantId:string;memberId:string;name:string;email:string;photo:string;role:string;profile:string;function:string;joinedAt:string;active:boolean};
export type MinistryAttendance={id:string;memberId:string;memberName:string;date:string;present:boolean;justification:string;registeredBy:string;origin:string;createdAt:string;updatedAt:string};

export type LectioStatus = 'SINCRONIZADA' | 'FONTE_ALTERNATIVA' | 'REVISADA' | 'MANUAL' | 'ERRO';
export type LectioSource = 'CNBB' | 'CANCAO_NOVA' | 'MANUAL';
export type LectioEntry = {
  id:string; date:string; title:string; celebration:string; liturgicalTime:string; liturgicalColor:string;
  firstReadingReference:string; firstReadingTitle:string; firstReadingText:string; psalmReference:string; psalmResponse:string; psalmText:string;
  secondReadingReference:string; secondReadingTitle:string; secondReadingText:string; acclamationReference:string; acclamationText:string; gospelReference:string; gospelTitle:string; gospelText:string;
  entranceAntiphon:string; communionAntiphon:string; reflection:string; prayer:string; source:LectioSource;
  status:LectioStatus; protected:boolean; syncedAt:string; updatedAt:string; active:boolean;
};
export type LectioSettings = {
  primarySource:'CNBB'|'CANCAO_NOVA'; fallbackSource:'CNBB'|'CANCAO_NOVA'; cnbbEnabled:boolean;
  cancaoNovaEnabled:boolean; retentionDays:number; deleteOldRecords:boolean;
};

export type LectioProviderAttempt = { source:'CNBB'|'CANCAO_NOVA'; priority:number; status:'SUCESSO'|'ERRO'|'DESATIVADA'; startedAt:string; finishedAt:string; durationMs:number; fromCache:boolean; error:string };

export type LectioSyncResult = {
  status:'CRIADA'|'ATUALIZADA'|'SEM_ALTERACOES'|'PRESERVADA'|'ERRO'; date:string; source:'CNBB'|'CANCAO_NOVA';
  primarySource:'CNBB'|'CANCAO_NOVA'; fallbackUsed:boolean; attempts:number; providerErrors:Partial<Record<'CNBB'|'CANCAO_NOVA',string>>; providerAttempts:LectioProviderAttempt[];
  changed:boolean; message:string; startedAt:string; finishedAt:string; entry:LectioEntry|null;
};


export type LectioProviderStatus = {
  source:'CNBB'|'CANCAO_NOVA'; enabled:boolean; priority:number; role:'PRINCIPAL'|'FALLBACK';
  lastStatus:string; lastSyncAt:string; lastError:string;
};

export type LectioSyncLog = {
  id:string; liturgyDate:string; primarySource:'CNBB'|'CANCAO_NOVA'; usedSource:'CNBB'|'CANCAO_NOVA'|'';
  status:'SUCESSO'|'ERRO'|'LIMPEZA'; attempts:number; created:number; updated:number; removed:number;
  protected:number; error:string; startedAt:string; finishedAt:string;
};

export type EventScope = 'GERAL' | 'MINISTERIO' | 'CELULA' | 'CENACULO';
export type MissionEvent = {
  id:string; title:string; description:string; startDate:string; endDate:string; startTime:string; endTime:string;
  location:string; address:string; category:string; scope:EventScope; ministryId:string; ministry:string; cellId:string; cellName:string;
  cenacleId:string; cenacleName:string; capacity:number; registrationUrl:string; image:string; confirmationRequired:boolean;
  published:boolean; featured:boolean; active:boolean; createdBy:string; createdAt:string; updatedAt:string; canManage?:boolean;
};

export type EventManagementOptions = {
  canCreate:boolean; canCreateGeneral:boolean; ministries:{id:string;name:string}[];
  cells:{id:string;name:string;ministryId:string}[]; cenacles:{id:string;name:string;ministryId:string;cellId:string}[];
};

export type EventResponse = {
  id:string; eventId:string; eventTitle:string; memberId:string; memberName:string; memberEmail:string;
  memberMinistry:string; status:'CONFIRMED'|'JUSTIFIED'; justification:string; recipientEmails:string[]; createdAt:string;
};

export type IntegrationConfigRecord = { id:string; module:string; key:string; value:string; type:string; description:string; active:boolean; updatedAt:string };
