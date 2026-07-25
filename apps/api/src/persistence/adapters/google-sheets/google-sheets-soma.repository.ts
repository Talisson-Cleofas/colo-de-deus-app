import { Injectable } from '@nestjs/common';
import type { ISomaRepository } from '../../interfaces/soma-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsSomaRepository extends GoogleSheetsBaseRepository implements ISomaRepository {}
