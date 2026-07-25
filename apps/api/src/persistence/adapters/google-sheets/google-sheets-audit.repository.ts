import { Injectable } from '@nestjs/common';
import type { IAuditRepository } from '../../interfaces/audit-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsAuditRepository extends GoogleSheetsBaseRepository implements IAuditRepository {}
