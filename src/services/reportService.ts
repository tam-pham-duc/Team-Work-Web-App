import { supabase } from '../lib/supabase';

export interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
  };
  userId?: string;
  projectId?: string;
  taskStatus?: string[];
}

export interface TaskCompletionData {
  date: string;
  count: number;
}

export interface TimeLogData {
  date: string;
  minutes: number;
}

export interface ProductivityTrend {
  week: string;
  tasksCompleted: number;
  timeLogged: number;
  avgTimePerTask: number;
}

export interface IndividualReport {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  period: { start: string; end: string };
  summary: {
    totalTasksCompleted: number;
    totalTimeLogged: number;
    avgTasksPerDay: number;
    avgTimePerTask: number;
    completionRate: number;
  };
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  taskCompletionByDay: TaskCompletionData[];
  timeLogsByDay: TimeLogData[];
  productivityTrends: ProductivityTrend[];
  topProjects: { projectId: string; projectName: string; tasksCompleted: number; timeLogged: number }[];
}

export interface ProjectTaskBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface ProjectMemberStats {
  userId: string;
  userName: string;
  userAvatar: string | null;
  tasksAssigned: number;
  tasksCompleted: number;
  timeLogged: number;
  completionRate: number;
}

export interface ProjectReport {
  projectId: string;
  projectName: string;
  projectStatus: string;
  period: { start: string; end: string };
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    completionPercentage: number;
    totalTimeLogged: number;
    estimatedHours: number;
    timeVariance: number;
    avgTaskCompletionTime: number;
    daysRemaining: number | null;
  };
  taskBreakdown: ProjectTaskBreakdown[];
  tasksByPriority: { priority: string; count: number; completed: number }[];
  progressOverTime: { date: string; completed: number; total: number }[];
  memberStats: ProjectMemberStats[];
  recentActivity: { date: string; action: string; taskTitle: string; userName: string }[];
}

