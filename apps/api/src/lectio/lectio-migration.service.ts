import { Inject, Injectable } from '@nestjs/common';
import { LECTIO_REPOSITORY, type ILectioRepository } from '../persistence/interfaces/lectio-repository.interface';

@Injectable()
export class LectioMigrationService {
  private migrated = false;
  constructor(@Inject(LECTIO_REPOSITORY) private readonly sheets: ILectioRepository) {}

  async ensureCurrentSchema(): Promise<boolean> {
    if (this.migrated || this.sheets.isDemo()) return false;
    const changed = await this.sheets.migrateTabSchema('Lectio', { aclamacao: 'aclamacao_texto' });
    this.migrated = true;
    return changed;
  }
}
