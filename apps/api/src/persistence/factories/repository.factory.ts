import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUDIT_REPOSITORY, type IAuditRepository } from '../interfaces/audit-repository.interface';
import { CELL_REPOSITORY, type ICellRepository } from '../interfaces/cell-repository.interface';
import { EVENT_REPOSITORY, type IEventRepository } from '../interfaces/event-repository.interface';
import { LECTIO_REPOSITORY, type ILectioRepository } from '../interfaces/lectio-repository.interface';
import { MEMBER_REPOSITORY, type IMemberRepository } from '../interfaces/member-repository.interface';
import { MINISTRY_REPOSITORY, type IMinistryRepository } from '../interfaces/ministry-repository.interface';
import { NOTIFICATION_REPOSITORY, type INotificationRepository } from '../interfaces/notification-repository.interface';
import { SOMA_REPOSITORY, type ISomaRepository } from '../interfaces/soma-repository.interface';
import type { PersistenceProvider } from '../types/persistence-provider';

@Injectable()
export class RepositoryFactory {
  readonly provider: PersistenceProvider;

  constructor(
    config: ConfigService,
    @Inject(MEMBER_REPOSITORY) readonly members: IMemberRepository,
    @Inject(EVENT_REPOSITORY) readonly events: IEventRepository,
    @Inject(CELL_REPOSITORY) readonly cells: ICellRepository,
    @Inject(MINISTRY_REPOSITORY) readonly ministries: IMinistryRepository,
    @Inject(LECTIO_REPOSITORY) readonly lectio: ILectioRepository,
    @Inject(NOTIFICATION_REPOSITORY) readonly notifications: INotificationRepository,
    @Inject(SOMA_REPOSITORY) readonly soma: ISomaRepository,
    @Inject(AUDIT_REPOSITORY) readonly audit: IAuditRepository,
  ) {
    this.provider = config.get<PersistenceProvider>('DATABASE_PROVIDER', 'google-sheets');
  }
}
