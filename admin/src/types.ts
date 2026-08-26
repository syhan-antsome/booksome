export type AdminRole = 'USER' | 'ADMIN';

export type ApiUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: AdminRole;
};

export type ApiProfile = {
  id: string;
  displayName: string;
  username: string | null;
  avatarPath: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: number;
  user: ApiUser;
  profile: ApiProfile;
};

export type DashboardMetrics = {
  totalUsers: number;
  registeredBooks: number;
  activeRooms: number;
  openReports: number;
  todaySignups: number;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  status: string;
  role: AdminRole;
  emailVerified: boolean;
  readingBookCount: number;
  roomCount: number;
  createdAt: string;
};

export type AdminReport = {
  id: string;
  reporterName: string | null;
  reason: string;
  targetType: string;
  targetLabel: string;
  resolved: boolean;
  createdAt: string;
};

export type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  createdAt: string;
};

export type ServiceStatus = {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
  detail: string;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  recentUsers: AdminUser[];
  openReports: AdminReport[];
  recentActivity: ActivityItem[];
  services: ServiceStatus[];
  checkedAt: string;
};

export type SystemOverview = {
  services: ServiceStatus[];
  uptimeSeconds: number;
  checkedAt: string;
};
