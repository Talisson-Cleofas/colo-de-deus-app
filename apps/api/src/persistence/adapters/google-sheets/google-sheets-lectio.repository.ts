import { Injectable } from '@nestjs/common';
import type { ILectioRepository } from '../../interfaces/lectio-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsLectioRepository extends GoogleSheetsBaseRepository implements ILectioRepository {}
