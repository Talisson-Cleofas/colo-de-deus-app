import { Injectable } from '@nestjs/common';

type Metric = { count: number; totalMs: number; maxMs: number; lastMs: number };

@Injectable()
export class PerformanceMetricsService {
  private readonly metrics = new Map<string, Metric>();

  record(name: string, durationMs: number): void {
    const current = this.metrics.get(name) ?? { count: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
    current.count += 1;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    current.lastMs = durationMs;
    this.metrics.set(name, current);
  }

  snapshot() {
    return Object.fromEntries([...this.metrics.entries()].map(([name, metric]) => [name, {
      count: metric.count,
      averageMs: Number((metric.totalMs / metric.count).toFixed(2)),
      maxMs: Number(metric.maxMs.toFixed(2)),
      lastMs: Number(metric.lastMs.toFixed(2)),
    }]));
  }
}
