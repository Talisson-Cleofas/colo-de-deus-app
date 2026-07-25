export type DashboardSection<T> = {
  status: 'SUCCESS' | 'EMPTY' | 'ERROR';
  data: T;
  error?: string;
  updatedAt: string;
};

export type MemberDashboardResponse = {
  generatedAt: string;
  lectio: DashboardSection<Record<string, unknown> | null>;
  notifications: DashboardSection<{ unreadCount: number; recent: unknown[] }>;
  birthdays: DashboardSection<Record<string, unknown>>;
  events: DashboardSection<unknown[]>;
};
