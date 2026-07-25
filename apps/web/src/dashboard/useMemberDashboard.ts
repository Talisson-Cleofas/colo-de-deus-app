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

function normalizeDashboard(value: Partial<MemberDashboard> | null | undefined): MemberDashboard {
  return {
    generatedAt: value?.generatedAt ?? now(),
    lectio: {
      status: value?.lectio?.status ?? 'EMPTY',
      data: value?.lectio?.data ?? null,
      error: value?.lectio?.error,
      updatedAt: value?.lectio?.updatedAt ?? now(),
    },
    notifications: {
      status: value?.notifications?.status ?? 'EMPTY',
      data: {
        unreadCount:
          typeof value?.notifications?.data?.unreadCount === 'number'
            ? value.notifications.data.unreadCount
            : 0,
        recent: Array.isArray(value?.notifications?.data?.recent)
          ? value.notifications.data.recent
          : [],
      },
      error: value?.notifications?.error,
      updatedAt: value?.notifications?.updatedAt ?? now(),
    },
    birthdays: {
      status: value?.birthdays?.status ?? 'EMPTY',
      data: {
        enabled: value?.birthdays?.data?.enabled ?? true,
        today: Array.isArray(value?.birthdays?.data?.today)
          ? value.birthdays.data.today
          : [],
        week: Array.isArray(value?.birthdays?.data?.week)
          ? value.birthdays.data.week
          : [],
        month: Array.isArray(value?.birthdays?.data?.month)
          ? value.birthdays.data.month
          : [],
        monthCount:
          typeof value?.birthdays?.data?.monthCount === 'number'
            ? value.birthdays.data.monthCount
            : 0,
      },
      error: value?.birthdays?.error,
      updatedAt: value?.birthdays?.updatedAt ?? now(),
    },
    events: {
      status: value?.events?.status ?? 'EMPTY',
      data: Array.isArray(value?.events?.data) ? value.events.data : [],
      error: value?.events?.error,
      updatedAt: value?.events?.updatedAt ?? now(),
    },
  };
}

export function useMemberDashboard() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<Partial<MemberDashboard>>('/dashboard');
      return normalizeDashboard(response.data);
    },
    staleTime: 30_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? apiErrorMessage(query.error) : '',
    reload: query.refetch,
  };
}
