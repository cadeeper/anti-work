const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    ...options,
  });

  if (response.status === 401) {
    // Token 过期，清除并刷新页面
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// 今日概览
export interface TodayStats {
  date: string;
  workTime: {
    totalHours: number;
    normalHours: number;
    overtimeHours: number;
  };
  code: {
    totalLinesAdded: number;
    totalLinesDeleted: number;
    totalFilesChanged: number;
    changeCount: number;
    repoStats: Record<string, { linesAdded: number; linesDeleted: number; filesChanged: number }>;
  };
  web: {
    activityCount: number;
    domainStats: Record<string, { count: number; duration: number }>;
  };
  hourlyHeatmap: Array<{
    hour: number;
    hasActivity: boolean;
    codeChanges: number;
    webActivities: number;
    isOvertime: boolean;
  }>;
}

export function fetchTodayStats(userId?: number): Promise<TodayStats> {
  const query = userId ? `?userId=${userId}` : '';
  return fetchAPI(`/stats/today${query}`);
}

// 日报
export interface DailyStats {
  date: string;
  workTime: {
    totalHours: number;
    normalHours: number;
    overtimeHours: number;
  };
  codeChanges: number;
  linesAdded: number;
  linesDeleted: number;
  webActivities: number;
  workHours: Array<{
    hour: number;
    hasActivity: boolean;
    codeChanges: number;
    webActivities: number;
    isOvertime: boolean;
  }>;
}

export function fetchDailyStats(date?: string, userId?: number): Promise<DailyStats> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (userId) params.set('userId', userId.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchAPI(`/stats/daily${query}`);
}

// 周报
export interface WeeklyStats {
  startDate: string;
  endDate: string;
  days: Array<{
    date: string;
    dayOfWeek: number;
    workTime: {
      totalHours: number;
      normalHours: number;
      overtimeHours: number;
    };
    linesAdded: number;
    linesDeleted: number;
  }>;
  summary: {
    totalWorkHours: number;
    totalNormalHours: number;
    totalOvertimeHours: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
  };
}

export function fetchWeeklyStats(week?: string, userId?: number): Promise<WeeklyStats> {
  const params = new URLSearchParams();
  if (week) params.set('week', week);
  if (userId) params.set('userId', userId.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchAPI(`/stats/weekly${query}`);
}

// 月报
export interface MonthlyStats {
  month: string;
  days: Array<{
    date: string;
    dayOfWeek: number;
    workTime: {
      totalHours: number;
      normalHours: number;
      overtimeHours: number;
    };
  }>;
  summary: {
    totalWorkHours: number;
    totalNormalHours: number;
    totalOvertimeHours: number;
    workDays: number;
  };
}

export function fetchMonthlyStats(month?: string, userId?: number): Promise<MonthlyStats> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (userId) params.set('userId', userId.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchAPI(`/stats/monthly${query}`);
}

// 加班统计
export interface OvertimeStats {
  totalOvertimeHours: number;
  weekdayOvertimeHours: number;
  weekendOvertimeHours: number;
  dailyOvertime: Record<string, number>;
  overtimeByHour: Record<number, number>;
}

export function fetchOvertimeStats(start?: string, end?: string, userId?: number): Promise<OvertimeStats> {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (userId) params.set('userId', userId.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchAPI(`/stats/overtime${query}`);
}

// 代码活动详情
export interface CodeActivity {
  id: number;
  repoName: string;
  branch: string;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  isCommitted: boolean;
  commitHash?: string;
  recordedAt: string;
}

export interface CodeActivitiesResponse {
  startDate: string;
  endDate: string;
  total: number;
  summary: {
    totalLinesAdded: number;
    totalLinesDeleted: number;
    totalFilesChanged: number;
  };
  repoStats: Record<string, { count: number; linesAdded: number; linesDeleted: number; filesChanged: number }>;
  branchStats: Array<{ repoName: string; branch: string; count: number; linesAdded: number; linesDeleted: number }>;
  repos: string[];
  activities: CodeActivity[];
}

export function fetchCodeActivities(start?: string, end?: string, repo?: string, userId?: number): Promise<CodeActivitiesResponse> {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (repo) params.set('repo', repo);
  if (userId) params.set('userId', userId.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchAPI(`/stats/code-activities${query}`);
}

// 仓库列表
export interface Repo {
  name: string;
  path: string;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalFilesChanged: number;
  changeCount: number;
}

export function fetchRepos(userId?: number): Promise<Repo[]> {
  const query = userId ? `?userId=${userId}` : '';
  return fetchAPI(`/repos${query}`);
}

// 仓库详情
export interface RepoStats {
  name: string;
  period: { start: string; end: string };
  totalChanges: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  dailyStats: Record<string, { linesAdded: number; linesDeleted: number; filesChanged: number; count: number }>;
  branchStats: Record<string, { linesAdded: number; linesDeleted: number; count: number }>;
}

export function fetchRepoStats(name: string, days?: number, userId?: number): Promise<RepoStats> {
  const params = new URLSearchParams();
  if (days) params.set('days', days.toString());
  if (userId) params.set('userId', userId.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchAPI(`/repos/${encodeURIComponent(name)}${query}`);
}

// 配置
export interface UserConfig {
  pollInterval: number;
  excludePatterns: string[];
  domainWhitelist: string[];
  domainBlacklist: string[];
  sanitizePatterns: string[];
  workTime: {
    start: string;
    end: string;
    lunchBreak: {
      start: string;
      end: string;
    };
  };
}

export function fetchMyConfig(): Promise<UserConfig> {
  return fetchAPI('/config/me');
}

export function updateMyConfig(config: Partial<{
  pollInterval: number;
  excludePatterns: string[];
  domainWhitelist: string[];
  domainBlacklist: string[];
  sanitizePatterns: string[];
  workTimeStart: string;
  workTimeEnd: string;
  lunchStart: string;
  lunchEnd: string;
}>): Promise<{ success: boolean }> {
  return fetchAPI('/config/me', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}
