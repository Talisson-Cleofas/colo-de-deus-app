import { Global, Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { MemoryCacheService } from './memory-cache.service';
import { PerformanceMetricsService } from './performance-metrics.service';

@Global()
@Module({ controllers: [PerformanceController], providers: [MemoryCacheService, PerformanceMetricsService], exports: [MemoryCacheService, PerformanceMetricsService] })
export class PerformanceModule {}
