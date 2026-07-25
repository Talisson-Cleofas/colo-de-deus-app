import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceMetricsService } from './performance-metrics.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  constructor(private readonly metrics: PerformanceMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = performance.now();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(tap({ finalize: () => {
      const duration = Math.round((performance.now() - started) * 100) / 100;
      const route = (req.route?.path as string | undefined) ?? req.path;
      const metricName = `${req.method} ${route}`;
      this.metrics.record(metricName, duration);
      res.setHeader('Server-Timing', `app;dur=${duration}`);
      res.setHeader('X-Response-Time', `${duration}ms`);
      if (duration >= 750) this.logger.warn(`${req.method} ${req.originalUrl} ${duration}ms`);
    }}));
  }
}
