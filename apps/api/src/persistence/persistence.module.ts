import { GoogleSheetsPaymentRepository } from './adapters/google-sheets/google-sheets-payment.repository';
import { GoogleSheetsWebhookRepository } from './adapters/google-sheets/google-sheets-webhook.repository';
import { GoogleSheetsFinancialReportRepository } from './adapters/google-sheets/google-sheets-financial-report.repository';
import { GoogleSheetsReceiptRepository } from './adapters/google-sheets/google-sheets-receipt.repository';
import { PAYMENT_REPOSITORY } from './interfaces/payment-repository.interface';
import { WEBHOOK_REPOSITORY } from './interfaces/webhook-repository.interface';
import { FINANCIAL_REPORT_REPOSITORY } from './interfaces/financial-report-repository.interface';
import { RECEIPT_REPOSITORY } from './interfaces/receipt-repository.interface';
import { Global, Module, type Provider, type Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleModule } from '../google/google.module';
import { GoogleSheetsAuditRepository } from './adapters/google-sheets/google-sheets-audit.repository';
import { GoogleSheetsCellRepository } from './adapters/google-sheets/google-sheets-cell.repository';
import { GoogleSheetsEventRepository } from './adapters/google-sheets/google-sheets-event.repository';
import { GoogleSheetsLectioRepository } from './adapters/google-sheets/google-sheets-lectio.repository';
import { GoogleSheetsMemberRepository } from './adapters/google-sheets/google-sheets-member.repository';
import { GoogleSheetsMinistryRepository } from './adapters/google-sheets/google-sheets-ministry.repository';
import { GoogleSheetsNotificationRepository } from './adapters/google-sheets/google-sheets-notification.repository';
import { GoogleSheetsSomaRepository } from './adapters/google-sheets/google-sheets-soma.repository';
import { RepositoryFactory } from './factories/repository.factory';
import { AUDIT_REPOSITORY } from './interfaces/audit-repository.interface';
import { CELL_REPOSITORY } from './interfaces/cell-repository.interface';
import { EVENT_REPOSITORY } from './interfaces/event-repository.interface';
import { LECTIO_REPOSITORY } from './interfaces/lectio-repository.interface';
import { MEMBER_REPOSITORY } from './interfaces/member-repository.interface';
import { MINISTRY_REPOSITORY } from './interfaces/ministry-repository.interface';
import { NOTIFICATION_REPOSITORY } from './interfaces/notification-repository.interface';
import { SOMA_REPOSITORY } from './interfaces/soma-repository.interface';
import { InMemoryUnitOfWork } from './repositories/in-memory-unit-of-work';
import { UNIT_OF_WORK } from './ports/unit-of-work.port';

function repositoryProvider(token: symbol, googleSheetsRepository: Type<unknown>): Provider {
  return {
    provide: token,
    inject: [ConfigService, googleSheetsRepository],
    useFactory: (config: ConfigService, sheetsRepository: unknown) => {
      const provider = config.get<string>('DATABASE_PROVIDER', 'google-sheets');
      if (provider !== 'google-sheets') {
        throw new Error(`DATABASE_PROVIDER=${provider} ainda não possui adapter implementado. Use google-sheets.`);
      }
      return sheetsRepository;
    },
  };
}

const adapters = [
  GoogleSheetsMemberRepository,
  GoogleSheetsEventRepository,
  GoogleSheetsCellRepository,
  GoogleSheetsMinistryRepository,
  GoogleSheetsLectioRepository,
  GoogleSheetsNotificationRepository,
  GoogleSheetsSomaRepository,
  GoogleSheetsAuditRepository,
  GoogleSheetsPaymentRepository,
  GoogleSheetsWebhookRepository,
  GoogleSheetsFinancialReportRepository,
  GoogleSheetsReceiptRepository,
];

const repositories: Provider[] = [
  repositoryProvider(MEMBER_REPOSITORY, GoogleSheetsMemberRepository),
  repositoryProvider(EVENT_REPOSITORY, GoogleSheetsEventRepository),
  repositoryProvider(CELL_REPOSITORY, GoogleSheetsCellRepository),
  repositoryProvider(MINISTRY_REPOSITORY, GoogleSheetsMinistryRepository),
  repositoryProvider(LECTIO_REPOSITORY, GoogleSheetsLectioRepository),
  repositoryProvider(NOTIFICATION_REPOSITORY, GoogleSheetsNotificationRepository),
  repositoryProvider(SOMA_REPOSITORY, GoogleSheetsSomaRepository),
  repositoryProvider(AUDIT_REPOSITORY, GoogleSheetsAuditRepository),
  repositoryProvider(PAYMENT_REPOSITORY, GoogleSheetsPaymentRepository),
  repositoryProvider(WEBHOOK_REPOSITORY, GoogleSheetsWebhookRepository),
  repositoryProvider(FINANCIAL_REPORT_REPOSITORY, GoogleSheetsFinancialReportRepository),
  repositoryProvider(RECEIPT_REPOSITORY, GoogleSheetsReceiptRepository),
  { provide: UNIT_OF_WORK, useClass: InMemoryUnitOfWork },
];

@Global()
@Module({
  imports: [GoogleModule],
  providers: [...adapters, ...repositories, RepositoryFactory],
  exports: [MEMBER_REPOSITORY, EVENT_REPOSITORY, CELL_REPOSITORY, MINISTRY_REPOSITORY, LECTIO_REPOSITORY, NOTIFICATION_REPOSITORY, SOMA_REPOSITORY, AUDIT_REPOSITORY, PAYMENT_REPOSITORY, WEBHOOK_REPOSITORY, FINANCIAL_REPORT_REPOSITORY, RECEIPT_REPOSITORY, UNIT_OF_WORK, RepositoryFactory],
})
export class PersistenceModule {}
