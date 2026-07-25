import { Injectable } from '@nestjs/common';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsReceiptRepository extends GoogleSheetsBaseRepository {}
