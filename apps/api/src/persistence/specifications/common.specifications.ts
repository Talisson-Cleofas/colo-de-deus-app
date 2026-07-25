import { CompositeSpecification } from './specification';

type RecordLike = Record<string, unknown>;

export class MembersByMinistry<T extends RecordLike> extends CompositeSpecification<T> {
  constructor(private readonly ministry: string) { super(); }
  isSatisfiedBy(candidate: T): boolean { return candidate.ministry === this.ministry || candidate.ministerio_id === this.ministry; }
}

export class MembersByCell<T extends RecordLike> extends CompositeSpecification<T> {
  constructor(private readonly cell: string) { super(); }
  isSatisfiedBy(candidate: T): boolean { return candidate.cell === this.cell || candidate.celula_id === this.cell; }
}

export class UpcomingEvents<T extends RecordLike> extends CompositeSpecification<T> {
  constructor(private readonly now = new Date()) { super(); }
  isSatisfiedBy(candidate: T): boolean { const value = String(candidate.data_inicio ?? candidate.date ?? ''); return Boolean(value) && new Date(value).getTime() >= this.now.getTime(); }
}

export class UnreadNotifications<T extends RecordLike> extends CompositeSpecification<T> {
  isSatisfiedBy(candidate: T): boolean { const value = String(candidate.lida ?? candidate.status ?? '').trim().toUpperCase(); return !['TRUE', '1', 'SIM', 'LIDA', 'READ'].includes(value); }
}

export class BirthdayThisMonth<T extends RecordLike> extends CompositeSpecification<T> {
  constructor(private readonly month = new Date().getMonth() + 1) { super(); }
  isSatisfiedBy(candidate: T): boolean { const value = String(candidate.birthDate ?? candidate.data_nascimento ?? ''); const parsed = new Date(value); return !Number.isNaN(parsed.getTime()) && parsed.getMonth() + 1 === this.month; }
}
