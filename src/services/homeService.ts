import { supabase } from '../lib/supabase';
import type { TaskWithRelations, Project, TimeLog, ActivityLog } from '../types/database';

export interface TodayTasksData {
  dueTodayTasks: TaskWithRelations[];
  overdueTasks: TaskWithRelations[];
  inProgressTasks: TaskWithRelations[];
}

export interface TimeTrackingSummary {
  totalMinutesToday: number;
  activeTimer: (TimeLog & { task?: { id: string; title: string } }) | null;
}

export interface ActiveProjectData {
  id: string;
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
}

export interface NotificationItem {
  id: string;
  type: 'assignment' | 'status_change' | 'deadline' | 'comment';
  title: string;
  description: string;
  timestamp: string;
  taskId?: string;
  projectId?: string;
  read: boolean;
}

function getStartOfDay(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function getEndOfDay(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

export async function fetchTodayTasks(userId: string): Promise<{ data: TodayTasksData | null; error: Error | null }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const { data: allTasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
      project:projects(id, name)
    `)
    .is('deleted_at', null)
    .eq('assignee_id', userId)
    .neq('status', 'completed');

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const dueTodayTasks: TaskWithRelations[] = [];
  const overdueTasks: TaskWithRelations[] = [];
  const inProgressTasks: TaskWithRelations[] = [];

  for (const task of allTasks || []) {
    if (task.status === 'in_progress') {
      inProgressTasks.push(task as TaskWithRelations);
    }

    if (task.due_date) {
      const dueDate = task.due_date.split('T')[0];
      if (dueDate === todayStr) {
        dueTodayTasks.push(task as TaskWithRelations);
      } else if (new Date(task.due_date) < today) {
        overdueTasks.push(task as TaskWithRelations);
      }
    }
  }

  return {
    data: { dueTodayTasks, overdueTasks, inProgressTasks },
    error: null
  };
}

export async function fetchTimeTrackingSummary(userId: string): Promise<{ data: TimeTrackingSummary | null; error: Error | null }> {
  const startOfDay = getStartOfDay();
  const endOfDay = getEndOfDay();

  const { data: todayLogs, error: logsError } = await supabase
    .from('time_logs')
    .select('duration_minutes, started_at, ended_at')
    .eq('user_id', userId)
    .gte('started_at', startOfDay)
    .lte('started_at', endOfDay);

  if (logsError) {
    return { data: null, error: new Error(logsError.message) };
  }

  let totalMinutesToday = 0;
  for (const log of todayLogs || []) {
    if (log.duration_minutes) {
      totalMinutesToday += log.duration_minutes;
    } else if (log.ended_at) {
      const start = new Date(log.started_at);
      const end = new Date(log.ended_at);
      totalMinutesToday += Math.floor((end.getTime() - start.getTime()) / 60000);
    }
  }

  const { data: activeTimerData, error: timerError } = await supabase
    .from('time_logs')
    .select(`
      *,
      task:tasks(id, title)
    `)
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (timerError) {
    return { data: null, error: new Error(timerError.message) };
  }

  return {
    data: {
      totalMinutesToday,
      activeTimer: activeTimerData as TimeTrackingSummary['activeTimer']
    },
    error: null
  };
}

export async function fetchActiveProjects(userId: string): Promise<{ data: ActiveProjectData[] | null; error: Error | null }> {
  const { data: memberProjects, error: memberError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (memberError) {
    return { data: null, error: new Error(memberError.message) };
  }

  const { data: ownedProjects, error: ownedError } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId)
    .is('deleted_at', null);

  if (ownedError) {
    return { data: null, error: new Error(ownedError.message) };
  }

  const projectIds = new Set<string>();
  memberProjects?.forEach(m => projectIds.add(m.project_id));
  ownedProjects?.forEach(p => projectIds.add(p.id));

  if (projectIds.size === 0) {
    return { data: [], error: null };
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status')
    .in('id', Array.from(projectIds))
    .eq('status', 'active')
    .is('deleted_at', null)
    .limit(5);

  if (projectsError) {
    return { data: null, error: new Error(projectsError.message) };
  }

  const projectData: ActiveProjectData[] = [];

  for (const project of projects || []) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', project.id)
      .is('deleted_at', null);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;

    projectData.push({
      id: project.id,
      name: project.name,
      status: project.status,
      totalTasks,
      completedTasks,
      inProgressTasks
    });
  }

  return { data: projectData, error: null };
}

export async function fetchNotifications(userId: string): Promise<{ data: NotificationItem[] | null; error: Error | null }> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: activities, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user:users(id, full_name)
    `)
    .or(`entity_type.eq.task,entity_type.eq.project`)
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const notifications: NotificationItem[] = [];

  for (const activity of activities || []) {
    const changes = activity.changes as Record<string, unknown>;
    let notification: NotificationItem | null = null;

    if (activity.action === 'updated' && changes?.new) {
      const newData = changes.new as Record<string, unknown>;
      const oldData = changes.old as Record<string, unknown>;

      if (newData.assignee_id === userId && oldData?.assignee_id !== userId) {
        notification = {
          id: activity.id,
          type: 'assignment',
          title: 'Task assigned to you',
          description: `You were assigned to "${newData.title || 'a task'}"`,
          timestamp: activity.created_at,
          taskId: activity.entity_id,
          read: false
        };
      } else if (newData.status !== oldData?.status) {
        notification = {
          id: activity.id,
          type: 'status_change',
          title: 'Task status changed',
          description: `"${newData.title}" moved to ${newData.status}`,
          timestamp: activity.created_at,
          taskId: activity.entity_id,
          read: false
        };
      }
    } else if (activity.action === 'comment_added') {
      notification = {
        id: activity.id,
        type: 'comment',
        title: 'New comment',
        description: 'A comment was added to a task you follow',
        timestamp: activity.created_at,
        taskId: activity.entity_id,
        read: false
      };
    }

    if (notification) {
      notifications.push(notification);
    }
  }

  const { data: upcomingTasks, error: upcomingError } = await supabase
    .from('tasks')
    .select('id, title, due_date')
    .eq('assignee_id', userId)
    .neq('status', 'completed')
    .is('deleted_at', null)
    .not('due_date', 'is', null)
    .gte('due_date', new Date().toISOString())
    .lte('due_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
    .order('due_date', { ascending: true })
    .limit(5);

  if (!upcomingError && upcomingTasks) {
    for (const task of upcomingTasks) {
      const dueDate = new Date(task.due_date!);
      const today = new Date();
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      notifications.push({
        id: `deadline-${task.id}`,
        type: 'deadline',
        title: 'Upcoming deadline',
        description: `"${task.title}" is due ${diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`}`,
        timestamp: new Date().toISOString(),
        taskId: task.id,
        read: false
      });
    }
  }

  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { data: notifications.slice(0, 10), error: null };
}

export async function startTimer(taskId: string, userId: string) {
  const { data: existingTimer } = await supabase
    .from('time_logs')
    .select('id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();

  if (existingTimer) {
    await supabase
      .from('time_logs')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', existingTimer.id);
  }

  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      task_id: taskId,
      user_id: userId,
      started_at: new Date().toISOString()
    })
    .select(`*, task:tasks(id, title)`)
    .single();

  return { data, error };
}

export async function stopTimer(timeLogId: string, description?: string) {
  const { data, error } = await supabase
    .from('time_logs')
    .update({
      ended_at: new Date().toISOString(),
      description: description || ''
    })
    .eq('id', timeLogId)
    .select()
    .single();

  return { data, error };
}
