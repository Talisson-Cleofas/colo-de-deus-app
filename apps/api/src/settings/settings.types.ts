export type GeneralSettings = {
  missionName: string;
  communityName: string;
  primaryLogo: string;
  whiteLogo: string;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  birthdaysEnabled: boolean;
  showBirthdayAge: boolean;
  birthdayNotificationsEnabled: boolean;
  birthdayReminderDays: number;
  birthdayNotificationAudience: 'ALL' | 'LEADERS';
  birthdayDefaultMessage: string;
  birthdayLeaderReminderMessage: string;
  absenceLimit: number;
  justificationsEnabled: boolean;
  eventConfirmationRequired: boolean;
  eventDefaultScope: 'GENERAL' | 'MINISTRY' | 'CELL' | 'CENACLE';
  eventDefaultDurationMinutes: number;
  eventReminderDays: number;
  updatedAt: string;
  updatedBy: string;
};

export type PublicGeneralSettings = Pick<GeneralSettings,
  'missionName' | 'communityName' | 'primaryLogo' | 'whiteLogo' | 'coverImage' |
  'primaryColor' | 'secondaryColor' | 'city' | 'state' | 'email' | 'phone' |
  'website' | 'instagram' | 'birthdaysEnabled' | 'showBirthdayAge'
>;
