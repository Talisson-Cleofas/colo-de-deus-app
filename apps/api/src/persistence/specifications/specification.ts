export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return { isSatisfiedBy: (candidate) => this.isSatisfiedBy(candidate) && other.isSatisfiedBy(candidate) };
  }

  or(other: Specification<T>): Specification<T> {
    return { isSatisfiedBy: (candidate) => this.isSatisfiedBy(candidate) || other.isSatisfiedBy(candidate) };
  }
}
