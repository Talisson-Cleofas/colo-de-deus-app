import { Injectable } from '@nestjs/common';
import type { IEventRepository } from '../../interfaces/event-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsEventRepository extends GoogleSheetsBaseRepository implements IEventRepository {}
