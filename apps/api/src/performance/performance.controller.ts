import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { Permission } from '../rbac/enums/permission.enum';
import { MemoryCacheService } from './memory-cache.service';
import { PerformanceMetricsService } from './performance-metrics.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly cache: MemoryCacheService, private readonly metricsService: PerformanceMetricsService) {}

  @Get('metrics')
  @RequirePermissions(Permission.SETTINGS_READ)
  metrics() {
    const memory = process.memoryUsage();
    return {
      uptimeSeconds: Math.round(process.uptime()),
      cache: this.cache.stats(),
      requests: this.metricsService.snapshot(),
      memory: { rssMb: Math.round(memory.rss / 1024 / 1024), heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024) },
      generatedAt: new Date().toISOString(),
    };
  }
}
