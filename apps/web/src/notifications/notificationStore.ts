import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { api, apiErrorMessage } from '../services/api';

export type Notice={id:string;title:string;message:string;type:string;audience:string;audienceId:string;origin:string;referenceType:string;referenceId:string;link:string;senderId:string;senderName:string;sentAt:string|null;read:boolean;readAt:string|null;active:boolean;canDelete:boolean};
export type NotificationOptions={members:{id:string;name:string;email:string;profile:string;ministry:string;cell:string}[];ministries:{id:string;name:string}[];cells:{id:string;name:string;ministryId:string}[];cenacles:{id:string;name:string;ministryId:string;cellId:string}[];profiles:string[]};
export type NotificationState={notifications:Notice[];items:Notice[];unreadCount:number;readCount:number;total:number;updatedAt:string};
type StoreSnapshot={state:NotificationState;loading:boolean;error:string};

const emptyState:NotificationState={notifications:[],items:[],unreadCount:0,readCount:0,total:0,updatedAt:''};
let snapshot:StoreSnapshot={state:emptyState,loading:true,error:''};
let request:Promise<void>|null=null;
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(listener=>listener());
const setSnapshot=(next:StoreSnapshot)=>{snapshot=next;emit();};
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);};
const getSnapshot=()=>snapshot;

function normalizeState(data:Partial<NotificationState>):NotificationState{
 const notifications=data.notifications??data.items??[];
 const unreadCount=Number(data.unreadCount??notifications.filter(item=>!item.read).length);
 return {notifications,items:notifications,unreadCount,readCount:Number(data.readCount??notifications.length-unreadCount),total:Number(data.total??notifications.length),updatedAt:data.updatedAt??new Date().toISOString()};
}

async function loadNotificationState(force=false){
 if(request && !force)return request;
 if(request && force)await request;
 request=(async()=>{
  setSnapshot({...snapshot,loading:true});
  try{
   const {data}=await api.get<NotificationState>('/notifications/state');
   setSnapshot({state:normalizeState(data),loading:false,error:''});
  }catch(error){
   // Em erro de sincronização, não preserva badge obsoleto.
   setSnapshot({state:emptyState,loading:false,error:apiErrorMessage(error)});
  }finally{request=null;}
 })();
 return request;
}

function applyMutationResponse(data:unknown){
 const payload=data as {state?:NotificationState};
 if(payload?.state)setSnapshot({state:normalizeState(payload.state),loading:false,error:''});
}

export const notifyNotificationsChanged=()=>{void loadNotificationState(true);};

export function useNotificationState(){
 const current=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
 useEffect(()=>{const initial=window.setTimeout(()=>void loadNotificationState(),1200);const onFocus=()=>void loadNotificationState(true);window.addEventListener('focus',onFocus);return()=>{window.clearTimeout(initial);window.removeEventListener('focus',onFocus);};},[]);
 const reload=useCallback(()=>loadNotificationState(true),[]);
 const act=useCallback(async(action:()=>Promise<{data:unknown}>)=>{const response=await action();applyMutationResponse(response.data);if(!(response.data as {state?:unknown})?.state)await loadNotificationState(true);},[]);
 return {
  ...current.state,
  loading:current.loading,
  error:current.error,
  reload,
  markAllAsRead:()=>act(()=>api.post('/notifications/read-all')),
  toggleRead:(item:Notice)=>act(()=>api.patch(`/notifications/${item.id}/read`,{read:!item.read})),
  remove:(id:string)=>act(()=>api.delete(`/notifications/${id}`)),
 };
}

// Compatibilidade com telas existentes. Todas usam o mesmo store global.
export const useNotifications=useNotificationState;
