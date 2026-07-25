import { Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../interfaces/notification-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsNotificationRepository extends GoogleSheetsBaseRepository implements INotificationRepository {}
