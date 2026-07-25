import { Injectable } from '@nestjs/common';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsWebhookRepository extends GoogleSheetsBaseRepository {}
