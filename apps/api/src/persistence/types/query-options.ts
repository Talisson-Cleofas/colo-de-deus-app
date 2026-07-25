export type SortDirection = 'asc' | 'desc';
export type Primitive = string | number | boolean | null | undefined;

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface SortOptions<T> {
  orderBy?: keyof T;
  direction?: SortDirection;
}

export interface QueryOptions<T> extends PaginationOptions, SortOptions<T> {
  filters?: Partial<Record<keyof T, Primitive | Primitive[]>>;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
