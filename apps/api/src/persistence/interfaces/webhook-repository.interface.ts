import type { IBaseRepository } from './base-repository.interface';
export type IWebhookRepository = IBaseRepository;
export const WEBHOOK_REPOSITORY = Symbol('WEBHOOK_REPOSITORY');
