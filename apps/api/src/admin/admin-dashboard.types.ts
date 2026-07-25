export type AdminDashboardLog = {
  id: string;
  action: string;
  module: string;
  description: string;
  userName: string;
  userEmail: string;
  createdAt: string;
};

export type AdminDashboardChange = AdminDashboardLog & {
  entity: string;
  recordId: string;
};

export type AdminDashboardData = {
  generatedAt: string;
  metrics: {
    members: number;
    leaders: number;
    cells: number;
    ministries: number;
    events: number;
    cenacles: number;
    onlineUsers: number;
  };
  recentLogs: AdminDashboardLog[];
  latestChanges: AdminDashboardChange[];
};
