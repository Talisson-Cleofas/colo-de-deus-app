import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

type Job = { key: string; run: () => Promise<void>; attempts: number };
@Injectable()
export class MercadoPagoQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MercadoPagoQueueService.name);
  private readonly queue: Job[] = [];
  private readonly queued = new Set<string>();
  private running = false;
  private stopped = false;
  enqueue(key: string, run: () => Promise<void>) {
    if (this.queued.has(key)) return false;
    this.queued.add(key);
    this.queue.push({ key, run, attempts: 0 });
    void this.drain();
    return true;
  }
  size() {
    return this.queue.length + (this.running ? 1 : 0);
  }
  onModuleDestroy() {
    this.stopped = true;
  }
  private async drain() {
    if (this.running || this.stopped) return;
    this.running = true;
    while (this.queue.length && !this.stopped) {
      const job = this.queue.shift()!;
      try {
        await job.run();
        this.queued.delete(job.key);
      } catch (error) {
        job.attempts++;
        this.logger.error(
          `Falha no job ${job.key}, tentativa ${job.attempts}`,
          error instanceof Error ? error.stack : String(error),
        );
        if (job.attempts < 3) {
          await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** job.attempts)));
          this.queue.push(job);
        } else this.queued.delete(job.key);
      }
    }
    this.running = false;
  }
}
