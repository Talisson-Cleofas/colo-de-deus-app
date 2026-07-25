export type Participant = { id:string; name:string; email?:string; photo:string; role:string; phone:string; function?:string };
export type Cell = {
  id:string; name:string; type:'CELL'|'CENACLE'; description:string;
  leader:Participant; coLeaders:Participant[]; participants:Participant[];
  ministryId:string; ministryName:string; cellId?:string; cellName?:string;
  weekday:string; time:string; startDate?:string; endDate?:string; endTime?:string; recurrence?:string;
  status?:'UPCOMING'|'FINISHED'|'CANCELLED'; closedAt?:string;
  address:string; neighborhood:string; city:string; state:string;
  latitude:number; longitude:number; active:boolean;
  canEdit?:boolean; canManageParticipants?:boolean;
};
export type AttendanceRecord = { id:string; communityId:string; date:string; participantId:string; participantName:string; present:boolean; notes:string };
