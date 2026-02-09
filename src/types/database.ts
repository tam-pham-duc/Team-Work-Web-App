export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ReportType = 'project_summary' | 'time_report' | 'task_analysis' | 'team_performance' | 'custom';

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          permissions: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          permissions?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          permissions?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string | null;
          role_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: ProjectStatus;
          owner_id: string;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: ProjectStatus;
          owner_id: string;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: ProjectStatus;
          owner_id?: string;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: ProjectRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: ProjectRole;
          joined_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: ProjectRole;
          joined_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          status_id: string | null;
          priority: TaskPriority;
          project_id: string;
          assignee_id: string | null;
          created_by: string;
          due_date: string | null;
          estimated_hours: number | null;
          completed_at: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          status_id?: string | null;
          priority?: TaskPriority;
          project_id: string;
          assignee_id?: string | null;
          created_by: string;
          due_date?: string | null;
          estimated_hours?: number | null;
          completed_at?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          status_id?: string | null;
          priority?: TaskPriority;
          project_id?: string;
          assignee_id?: string | null;
          created_by?: string;
          due_date?: string | null;
          estimated_hours?: number | null;
          completed_at?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      task_dependencies: {
        Row: {
          id: string;
          task_id: string;
          depends_on_id: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          depends_on_id: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          depends_on_id?: string;
          created_at?: string;
          created_by?: string | null;
        };
      };
      time_logs: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          description: string | null;
          started_at: string;
          ended_at: string | null;
          duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          description?: string | null;
          started_at: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          description?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          project_id: string | null;
          task_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      issues: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: IssueStatus;
          severity: IssueSeverity;
          project_id: string | null;
          task_id: string | null;
          reported_by: string;
          assigned_to: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: IssueStatus;
          severity?: IssueSeverity;
          project_id?: string | null;
          task_id?: string | null;
          reported_by: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: IssueStatus;
          severity?: IssueSeverity;
          project_id?: string | null;
          task_id?: string | null;
          reported_by?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      reports: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: ReportType;
          filters: Record<string, unknown>;
          project_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          type?: ReportType;
          filters?: Record<string, unknown>;
          project_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?: ReportType;
          filters?: Record<string, unknown>;
          project_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          changes: Record<string, unknown>;
          user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          action: string;
          changes?: Record<string, unknown>;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          changes?: Record<string, unknown>;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Enums: {
      project_status: ProjectStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      issue_status: IssueStatus;
      issue_severity: IssueSeverity;
      project_role: ProjectRole;
      report_type: ReportType;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type User = Tables<'users'>;
export type Role = Tables<'roles'>;
export type Project = Tables<'projects'>;
export type ProjectMember = Tables<'project_members'>;
export type Task = Tables<'tasks'>;
export type TaskDependency = Tables<'task_dependencies'>;
export type TimeLog = Tables<'time_logs'>;
export type Note = Tables<'notes'>;
export type Issue = Tables<'issues'>;
export type Report = Tables<'reports'>;
export type ActivityLog = Tables<'activity_logs'>;

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export type UserWithRole = User & { role: Role | null };

export type TaskWithRelations = Task & {
  assignee?: User | null;
  project?: Project | null;
  dependencies?: TaskDependency[];
  dependents?: TaskDependency[];
};

export type TaskCommentWithUser = TaskComment & {
  user: User;
};

export type ProjectMemberWithUser = ProjectMember & {
  user: User;
};

export type ProjectWithRelations = Project & {
  owner?: User | null;
  members?: ProjectMemberWithUser[];
  tasks?: Task[];
};

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  completionPercentage: number;
  totalTimeLogged: number;
  timeByMember: { userId: string; userName: string; minutes: number }[];
}

export type DocumentType = 'note' | 'post' | 'spec' | 'discussion';
export type DocumentStatus = 'draft' | 'published' | 'archived';

export interface DocumentCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  type: DocumentType;
  status: DocumentStatus;
  category_id: string | null;
  author_id: string;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by: string | null;
  view_count: number;
  project_id: string | null;
  task_id: string | null;
  issue_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface DocumentTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

export interface DocumentTagRelation {
  id: string;
  document_id: string;
  tag_id: string;
  created_at: string;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface DocumentAttachment {
  id: string;
  document_id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export type DocumentWithRelations = Document & {
  author?: User | null;
  category?: DocumentCategory | null;
  tags?: DocumentTag[];
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
  issue?: { id: string; title: string } | null;
};

export type DocumentCommentWithUser = DocumentComment & {
  user: User;
  replies?: DocumentCommentWithUser[];
};

export interface IssueComment {
  id: string;
  issue_id: string;
  user_id: string;
  content: string;
  is_resolution_note: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface IssueActivityLog {
  id: string;
  issue_id: string;
  user_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type IssueWithRelations = Issue & {
  reporter?: User | null;
  assignee?: User | null;
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
};

export type IssueCommentWithUser = IssueComment & {
  user: User;
};

export type IssueActivityLogWithUser = IssueActivityLog & {
  user?: User | null;
};

export type TrashEntityType = 'task' | 'project' | 'document' | 'issue';

export interface TrashItem {
  id: string;
  entity_type: TrashEntityType;
  entity_id: string;
  title: string;
  description: string | null;
  deleted_at: string;
  deleted_by: string | null;
  deleter?: User | null;
  metadata: {
    project_name?: string;
    project_id?: string;
    status?: string;
    priority?: string;
    severity?: string;
  };
}

export interface RetentionSettings {
  days: number;
}

export interface TaskStatusRecord {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  is_completed_state: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalculationHistory {
  id: string;
  user_id: string;
  expression: string;
  result: string;
  created_at: string;
}
