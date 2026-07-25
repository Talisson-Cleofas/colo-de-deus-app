import { Injectable } from '@nestjs/common';
import type { IMinistryRepository } from '../../interfaces/ministry-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsMinistryRepository extends GoogleSheetsBaseRepository implements IMinistryRepository {}
