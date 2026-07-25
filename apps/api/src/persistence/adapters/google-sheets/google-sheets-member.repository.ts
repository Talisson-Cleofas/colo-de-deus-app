import { Injectable } from '@nestjs/common';
import type { IMemberRepository } from '../../interfaces/member-repository.interface';
import { GoogleSheetsBaseRepository } from './google-sheets-base.repository';
@Injectable()
export class GoogleSheetsMemberRepository extends GoogleSheetsBaseRepository implements IMemberRepository {}
