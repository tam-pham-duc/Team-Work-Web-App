/*
  # Team Productivity Application - Initial Schema

  ## Overview
  Complete database schema for internal team productivity web application.

  ## New Tables
  1. `roles` - User roles for role-based access control
     - `id` (uuid, primary key)
     - `name` (text, unique) - Role name (admin, manager, member, viewer)
     - `description` (text) - Role description
     - `permissions` (jsonb) - Granular permissions

  2. `users` - Extended user profiles linked to auth.users
     - `id` (uuid, primary key, references auth.users)
     - `email` (text, unique)
     - `full_name` (text)
     - `avatar_url` (text)
     - `role_id` (uuid, FK to roles)
     - Soft delete support

  3. `projects` - Project containers for tasks
     - `id` (uuid, primary key)
     - `name`, `description`, `status`
     - `owner_id` (FK to users)
     - Date range fields
     - Soft delete support

  4. `project_members` - Users assigned to projects
     - Junction table with project-level roles
     - Unique constraint on (project_id, user_id)

  5. `tasks` - Core task entity
     - `id` (uuid, primary key)
     - `title`, `description`, `status`, `priority`
     - `project_id` (FK to projects)
     - `assignee_id`, `created_by` (FK to users)
     - Soft delete support

  6. `task_dependencies` - Self-referencing many-to-many
     - Tracks prerequisite relationships between tasks
     - Unique constraint prevents duplicates

  7. `time_logs` - Time tracking entries
     - Belongs to user and task
     - Tracks start/end times and duration

  8. `notes` - Team space notes
     - Can link to projects or tasks (optional)
     - Soft delete support

  9. `issues` - Bug/issue tracking
     - Severity and status tracking
     - Can link to projects or tasks
     - Soft delete support

  10. `reports` - Saved report configurations
      - Stores filters as JSONB for flexible querying
      - Soft delete support

  11. `activity_logs` - Audit trail
      - Tracks all entity changes
      - Stores old/new values as JSONB

  ## Security
  - RLS enabled on all tables
  - Policies restrict access to authenticated users
  - Users can only access data they own or are members of

  ## Indexes
  - Foreign key columns indexed for join performance
  - Composite indexes for common query patterns
  - Partial indexes exclude soft-deleted records
*/

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'completed', 'archived');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'blocked');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');
CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE project_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE report_type AS ENUM ('project_summary', 'time_report', 'task_analysis', 'team_performance', 'custom');

-- ============================================
-- ROLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full system access', '{"all": true}'),
  ('manager', 'Can manage projects and team members', '{"projects": {"create": true, "update": true, "delete": true}, "tasks": {"create": true, "update": true, "delete": true, "assign": true}, "members": {"invite": true, "remove": true}}'),
  ('member', 'Standard team member', '{"projects": {"read": true}, "tasks": {"create": true, "update": true}, "time_logs": {"create": true, "update": true}}'),
  ('viewer', 'Read-only access', '{"projects": {"read": true}, "tasks": {"read": true}, "reports": {"read": true}}');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_role ON users(role_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- PROJECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  status project_status DEFAULT 'active',
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_projects_owner ON projects(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- PROJECT MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role project_role DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ============================================
-- TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  due_date timestamptz,
  estimated_hours numeric(6,2),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;
CREATE INDEX idx_tasks_deleted ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status) WHERE deleted_at IS NULL;

-- ============================================
-- TASK DEPENDENCIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT unique_dependency UNIQUE (task_id, depends_on_id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_id)
);

CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends_on ON task_dependencies(depends_on_id);

-- ============================================
-- TIME LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  description text DEFAULT '',
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 
      ELSE NULL 
    END
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_time_logs_user ON time_logs(user_id);
CREATE INDEX idx_time_logs_task ON time_logs(task_id);
CREATE INDEX idx_time_logs_started ON time_logs(started_at);
CREATE INDEX idx_time_logs_user_date ON time_logs(user_id, started_at);

-- ============================================
-- NOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text DEFAULT '',
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notes_project ON notes(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_task ON notes(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_created_by ON notes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_deleted ON notes(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- ISSUES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status issue_status DEFAULT 'open',
  severity issue_severity DEFAULT 'medium',
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  reported_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_issues_project ON issues(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_task ON issues(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_status ON issues(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_severity ON issues(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_assigned ON issues(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_deleted ON issues(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- REPORTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  type report_type DEFAULT 'custom',
  filters jsonb DEFAULT '{}',
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reports_project ON reports(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_type ON reports(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_created_by ON reports(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_deleted ON reports(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  changes jsonb DEFAULT '{}',
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);
CREATE INDEX idx_activity_action ON activity_logs(action);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: ROLES (Read-only for authenticated)
-- ============================================

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- RLS POLICIES: USERS
-- ============================================

CREATE POLICY "Users can view other users in same projects"
  ON users FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members pm1
        JOIN project_members pm2 ON pm1.project_id = pm2.project_id
        WHERE pm1.user_id = auth.uid() AND pm2.user_id = users.id
      )
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================
-- RLS POLICIES: PROJECTS
-- ============================================

CREATE POLICY "Users can view projects they belong to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = projects.id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = projects.id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project owners can soft delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================
-- RLS POLICIES: PROJECT MEMBERS
-- ============================================

CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners/admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project owners/admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project owners/admins can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- RLS POLICIES: TASKS
-- ============================================

CREATE POLICY "Users can view tasks in their projects"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Task assignees and project admins can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      assignee_id = auth.uid() OR
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = tasks.project_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    assignee_id = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Task creators and project admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- RLS POLICIES: TASK DEPENDENCIES
-- ============================================

CREATE POLICY "Users can view dependencies in their projects"
  ON task_dependencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create dependencies"
  ON task_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete dependencies"
  ON task_dependencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_id AND pm.user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES: TIME LOGS
-- ============================================

CREATE POLICY "Users can view own time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Project admins can view all time logs for their projects"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = time_logs.task_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can create own time logs"
  ON time_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own time logs"
  ON time_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own time logs"
  ON time_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES: NOTES
-- ============================================

CREATE POLICY "Users can view notes in their projects"
  ON notes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      created_by = auth.uid() OR
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = notes.project_id AND user_id = auth.uid()
      )) OR
      (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM tasks t
        JOIN project_members pm ON pm.project_id = t.project_id
        WHERE t.id = notes.task_id AND pm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Note creators can update their notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Note creators can delete their notes"
  ON notes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- RLS POLICIES: ISSUES
-- ============================================

CREATE POLICY "Users can view issues in their projects"
  ON issues FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      reported_by = auth.uid() OR
      assigned_to = auth.uid() OR
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = issues.project_id AND user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create issues"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Issue reporters and assignees can update issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      reported_by = auth.uid() OR
      assigned_to = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = issues.project_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    reported_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = issues.project_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Issue reporters can delete issues"
  ON issues FOR DELETE
  TO authenticated
  USING (reported_by = auth.uid());

-- ============================================
-- RLS POLICIES: REPORTS
-- ============================================

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      created_by = auth.uid() OR
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = reports.project_id AND user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Report creators can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Report creators can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- RLS POLICIES: ACTIVITY LOGS
-- ============================================

CREATE POLICY "Users can view activity logs for their entities"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (entity_type = 'project' AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = entity_id AND user_id = auth.uid()
    )) OR
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = entity_id AND pm.user_id = auth.uid()
    ))
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTION: UPDATE TIMESTAMP
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_time_logs_updated_at
  BEFORE UPDATE ON time_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
