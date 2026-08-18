import { Injectable } from '@nestjs/common';
import type { IMissionaryAgendaRepository } from '../../interfaces/missionary-agenda-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';

@Injectable()
export class GoogleSheetsMissionaryAgendaRepository
  extends GoogleSheetsBaseRepository
  implements IMissionaryAgendaRepository {}
