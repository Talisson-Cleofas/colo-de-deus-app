import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { BirthdaysService } from '../birthdays/birthdays.service';
import { EventsService } from '../events/events.service';
import { LectioService } from '../lectio/lectio.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { DashboardSection, MemberDashboardResponse } from './member-dashboard.types';

@Injectable()
export class MemberDashboardService {
  constructor(
    private readonly lectio: LectioService,
    private readonly notifications: NotificationsService,
    private readonly birthdays: BirthdaysService,
    private readonly events: EventsService,
  ) {}

  private now() { return new Date().toISOString(); }

  private async section<T>(loader: () => Promise<T>, empty: (value: T) => boolean, fallback: T): Promise<DashboardSection<T>> {
    try {
      const data = await loader();
      return { status: empty(data) ? 'EMPTY' : 'SUCCESS', data, updatedAt: this.now() };
    } catch (error) {
      return {
        status: 'ERROR',
        data: fallback,
        error: error instanceof Error ? error.message : 'Não foi possível carregar esta seção.',
        updatedAt: this.now(),
      };
    }
  }

  private excerpt(value: string, limit = 210) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, limit).replace(/\s+\S*$/, '')}…`;
  }

  async member(user: AuthenticatedUser): Promise<MemberDashboardResponse> {
    const [lectio, notifications, birthdays, events] = await Promise.all([
      this.section(async () => {
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
        }).format(new Date());

        const todayItem = await this.lectio.today(today);
        const item = todayItem ?? (await this.lectio.list())[0] ?? null;

        if (!item) return null;

        return {
          id: item.id,
          date: item.date,
          title: item.title,
          celebration: item.celebration,
          gospelReference: item.gospelReference,
          gospelTitle: item.gospelTitle,
          excerpt: this.excerpt(item.gospelText || item.firstReadingText),
          status: item.status,
          source: item.source,
          available: Boolean(item.firstReadingText && item.psalmText && item.gospelText),
          isToday: item.date === today,
          updatedAt: item.updatedAt,
        };
      }, (value) => value === null, null),
      this.section(async () => {
        const result = await this.notifications.list(user);
        return { unreadCount: result.unreadCount, recent: result.items.slice(0, 5) };
      }, (value) => value.unreadCount === 0 && value.recent.length === 0, { unreadCount: 0, recent: [] }),
      this.section(() => this.birthdays.dashboard(), (value) => {
        const typed = value as { today?: unknown[]; week?: unknown[] };
        return !(typed.today?.length || typed.week?.length);
      }, { enabled: true, today: [], week: [], month: [], monthCount: 0 }),
      this.section(async () => {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
        const items = await this.events.list({}, user);
        return items.filter((event) => event.endDate >= today).slice(0, 4);
      }, (value) => value.length === 0, []),
    ]);

    return { generatedAt: this.now(), lectio, notifications, birthdays, events };
  }
}
