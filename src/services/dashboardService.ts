import { supabase } from '../lib/supabase';
import type { TaskStatus, ProjectStatus } from '../types/database';

export interface DashboardFilters {
  dateRange: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  projectId?: string;
  userId?: string;
}

export interface TaskStatusStats {
  todo: number;
  in_progress: number;
  review: number;
  completed: number;
  blocked: number;
  total: number;
}

export interface ProjectStatusStats {
  active: number;
  on_hold: number;
  completed: number;
  archived: number;
  total: number;
}

export interface TimeLogStats {
  today: number;
  week: number;
  month: number;
  byDay: { date: string; minutes: number }[];
}

export interface ProductivityTrend {
  date: string;
  tasksCompleted: number;
  tasksCreated: number;
  timeLogged: number;
}

export interface TeamMemberStats {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  tasksCompleted: number;
  tasksAssigned: number;
  timeLogged: number;
}

export interface DashboardData {
  taskStats: TaskStatusStats;
  projectStats: ProjectStatusStats;
  timeStats: TimeLogStats;
  productivityTrends: ProductivityTrend[];
  teamStats: TeamMemberStats[];
}

function getDateRange(filters: DashboardFilters): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (filters.dateRange) {
    case 'day':
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'custom':
      if (filters.startDate) start = new Date(filters.startDate);
      if (filters.endDate) {
        end.setTime(new Date(filters.endDate).getTime());
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { start, end };
}

export async function fetchTaskStats(
  filters: DashboardFilters,
  isAdmin: boolean,
  userId: string
): Promise<{ data: TaskStatusStats | null; error: Error | null }> {
  let query = supabase
    .from('tasks')
    .select('status')
    .is('deleted_at', null);

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  if (!isAdmin && filters.userId) {
    query = query.eq('assignee_id', filters.userId);
  } else if (filters.userId) {
    query = query.eq('assignee_id', filters.userId);
  } else if (!isAdmin) {
    query = query.eq('assignee_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const stats: TaskStatusStats = {
    todo: 0,
    in_progress: 0,
    review: 0,
    completed: 0,
    blocked: 0,
    total: 0
  };

  for (const task of data || []) {
    stats[task.status as TaskStatus]++;
    stats.total++;
  }

  return { data: stats, error: null };
}

export async function fetchProjectStats(
  filters: DashboardFilters,
  isAdmin: boolean,
  userId: string
): Promise<{ data: ProjectStatusStats | null; error: Error | null }> {
  let projectIds: string[] = [];

  if (!isAdmin) {
    const { data: memberProjects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    const { data: ownedProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
      .is('deleted_at', null);

    const ids = new Set<string>();
    memberProjects?.forEach(m => ids.add(m.project_id));
    ownedProjects?.forEach(p => ids.add(p.id));
    projectIds = Array.from(ids);
  }

  let query = supabase
    .from('projects')
    .select('status')
    .is('deleted_at', null);

  if (!isAdmin && projectIds.length > 0) {
    query = query.in('id', projectIds);
  } else if (!isAdmin && projectIds.length === 0) {
    return {
      data: { active: 0, on_hold: 0, completed: 0, archived: 0, total: 0 },
      error: null
    };
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const stats: ProjectStatusStats = {
    active: 0,
    on_hold: 0,
    completed: 0,
    archived: 0,
    total: 0
  };

  for (const project of data || []) {
    stats[project.status as ProjectStatus]++;
    stats.total++;
  }

  return { data: stats, error: null };
}

export async function fetchTimeStats(
  filters: DashboardFilters,
  isAdmin: boolean,
  userId: string
): Promise<{ data: TimeLogStats | null; error: Error | null }> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setMonth(monthStart.getMonth() - 1);
  monthStart.setHours(0, 0, 0, 0);

  let query = supabase
    .from('time_logs')
    .select('started_at, ended_at, duration_minutes')
    .gte('started_at', monthStart.toISOString())
    .not('ended_at', 'is', null);

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  } else if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  let today = 0;
  let week = 0;
  let month = 0;
  const byDayMap = new Map<string, number>();

  for (const log of data || []) {
    const startDate = new Date(log.started_at);
    const dateKey = startDate.toISOString().split('T')[0];

    let minutes = log.duration_minutes || 0;
    if (!minutes && log.ended_at) {
      const end = new Date(log.ended_at);
      minutes = Math.floor((end.getTime() - startDate.getTime()) / 60000);
    }

    byDayMap.set(dateKey, (byDayMap.get(dateKey) || 0) + minutes);

    if (startDate >= todayStart) {
      today += minutes;
    }
    if (startDate >= weekStart) {
      week += minutes;
    }
    month += minutes;
  }

  const byDay: { date: string; minutes: number }[] = [];
  const tempDate = new Date(monthStart);
  while (tempDate <= now) {
    const dateKey = tempDate.toISOString().split('T')[0];
    byDay.push({
      date: dateKey,
      minutes: byDayMap.get(dateKey) || 0
    });
    tempDate.setDate(tempDate.getDate() + 1);
  }

  return {
    data: { today, week, month, byDay },
    error: null
  };
}

export async function fetchProductivityTrends(
  filters: DashboardFilters,
  isAdmin: boolean,
  userId: string
): Promise<{ data: ProductivityTrend[] | null; error: Error | null }> {
  const { start, end } = getDateRange(filters);

  let tasksQuery = supabase
    .from('tasks')
    .select('created_at, completed_at, assignee_id')
    .is('deleted_at', null)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (!isAdmin) {
    tasksQuery = tasksQuery.eq('assignee_id', userId);
  } else if (filters.userId) {
    tasksQuery = tasksQuery.eq('assignee_id', filters.userId);
  }

  if (filters.projectId) {
    tasksQuery = tasksQuery.eq('project_id', filters.projectId);
  }

  let timeQuery = supabase
    .from('time_logs')
    .select('started_at, duration_minutes, ended_at')
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
    .not('ended_at', 'is', null);

  if (!isAdmin) {
    timeQuery = timeQuery.eq('user_id', userId);
  } else if (filters.userId) {
    timeQuery = timeQuery.eq('user_id', filters.userId);
  }

  const [tasksResult, timeResult] = await Promise.all([tasksQuery, timeQuery]);

  if (tasksResult.error) {
    return { data: null, error: new Error(tasksResult.error.message) };
  }
  if (timeResult.error) {
    return { data: null, error: new Error(timeResult.error.message) };
  }

  const trendMap = new Map<string, ProductivityTrend>();

  const tempDate = new Date(start);
  while (tempDate <= end) {
    const dateKey = tempDate.toISOString().split('T')[0];
    trendMap.set(dateKey, {
      date: dateKey,
      tasksCompleted: 0,
      tasksCreated: 0,
      timeLogged: 0
    });
    tempDate.setDate(tempDate.getDate() + 1);
  }

  for (const task of tasksResult.data || []) {
    const createdDate = task.created_at.split('T')[0];
    if (trendMap.has(createdDate)) {
      trendMap.get(createdDate)!.tasksCreated++;
    }

    if (task.completed_at) {
      const completedDate = task.completed_at.split('T')[0];
      if (trendMap.has(completedDate)) {
        trendMap.get(completedDate)!.tasksCompleted++;
      }
    }
  }

  for (const log of timeResult.data || []) {
    const logDate = log.started_at.split('T')[0];
    if (trendMap.has(logDate)) {
      let minutes = log.duration_minutes || 0;
      if (!minutes && log.ended_at) {
        const startTime = new Date(log.started_at);
        const endTime = new Date(log.ended_at);
        minutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      }
      trendMap.get(logDate)!.timeLogged += minutes;
    }
  }

  return {
    data: Array.from(trendMap.values()),
    error: null
  };
}

export async function fetchTeamStats(
  filters: DashboardFilters
): Promise<{ data: TeamMemberStats[] | null; error: Error | null }> {
  const { start, end } = getDateRange(filters);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url')
    .is('deleted_at', null);

  if (usersError) {
    return { data: null, error: new Error(usersError.error) };
  }

  let tasksQuery = supabase
    .from('tasks')
    .select('assignee_id, status')
    .is('deleted_at', null);

  if (filters.projectId) {
    tasksQuery = tasksQuery.eq('project_id', filters.projectId);
  }

  let timeQuery = supabase
    .from('time_logs')
    .select('user_id, duration_minutes, started_at, ended_at')
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
    .not('ended_at', 'is', null);

  const [tasksResult, timeResult] = await Promise.all([tasksQuery, timeQuery]);

  if (tasksResult.error) {
    return { data: null, error: new Error(tasksResult.error.message) };
  }
  if (timeResult.error) {
    return { data: null, error: new Error(timeResult.error.message) };
  }

  const statsMap = new Map<string, TeamMemberStats>();

  for (const user of users || []) {
    statsMap.set(user.id, {
      id: user.id,
      name: user.full_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      tasksCompleted: 0,
      tasksAssigned: 0,
      timeLogged: 0
    });
  }

  for (const task of tasksResult.data || []) {
    if (task.assignee_id && statsMap.has(task.assignee_id)) {
      const stats = statsMap.get(task.assignee_id)!;
      stats.tasksAssigned++;
      if (task.status === 'completed') {
        stats.tasksCompleted++;
      }
    }
  }

  for (const log of timeResult.data || []) {
    if (statsMap.has(log.user_id)) {
      let minutes = log.duration_minutes || 0;
      if (!minutes && log.ended_at) {
        const startTime = new Date(log.started_at);
        const endTime = new Date(log.ended_at);
        minutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      }
      statsMap.get(log.user_id)!.timeLogged += minutes;
    }
  }

  const teamStats = Array.from(statsMap.values())
    .filter(s => s.tasksAssigned > 0 || s.timeLogged > 0)
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted);

  return { data: teamStats, error: null };
}

export async function fetchUserProjects(): Promise<{ data: { id: string; name: string }[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

export async function fetchTeamMembers(): Promise<{ data: { id: string; name: string }[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name')
    .is('deleted_at', null)
    .order('full_name');

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return {
    data: data?.map(u => ({ id: u.id, name: u.full_name })) || [],
    error: null
  };
}
