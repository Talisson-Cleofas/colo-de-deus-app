import { Injectable } from '@nestjs/common';
import type { ICellRepository } from '../../interfaces/cell-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsCellRepository extends GoogleSheetsBaseRepository implements ICellRepository {}
