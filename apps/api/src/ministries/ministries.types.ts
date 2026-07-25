export type MinistryRecord = {
  id: string;
  missionId: string;
  name: string;
  description: string;
  leaderId: string;
  leaderEmail: string;
  leaderName: string;
  viceLeaderId: string;
  viceLeaderEmail: string;
  viceLeaderName: string;
  color: string;
  icon: string;
  type: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  notes: string;
  membersCount: number;
};

export type MinistryMemberRecord = {
  participantId: string;
  memberId: string;
  name: string;
  email: string;
  photo: string;
  role: string;
  profile: string;
  function: string;
  joinedAt: string;
  active: boolean;
};

export type MinistryAttendanceRecord = {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  present: boolean;
  justification: string;
  registeredBy: string;
  origin: string;
  createdAt: string;
  updatedAt: string;
};