export interface TeamOverviewReport {
  period: { start: string; end: string };
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalTimeLogged: number;
    avgCompletionRate: number;
  };
  projectsOverview: {
    projectId: string;
    projectName: string;
    status: string;
    completionPercentage: number;
    tasksCompleted: number;
    totalTasks: number;
    timeLogged: number;
  }[];
  topPerformers: {
    userId: string;
    userName: string;
    userAvatar: string | null;
    tasksCompleted: number;
    timeLogged: number;
    completionRate: number;
  }[];
  taskDistribution: { status: string; count: number }[];
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export async function fetchIndividualReport(
  filters: ReportFilters
): Promise<IndividualReport | null> {
  const { dateRange, userId } = filters;

  if (!userId) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (!userData) return null;

  const startDate = `${dateRange.start}T00:00:00`;
  const endDate = `${dateRange.end}T23:59:59`;

  const [tasksResult, timeLogsResult, allUserTasksResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, completed_at, project_id, projects(name)')
      .or(`assignee_id.eq.${userId},created_by.eq.${userId}`)
      .is('deleted_at', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    supabase
      .from('time_logs')
      .select('id, started_at, ended_at, duration_minutes, task_id, tasks(title, project_id, projects(name))')
      .eq('user_id', userId)
      .gte('started_at', startDate)
      .lte('started_at', endDate),
    supabase
      .from('tasks')
      .select('id, status')
      .or(`assignee_id.eq.${userId},created_by.eq.${userId}`)
      .is('deleted_at', null),
  ]);

  const tasks = tasksResult.data || [];
  const timeLogs = timeLogsResult.data || [];
  const allUserTasks = allUserTasksResult.data || [];

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalTimeLogged = timeLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

  const daysDiff = Math.max(1, Math.ceil(
    (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
  ));

  const tasksByStatus = ['todo', 'in_progress', 'review', 'completed', 'blocked'].map(status => ({
    status,
    count: tasks.filter(t => t.status === status).length,
  }));

  const tasksByPriority = ['low', 'medium', 'high', 'urgent'].map(priority => ({
    priority,
    count: tasks.filter(t => t.priority === priority).length,
  }));

  const completionByDay: Record<string, number> = {};
  completedTasks.forEach(task => {
    if (task.completed_at) {
      const date = task.completed_at.split('T')[0];
      completionByDay[date] = (completionByDay[date] || 0) + 1;
    }
  });

  const taskCompletionByDay: TaskCompletionData[] = [];
  const currentDate = new Date(dateRange.start);
  const endDateObj = new Date(dateRange.end);
  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split('T')[0];
    taskCompletionByDay.push({
      date: dateStr,
      count: completionByDay[dateStr] || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const timeByDay: Record<string, number> = {};
  timeLogs.forEach(log => {
    const date = log.started_at.split('T')[0];
    timeByDay[date] = (timeByDay[date] || 0) + (log.duration_minutes || 0);
  });

  const timeLogsByDay: TimeLogData[] = [];
  const currentDate2 = new Date(dateRange.start);
  while (currentDate2 <= endDateObj) {
    const dateStr = currentDate2.toISOString().split('T')[0];
    timeLogsByDay.push({
      date: dateStr,
      minutes: timeByDay[dateStr] || 0,
    });
    currentDate2.setDate(currentDate2.getDate() + 1);
  }

  const weeklyData: Record<string, { tasks: number; time: number }> = {};
  completedTasks.forEach(task => {
    if (task.completed_at) {
      const week = getWeekNumber(new Date(task.completed_at));
      if (!weeklyData[week]) weeklyData[week] = { tasks: 0, time: 0 };
      weeklyData[week].tasks++;
    }
  });
  timeLogs.forEach(log => {
    const week = getWeekNumber(new Date(log.started_at));
    if (!weeklyData[week]) weeklyData[week] = { tasks: 0, time: 0 };
    weeklyData[week].time += log.duration_minutes || 0;
  });

  const productivityTrends: ProductivityTrend[] = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      tasksCompleted: data.tasks,
      timeLogged: data.time,
      avgTimePerTask: data.tasks > 0 ? Math.round(data.time / data.tasks) : 0,
    }));

  const projectStats: Record<string, { name: string; tasks: number; time: number }> = {};
  completedTasks.forEach(task => {
    const projectId = task.project_id;
    const projectName = (task.projects as { name: string } | null)?.name || 'Unknown';
    if (!projectStats[projectId]) projectStats[projectId] = { name: projectName, tasks: 0, time: 0 };
    projectStats[projectId].tasks++;
  });
  timeLogs.forEach(log => {
    const task = log.tasks as { project_id: string; projects: { name: string } | null } | null;
    if (task) {
      const projectId = task.project_id;
      const projectName = task.projects?.name || 'Unknown';
      if (!projectStats[projectId]) projectStats[projectId] = { name: projectName, tasks: 0, time: 0 };
      projectStats[projectId].time += log.duration_minutes || 0;
    }
  });

  const topProjects = Object.entries(projectStats)
    .map(([projectId, data]) => ({
      projectId,
      projectName: data.name,
      tasksCompleted: data.tasks,
      timeLogged: data.time,
    }))
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    .slice(0, 5);

  const allCompleted = allUserTasks.filter(t => t.status === 'completed').length;
  const completionRate = allUserTasks.length > 0 ? (allCompleted / allUserTasks.length) * 100 : 0;

  return {
    userId: userData.id,
    userName: userData.full_name,
    userEmail: userData.email,
    userAvatar: userData.avatar_url,
    period: dateRange,
    summary: {
      totalTasksCompleted: completedTasks.length,
      totalTimeLogged,
      avgTasksPerDay: Math.round((completedTasks.length / daysDiff) * 10) / 10,
      avgTimePerTask: completedTasks.length > 0 ? Math.round(totalTimeLogged / completedTasks.length) : 0,
      completionRate: Math.round(completionRate),
    },
    tasksByStatus,
    tasksByPriority,
    taskCompletionByDay,
    timeLogsByDay,
    productivityTrends,
    topProjects,
  };
}

