import { Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { BirthdaysService } from '../birthdays/birthdays.service';
import { EventsService } from '../events/events.service';
import { LectioService } from '../lectio/lectio.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  DashboardBirthday,
  DashboardBirthdays,
  DashboardEvent,
  DashboardLectio,
  DashboardNotificationSummary,
  DashboardSection,
  MemberDashboardResponse,
} from './member-dashboard.types';

@Injectable()
export class MemberDashboardService {
  private readonly logger = new Logger(MemberDashboardService.name);

  constructor(
    private readonly lectio: LectioService,
    private readonly notifications: NotificationsService,
    private readonly birthdays: BirthdaysService,
    private readonly events: EventsService,
  ) {}

  private now(): string {
    return new Date().toISOString();
  }

  private async section<T>(
    name: string,
    loader: () => Promise<T>,
    empty: (value: T) => boolean,
    fallback: T,
  ): Promise<DashboardSection<T>> {
    try {
      const data = await loader();
      return {
        status: empty(data) ? 'EMPTY' : 'SUCCESS',
        data,
        updatedAt: this.now(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar esta seção.';
      this.logger.warn(`Falha ao carregar a seção ${name}: ${message}`);
      return {
        status: 'ERROR',
        data: fallback,
        error: message,
        updatedAt: this.now(),
      };
    }
  }

  private excerpt(value: string, limit = 210): string {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, limit).replace(/\s+\S*$/, '')}…`;
  }

  private todayInBrasilia(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  async member(user: AuthenticatedUser): Promise<MemberDashboardResponse> {
    const today = this.todayInBrasilia();

    const [lectio, notifications, birthdays, events] = await Promise.all([
      this.section<DashboardLectio | null>(
        'lectio',
        async () => {
          const todayItem = await this.lectio.today(today);
          const list = todayItem ? [] : await this.lectio.list();
          const item = todayItem ?? list[0] ?? null;

          if (!item) return null;

          return {
            id: String(item.id ?? ''),
            date: String(item.date ?? ''),
            title: String(item.title ?? ''),
            celebration: String(item.celebration ?? ''),
            gospelReference: String(item.gospelReference ?? ''),
            gospelTitle: String(item.gospelTitle ?? ''),
            excerpt: this.excerpt(String(item.gospelText || item.firstReadingText || '')),
            status: String(item.status ?? ''),
            source: String(item.source ?? ''),
            available: Boolean(item.firstReadingText || item.psalmText || item.gospelText),
            isToday: String(item.date ?? '') === today,
            updatedAt: String(item.updatedAt ?? this.now()),
          };
        },
        (value) => value === null,
        null,
      ),
      this.section<DashboardNotificationSummary>(
        'notifications',
        async () => {
          const result = await this.notifications.list(user);
          const items = Array.isArray(result?.items) ? result.items : [];
          return {
            unreadCount: Number.isFinite(result?.unreadCount) ? Math.max(0, result.unreadCount) : 0,
            recent: items.slice(0, 5),
          };
        },
        (value) => value.unreadCount === 0 && value.recent.length === 0,
        { unreadCount: 0, recent: [] },
      ),
      this.section<DashboardBirthdays>(
        'birthdays',
        async () => {
          const raw = await this.birthdays.dashboard();
          const value = raw as Partial<DashboardBirthdays> | null | undefined;
          const normalize = (items: unknown): DashboardBirthday[] =>
            Array.isArray(items) ? (items as DashboardBirthday[]) : [];

          return {
            enabled: value?.enabled ?? true,
            today: normalize(value?.today),
            week: normalize(value?.week),
            month: normalize(value?.month),
            monthCount: Number.isFinite(value?.monthCount) ? Math.max(0, value?.monthCount ?? 0) : 0,
          };
        },
        (value) => value.today.length === 0 && value.week.length === 0,
        { enabled: true, today: [], week: [], month: [], monthCount: 0 },
      ),
      this.section<DashboardEvent[]>(
        'events',
        async () => {
          const items = await this.events.list({}, user);
          if (!Array.isArray(items)) return [];

          return items
            .filter((event) => String(event.endDate ?? event.startDate ?? '') >= today)
            .slice(0, 4)
            .map((event) => ({
              id: String(event.id ?? ''),
              title: String(event.title ?? ''),
              startDate: String(event.startDate ?? ''),
              startTime: String(event.startTime ?? ''),
              endDate: String(event.endDate ?? ''),
              location: String(event.location ?? ''),
              category: String(event.category ?? ''),
              scope: String(event.scope ?? ''),
            }));
        },
        (value) => value.length === 0,
        [],
      ),
    ]);

    return {
      generatedAt: this.now(),
      lectio,
      notifications,
      birthdays,
      events,
    };
  }
}
