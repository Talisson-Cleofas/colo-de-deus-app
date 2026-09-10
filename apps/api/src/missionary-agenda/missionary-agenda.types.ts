export const MISSIONARY_AGENDA_TYPES = [
  'EVANGELIZACAO',
  'MISSAO',
  'VISITA',
  'FORMACAO',
  'RETIRO',
  'OUTRO',
] as const;

export const MISSIONARY_AGENDA_STATUSES = [
  'RASCUNHO',
  'AGUARDANDO_APROVACAO',
  'NAO_APROVADA',
  'AGUARDANDO_INDICACOES',
  'ENVIADA_AOS_MEMBROS',
  'CONCLUIDA',
  'CANCELADA',
] as const;

export type MissionaryAgendaType = (typeof MISSIONARY_AGENDA_TYPES)[number];
export type MissionaryAgendaStatus = (typeof MISSIONARY_AGENDA_STATUSES)[number];

export type MissionaryAgenda = {
  id: string;
  missionId: string;
  title: string;
  description: string;
  type: MissionaryAgendaType;
  status: MissionaryAgendaStatus;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  responsibleId: string;
  responsibleName: string;
  ministryId: string;
  ministryName: string;
  participantLimit: number;
  meetingPoint: string;
  transport: string;
  notes: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string;
  approvedAt: string;
  approvalNotes: string;
  rejectedBy: string;
  rejectedAt: string;
  rejectionReason: string;
  membersSentBy: string;
  membersSentAt: string;
  ministrySelectionCompleted: boolean;
  intercessionSelectionCompleted: boolean;
  ministrySelectedBy: string;
  ministrySelectedAt: string;
  intercessionSelectedBy: string;
  intercessionSelectedAt: string;
  participantIds: string[];
  participantNames: string[];
  authorizedYearTwoIds: string[];
  authorizedYearTwoNames: string[];
  accompanyingIds: string[];
  accompanyingNames: string[];
  intercessorIds: string[];
  intercessorNames: string[];
  takesStoreItems: boolean;
  storeResponsibleId: string;
  storeResponsibleName: string;
  storeCardMachine: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canSelectMembers: boolean;
  canSelectIntercessors: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type MissionaryAgendaHistory = {
  id: string;
  agendaId: string;
  previousStatus: string;
  status: string;
  action: string;
  note: string;
  userId: string;
  userName: string;
  createdAt: string;
};
