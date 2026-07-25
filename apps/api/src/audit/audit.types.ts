export type AuditAction = 'LOGIN'|'LOGOUT'|'CREATE'|'UPDATE'|'DELETE'|'RESTORE'|'PERMISSION'|'CHANGE';
export type AuditRecord = {
  id:string; action:AuditAction; module:string; entity:string; recordId:string;
  userId:string; userName:string; userEmail:string; profile:string;
  description:string; previousData:string; newData:string; ip:string; userAgent:string; createdAt:string;
};
export type AuditFilters = { action?:string; module?:string; user?:string; startDate?:string; endDate?:string; q?:string };
