export type EventScope = 'GERAL' | 'MINISTERIO' | 'CELULA' | 'CENACULO';

export type MissionEvent = {
  id: string; title: string; description: string; startDate: string; endDate: string;
  startTime: string; endTime: string; location: string; address: string; category: string;
  scope: EventScope; ministryId: string; ministry: string; cellId: string; cellName: string;
  cenacleId: string; cenacleName: string; capacity: number; registrationUrl: string; image: string;
  confirmationRequired: boolean; published: boolean; featured: boolean; active: boolean;
  createdBy: string; createdAt: string; updatedAt: string; canManage?: boolean;
};

export type EventResponse = {
  id: string; eventId: string; eventTitle: string; memberId: string; memberName: string;
  memberEmail: string; memberMinistry: string; status: 'CONFIRMED' | 'JUSTIFIED';
  justification: string; recipientEmails: string[]; createdAt: string;
};
