import { useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../services/api';
export type DashboardLectio={id:string;date:string;title:string;celebration:string;gospelReference:string;gospelTitle:string;excerpt:string;status:string;source:string;available:boolean;updatedAt:string};
export type DashboardEvent={id:string;title:string;startDate:string;startTime:string;endDate:string;location:string;category:string;scope:string};
export type DashboardBirthday={id:string;name:string;photo:string;day:number;month:number;isToday:boolean;daysUntil:number};
type Section<T>={status:'SUCCESS'|'EMPTY'|'ERROR';data:T;error?:string;updatedAt:string};
export type MemberDashboard={generatedAt:string;lectio:Section<DashboardLectio|null>;notifications:Section<{unreadCount:number;recent:unknown[]}>;birthdays:Section<{enabled:boolean;today:DashboardBirthday[];week:DashboardBirthday[];month:DashboardBirthday[];monthCount:number}>;events:Section<DashboardEvent[]>};
export function useMemberDashboard(){ const q=useQuery({queryKey:['dashboard'],queryFn:async()=> (await api.get<MemberDashboard>('/dashboard')).data, staleTime:30_000}); return {data:q.data??null,loading:q.isLoading,error:q.error?apiErrorMessage(q.error):'',reload:q.refetch}; }
