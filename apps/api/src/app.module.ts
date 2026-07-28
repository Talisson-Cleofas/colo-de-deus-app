import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RbacModule } from './rbac/rbac.module';
import { PermissionsGuard } from './rbac/guards/permissions.guard';
import { MinistryScopeGuard } from './rbac/guards/ministry-scope.guard';
import { CellLeaderGuard } from './rbac/guards/cell-leader.guard';
import { MinistryModuleGuard } from './rbac/guards/ministry-module.guard';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CommunitiesModule } from './communities/communities.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { GoogleMapsModule } from './google-maps/google-maps.module';
import { FilesModule } from './files/files.module';
import { EventsModule } from './events/events.module';
import { GoogleModule } from './google/google.module';
import { HealthController } from './health/health.controller';
import { LectioModule } from './lectio/lectio.module';
import { MembersModule } from './members/members.module';
import { MinistriesModule } from './ministries/ministries.module';
import { MissionsModule } from './missions/missions.module';
import { ReportsModule } from './reports/reports.module';
import { SomaModule } from './soma/soma.module';
import { validateEnvironment } from './config/env.validation';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { TechnicalAdminModule } from './technical-admin/technical-admin.module';
import { BirthdaysModule } from './birthdays/birthdays.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MemberDashboardModule } from './member-dashboard/member-dashboard.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { SheetsMigrationModule } from './sheets-migration/sheets-migration.module';
import { PerformanceModule } from './performance/performance.module';
import { PerformanceInterceptor } from './performance/performance.interceptor';
import { PersistenceModule } from './persistence/persistence.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PerformanceModule,
    GoogleModule,
    PersistenceModule,
    RbacModule,
    AuthModule,
    AdminModule,
    MembersModule,
    MissionsModule,
    MinistriesModule,
    CommunitiesModule,
    IntegrationsModule,
    LectioModule,
    EventsModule,
    SomaModule,
    FilesModule,
    GoogleDriveModule,
    GoogleMapsModule,
    ReportsModule,
    NotificationsModule,
    SettingsModule,
    TechnicalAdminModule,
    BirthdaysModule,
    MemberDashboardModule,
    SheetsMigrationModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: MinistryScopeGuard },
    { provide: APP_GUARD, useClass: MinistryModuleGuard },
    { provide: APP_GUARD, useClass: CellLeaderGuard },
    { provide: APP_INTERCEPTOR, useClass: PerformanceInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