export async function fetchProjectReport(
  filters: ReportFilters
): Promise<ProjectReport | null> {
  const { dateRange, projectId } = filters;

  if (!projectId) return null;

  const { data: projectData } = await supabase
    .from('projects')
    .select('id, name, status, start_date, end_date')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!projectData) return null;

  const startDate = `${dateRange.start}T00:00:00`;
  const endDate = `${dateRange.end}T23:59:59`;

  const [tasksResult, timeLogsResult, membersResult, activityResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, estimated_hours, completed_at, assignee_id, created_at, users!tasks_assignee_id_fkey(id, full_name, avatar_url)')
      .eq('project_id', projectId)
      .is('deleted_at', null),
    supabase
      .from('time_logs')
      .select('id, user_id, duration_minutes, started_at, users(id, full_name, avatar_url)')
      .in('task_id', (await supabase.from('tasks').select('id').eq('project_id', projectId).is('deleted_at', null)).data?.map(t => t.id) || [])
      .gte('started_at', startDate)
      .lte('started_at', endDate),
    supabase
      .from('project_members')
      .select('user_id, role, users(id, full_name, avatar_url)')
      .eq('project_id', projectId),
    supabase
      .from('activity_logs')
      .select('id, action, created_at, user_id, changes, users(full_name)')
      .eq('entity_type', 'task')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const tasks = tasksResult.data || [];
  const timeLogs = timeLogsResult.data || [];
  const members = membersResult.data || [];

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  const totalTimeLogged = timeLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
  const estimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const estimatedMinutes = estimatedHours * 60;

  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  let daysRemaining: number | null = null;
  if (projectData.end_date) {
    const endDateProject = new Date(projectData.end_date);
    const today = new Date();
    daysRemaining = Math.ceil((endDateProject.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const taskBreakdown: ProjectTaskBreakdown[] = ['todo', 'in_progress', 'review', 'completed', 'blocked'].map(status => {
    const count = tasks.filter(t => t.status === status).length;
    return {
      status,
      count,
      percentage: tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0,
    };
  });

  const tasksByPriority = ['low', 'medium', 'high', 'urgent'].map(priority => {
    const priorityTasks = tasks.filter(t => t.priority === priority);
    return {
      priority,
      count: priorityTasks.length,
      completed: priorityTasks.filter(t => t.status === 'completed').length,
    };
  });

  const progressByDate: Record<string, { completed: number; total: number }> = {};
  const currentDate = new Date(dateRange.start);
  const endDateObj = new Date(dateRange.end);
  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const tasksAtDate = tasks.filter(t => new Date(t.created_at) <= currentDate);
    const completedAtDate = tasksAtDate.filter(t =>
      t.status === 'completed' && t.completed_at && new Date(t.completed_at) <= currentDate
    );
    progressByDate[dateStr] = {
      completed: completedAtDate.length,
      total: tasksAtDate.length,
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const progressOverTime = Object.entries(progressByDate).map(([date, data]) => ({
    date,
    completed: data.completed,
    total: data.total,
  }));

  const memberStatsMap: Record<string, ProjectMemberStats> = {};
  members.forEach(member => {
    const user = member.users as { id: string; full_name: string; avatar_url: string | null } | null;
    if (user) {
      memberStatsMap[user.id] = {
        userId: user.id,
        userName: user.full_name,
        userAvatar: user.avatar_url,
        tasksAssigned: 0,
        tasksCompleted: 0,
        timeLogged: 0,
        completionRate: 0,
      };
    }
  });

  tasks.forEach(task => {
    if (task.assignee_id && memberStatsMap[task.assignee_id]) {
      memberStatsMap[task.assignee_id].tasksAssigned++;
      if (task.status === 'completed') {
        memberStatsMap[task.assignee_id].tasksCompleted++;
      }
    }
  });

  timeLogs.forEach(log => {
    if (log.user_id && memberStatsMap[log.user_id]) {
      memberStatsMap[log.user_id].timeLogged += log.duration_minutes || 0;
    }
  });

  const memberStats = Object.values(memberStatsMap).map(stat => ({
    ...stat,
    completionRate: stat.tasksAssigned > 0 ? Math.round((stat.tasksCompleted / stat.tasksAssigned) * 100) : 0,
  }));

  const recentActivity = (activityResult.data || [])
    .filter(a => {
      const changes = a.changes as { project_id?: string } | null;
      return changes?.project_id === projectId;
    })
    .slice(0, 10)
    .map(a => ({
      date: a.created_at,
      action: a.action,
      taskTitle: ((a.changes as { title?: string } | null)?.title) || 'Unknown task',
      userName: (a.users as { full_name: string } | null)?.full_name || 'Unknown user',
    }));

  return {
    projectId: projectData.id,
    projectName: projectData.name,
    projectStatus: projectData.status,
    period: dateRange,
    summary: {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      blockedTasks: blockedTasks.length,
      completionPercentage,
      totalTimeLogged,
      estimatedHours,
      timeVariance: estimatedMinutes > 0 ? Math.round(((totalTimeLogged - estimatedMinutes) / estimatedMinutes) * 100) : 0,
      avgTaskCompletionTime: completedTasks.length > 0 ? Math.round(totalTimeLogged / completedTasks.length) : 0,
      daysRemaining,
    },
    taskBreakdown,
    tasksByPriority,
    progressOverTime,
    memberStats,
    recentActivity,
  };
}

export async function fetchTeamOverviewReport(
  filters: ReportFilters
): Promise<TeamOverviewReport> {
  const { dateRange } = filters;
  const startDate = `${dateRange.start}T00:00:00`;
  const endDate = `${dateRange.end}T23:59:59`;

  const [projectsResult, tasksResult, timeLogsResult, usersResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status')
      .is('deleted_at', null),
    supabase
      .from('tasks')
      .select('id, title, status, project_id, assignee_id, completed_at, projects(name)')
      .is('deleted_at', null),
    supabase
      .from('time_logs')
      .select('id, user_id, duration_minutes, task_id')
      .gte('started_at', startDate)
      .lte('started_at', endDate),
    supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .is('deleted_at', null),
  ]);

  const projects = projectsResult.data || [];
  const tasks = tasksResult.data || [];
  const timeLogs = timeLogsResult.data || [];
  const users = usersResult.data || [];

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalTimeLogged = timeLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

  const projectStatsMap: Record<string, { tasks: number; completed: number; time: number }> = {};
  projects.forEach(p => {
    projectStatsMap[p.id] = { tasks: 0, completed: 0, time: 0 };
  });

  tasks.forEach(task => {
    if (projectStatsMap[task.project_id]) {
      projectStatsMap[task.project_id].tasks++;
      if (task.status === 'completed') {
        projectStatsMap[task.project_id].completed++;
      }
    }
  });

  const taskIdToProject: Record<string, string> = {};
  tasks.forEach(task => {
    taskIdToProject[task.id] = task.project_id;
  });

  timeLogs.forEach(log => {
    const projectId = taskIdToProject[log.task_id];
    if (projectId && projectStatsMap[projectId]) {
      projectStatsMap[projectId].time += log.duration_minutes || 0;
    }
  });

  const projectsOverview = projects.map(p => ({
    projectId: p.id,
    projectName: p.name,
    status: p.status,
    completionPercentage: projectStatsMap[p.id].tasks > 0
      ? Math.round((projectStatsMap[p.id].completed / projectStatsMap[p.id].tasks) * 100)
      : 0,
    tasksCompleted: projectStatsMap[p.id].completed,
    totalTasks: projectStatsMap[p.id].tasks,
    timeLogged: projectStatsMap[p.id].time,
  })).sort((a, b) => b.completionPercentage - a.completionPercentage);

  const userStatsMap: Record<string, { tasks: number; completed: number; time: number }> = {};
  users.forEach(u => {
    userStatsMap[u.id] = { tasks: 0, completed: 0, time: 0 };
  });

  tasks.forEach(task => {
    if (task.assignee_id && userStatsMap[task.assignee_id]) {
      userStatsMap[task.assignee_id].tasks++;
      if (task.status === 'completed') {
        userStatsMap[task.assignee_id].completed++;
      }
    }
  });

  timeLogs.forEach(log => {
    if (log.user_id && userStatsMap[log.user_id]) {
      userStatsMap[log.user_id].time += log.duration_minutes || 0;
    }
  });

  const topPerformers = users
    .map(u => ({
      userId: u.id,
      userName: u.full_name,
      userAvatar: u.avatar_url,
      tasksCompleted: userStatsMap[u.id].completed,
      timeLogged: userStatsMap[u.id].time,
      completionRate: userStatsMap[u.id].tasks > 0
        ? Math.round((userStatsMap[u.id].completed / userStatsMap[u.id].tasks) * 100)
        : 0,
    }))
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    .slice(0, 10);

  const taskDistribution = ['todo', 'in_progress', 'review', 'completed', 'blocked'].map(status => ({
    status,
    count: tasks.filter(t => t.status === status).length,
  }));

  const avgCompletionRate = projects.length > 0
    ? Math.round(projectsOverview.reduce((sum, p) => sum + p.completionPercentage, 0) / projects.length)
    : 0;

  return {
    period: dateRange,
    summary: {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      totalTimeLogged,
      avgCompletionRate,
    },
    projectsOverview,
    topPerformers,
    taskDistribution,
  };
}

export async function fetchAvailableUsers(): Promise<{ id: string; full_name: string }[]> {
  const { data } = await supabase
    .from('users')
    .select('id, full_name')
    .is('deleted_at', null)
    .order('full_name');
  return data || [];
}

export async function fetchAvailableProjects(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('projects')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');
  return data || [];
}

export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function generatePrintableReport(title: string, contentHtml: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        h2 { font-size: 18px; margin-top: 32px; margin-bottom: 16px; color: #374151; }
        .subtitle { color: #6b7280; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
        .stat-card { padding: 16px; background: #f9fafb; border-radius: 8px; }
        .stat-label { font-size: 12px; color: #6b7280; }
        .stat-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
