import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LectioService } from './lectio.service';

@Injectable()
export class LectioAutoSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LectioAutoSyncService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly lectio: LectioService,
  ) {}

  onModuleInit(): void {
    if (!this.enabled()) {
      this.logger.log('Sincronização automática da Lectio desativada.');
      return;
    }
    this.scheduleNext();
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private enabled(): boolean {
    const value = this.config.get<string>('LECTIO_AUTO_SYNC_ENABLED', 'true');
    return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
  }

  private timeZone(): string {
    return this.config.get<string>('LECTIO_AUTO_SYNC_TIMEZONE', 'America/Sao_Paulo');
  }

  private targetTime(): { hour: number; minute: number } {
    const hour = Math.min(23, Math.max(0, Number(this.config.get<string>('LECTIO_AUTO_SYNC_HOUR', '0')) || 0));
    const minute = Math.min(59, Math.max(0, Number(this.config.get<string>('LECTIO_AUTO_SYNC_MINUTE', '10')) || 10));
    return { hour, minute };
  }

  private zonedParts(date: Date): Record<string, number> {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone(),
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    return Object.fromEntries(parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]));
  }

  private offsetMs(date: Date): number {
    const parts = this.zonedParts(date);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return asUtc - date.getTime();
  }

  private zonedDateToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
    const rough = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    return new Date(rough.getTime() - this.offsetMs(rough));
  }

  private nextExecution(now = new Date()): Date {
    const current = this.zonedParts(now);
    const target = this.targetTime();
    let next = this.zonedDateToUtc(current.year, current.month, current.day, target.hour, target.minute);
    if (next.getTime() <= now.getTime()) {
      const midday = new Date(Date.UTC(current.year, current.month - 1, current.day, 12));
      midday.setUTCDate(midday.getUTCDate() + 1);
      next = this.zonedDateToUtc(midday.getUTCFullYear(), midday.getUTCMonth() + 1, midday.getUTCDate(), target.hour, target.minute);
    }
    return next;
  }

  private scheduleNext(): void {
    if (this.timer) clearTimeout(this.timer);
    const next = this.nextExecution();
    const delay = Math.max(1_000, next.getTime() - Date.now());
    this.logger.log(`Próxima sincronização automática da Lectio: ${next.toISOString()} (${this.timeZone()}).`);
    this.timer = setTimeout(() => void this.run(), delay);
    this.timer.unref?.();
  }

  private async run(): Promise<void> {
    if (this.running) {
      this.logger.warn('Sincronização automática ignorada porque outra execução ainda está ativa.');
      this.scheduleNext();
      return;
    }
    this.running = true;
    try {
      // force=true evita que uma resposta inválida armazenada em cache seja reutilizada.
      await this.lectio.sync(undefined, true);
      this.logger.log('Lectio diária sincronizada automaticamente com sucesso.');
    } catch (error) {
      this.logger.error(`Falha na sincronização automática da Lectio: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }
}
