import { Injectable } from '@nestjs/common';
import type { UnitOfWork } from '../ports/unit-of-work.port';

@Injectable()
export class InMemoryUnitOfWork implements UnitOfWork {
  async execute<T>(work: () => Promise<T>): Promise<T> { return work(); }
}
