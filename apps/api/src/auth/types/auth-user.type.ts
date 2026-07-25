export type AccessProfile = 'DEVELOPER' | 'MISSION_LEADER' | 'ADMIN' | 'MINISTRY_LEADER' | 'CELL_LEADER' | 'MEMBER';

export type AuthenticatedUser = {
  uid: string;
  memberId: string;
  id: string;
  name: string;
  email: string;
  photo: string;
  role: string;
  ministry: string;
  cell: string;
  phone: string;
  profile: AccessProfile;
  active: true;
  bio: string;
  instagram: string;
  birthDate: string;
  joinedAt: string;
  city: string;
  state: string;
  gifts: string[];
  formator: string;
};
