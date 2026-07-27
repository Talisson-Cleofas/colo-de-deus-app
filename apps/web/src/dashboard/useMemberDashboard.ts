import { useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../services/api';

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

export type DashboardBirthday = {
  id: string;
  name: string;
  photo: string;
  day: number;
  month: number;
  isToday: boolean;
  daysUntil: number;
};

type Section<T> = {
  status: 'SUCCESS' | 'EMPTY' | 'ERROR';
  data: T;
  error?: string;
  updatedAt: string;
};

export type MemberDashboard = {
  generatedAt: string;
  lectio: Section<DashboardLectio | null>;
  notifications: Section<{ unreadCount: number; recent: unknown[] }>;
  birthdays: Section<{
    enabled: boolean;
    today: DashboardBirthday[];
    week: DashboardBirthday[];
    month: DashboardBirthday[];
    monthCount: number;
  }>;
  events: Section<DashboardEvent[]>;
};

const now = () => new Date().toISOString();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function sectionStatus(value: unknown): Section<unknown>['status'] {
  return value === 'SUCCESS' || value === 'ERROR' ? value : 'EMPTY';
}

function normalizeDashboard(input: unknown): MemberDashboard {
  const value = isRecord(input) ? input : {};
  const lectio = isRecord(value.lectio) ? value.lectio : {};
  const notifications = isRecord(value.notifications) ? value.notifications : {};
  const notificationData = isRecord(notifications.data) ? notifications.data : {};
  const birthdays = isRecord(value.birthdays) ? value.birthdays : {};
  const birthdayData = isRecord(birthdays.data) ? birthdays.data : {};
  const events = isRecord(value.events) ? value.events : {};

  return {
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : now(),
    lectio: {
      status: sectionStatus(lectio.status),
      data: isRecord(lectio.data) ? (lectio.data as DashboardLectio) : null,
      error: typeof lectio.error === 'string' ? lectio.error : undefined,
      updatedAt: typeof lectio.updatedAt === 'string' ? lectio.updatedAt : now(),
    },
    notifications: {
      status: sectionStatus(notifications.status),
      data: {
        unreadCount:
          typeof notificationData.unreadCount === 'number' && Number.isFinite(notificationData.unreadCount)
            ? Math.max(0, notificationData.unreadCount)
            : 0,
        recent: Array.isArray(notificationData.recent) ? notificationData.recent : [],
      },
      error: typeof notifications.error === 'string' ? notifications.error : undefined,
      updatedAt: typeof notifications.updatedAt === 'string' ? notifications.updatedAt : now(),
    },
    birthdays: {
      status: sectionStatus(birthdays.status),
      data: {
        enabled: typeof birthdayData.enabled === 'boolean' ? birthdayData.enabled : true,
        today: Array.isArray(birthdayData.today) ? (birthdayData.today as DashboardBirthday[]) : [],
        week: Array.isArray(birthdayData.week) ? (birthdayData.week as DashboardBirthday[]) : [],
        month: Array.isArray(birthdayData.month) ? (birthdayData.month as DashboardBirthday[]) : [],
        monthCount:
          typeof birthdayData.monthCount === 'number' && Number.isFinite(birthdayData.monthCount)
            ? Math.max(0, birthdayData.monthCount)
            : 0,
      },
      error: typeof birthdays.error === 'string' ? birthdays.error : undefined,
      updatedAt: typeof birthdays.updatedAt === 'string' ? birthdays.updatedAt : now(),
    },
    events: {
      status: sectionStatus(events.status),
      data: Array.isArray(events.data) ? (events.data as DashboardEvent[]) : [],
      error: typeof events.error === 'string' ? events.error : undefined,
      updatedAt: typeof events.updatedAt === 'string' ? events.updatedAt : now(),
    },
  };
}

export function useMemberDashboard() {
  const query = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: async () => {
      const response = await api.get<unknown>('/dashboard');
      return normalizeDashboard(response.data);
    },
    staleTime: 30_000,
    retry: (failureCount) => failureCount < 2,
  });

  return {
    data: query.data ?? normalizeDashboard(null),
    loading: query.isLoading,
    error: query.error ? apiErrorMessage(query.error) : '',
    reload: query.refetch,
  };
}
