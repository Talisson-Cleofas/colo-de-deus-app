export type ReportScopeType = 'ALL' | 'MINISTRY' | 'CELL' | 'CENACLE';
export type ReportExportFormat = 'pdf' | 'xlsx' | 'csv';

export type OperationalReportQuery = {
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
  memberId?: string;
  structureType?: ReportScopeType;
  structureId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  lowFrequencyThreshold?: number;
};

export type ReportMember = {
  id: string;
  name: string;
  email: string;
  photo: string;
  birthDate: string;
  profile: string;
  active: boolean;
  ministryNames: string[];
  cellNames: string[];
  cenacleNames: string[];
  presences: number;
  absences: number;
  justifiedAbsences: number;
  attendanceRate: number;
  eventConfirmed: number;
  eventAbsent: number;
  participationScore: number;
};
