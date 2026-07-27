export type DashboardStatus = 'SUCCESS' | 'EMPTY' | 'ERROR';

export type DashboardSection<T> = {
  status: DashboardStatus;
  data: T;
  error?: string;
  updatedAt: string;
};

export type DashboardLectio = {
  id: string;
  date: string;
  title: string;
  celebration: string;
  gospelReference: string;
  gospelTitle: string;
  excerpt: string;
  status: string;
  source: string;
  available: boolean;
  isToday: boolean;
  updatedAt: string;
};

export type DashboardNotificationSummary = {
  unreadCount: number;
  recent: unknown[];
};

export type DashboardBirthday = {
  id: string;
  name: string;
  photo: string;
  day: number;
  month: number;
  isToday: boolean;
  daysUntil: number;
};

export type DashboardBirthdays = {
  enabled: boolean;
  today: DashboardBirthday[];
  week: DashboardBirthday[];
  month: DashboardBirthday[];
  monthCount: number;
};

export type DashboardEvent = {
  id: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  location: string;
  category: string;
  scope: string;
};

export type MemberDashboardResponse = {
  generatedAt: string;
  lectio: DashboardSection<DashboardLectio | null>;
  notifications: DashboardSection<DashboardNotificationSummary>;
  birthdays: DashboardSection<DashboardBirthdays>;
  events: DashboardSection<DashboardEvent[]>;
};
