/*
  # Fix RLS Infinite Recursion

  This migration fixes the infinite recursion error in RLS policies by:
  1. Creating SECURITY DEFINER helper functions that bypass RLS
  2. Updating all policies to use these helper functions instead of direct subqueries

  ## Changes:
  - Create helper function `is_project_member(project_id, user_id)` 
  - Create helper function `is_project_admin(project_id, user_id)`
  - Create helper function `get_user_project_ids(user_id)`
  - Update all policies on project_members, projects, tasks, issues, notes, time_logs, documents

  ## Security:
  - Functions use SECURITY DEFINER to bypass RLS during checks
  - Functions only return boolean or IDs, no sensitive data exposed
  - All policies remain restrictive and ownership-based
*/

-- ============================================
-- Create helper functions with SECURITY DEFINER
-- ============================================

CREATE OR REPLACE FUNCTION auth_is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects 
    WHERE id = p_project_id 
    AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION auth_is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = p_project_id 
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION auth_is_project_admin(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = p_project_id 
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION auth_user_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM projects WHERE owner_id = auth.uid()
  UNION
  SELECT project_id FROM project_members WHERE user_id = auth.uid();
$$;

-- ============================================
-- Drop existing policies on project_members
-- ============================================

DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners/admins can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners/admins can update members" ON project_members;
DROP POLICY IF EXISTS "Project owners/admins can remove members" ON project_members;

-- ============================================
-- Create new policies on project_members using helper functions
-- ============================================

CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    auth_is_project_owner(project_id) OR auth_is_project_member(project_id)
  );

CREATE POLICY "Admins can add project members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_project_owner(project_id) OR auth_is_project_admin(project_id)
  );

CREATE POLICY "Admins can update project members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (auth_is_project_owner(project_id) OR auth_is_project_admin(project_id))
  WITH CHECK (auth_is_project_owner(project_id) OR auth_is_project_admin(project_id));

CREATE POLICY "Admins can remove project members"
  ON project_members FOR DELETE
  TO authenticated
  USING (auth_is_project_owner(project_id) OR auth_is_project_admin(project_id));

-- ============================================
-- Drop and recreate projects policies
-- ============================================

DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Project owners and admins can update projects" ON projects;

CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND (owner_id = auth.uid() OR id IN (SELECT auth_user_project_ids())))
    OR (deleted_at IS NOT NULL AND owner_id = auth.uid())
  );

CREATE POLICY "Owners and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR auth_is_project_admin(id))
  WITH CHECK (owner_id = auth.uid() OR auth_is_project_admin(id));

-- ============================================
-- Drop and recreate tasks policies
-- ============================================

DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Task assignees and project admins can update tasks" ON tasks;
DROP POLICY IF EXISTS "Task creators and project admins can delete tasks" ON tasks;

CREATE POLICY "Users can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND project_id IN (SELECT auth_user_project_ids()))
    OR (deleted_at IS NOT NULL AND (created_by = auth.uid() OR assignee_id = auth.uid()))
  );

CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT auth_user_project_ids()));

CREATE POLICY "Assignees and admins can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assignee_id = auth.uid() 
    OR created_by = auth.uid() 
    OR auth_is_project_owner(project_id) 
    OR auth_is_project_admin(project_id)
  )
  WITH CHECK (
    assignee_id = auth.uid() 
    OR created_by = auth.uid() 
    OR auth_is_project_owner(project_id) 
    OR auth_is_project_admin(project_id)
  );

CREATE POLICY "Creators and admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR auth_is_project_owner(project_id) 
    OR auth_is_project_admin(project_id)
  );

-- ============================================
-- Drop and recreate issues policies
-- ============================================

DROP POLICY IF EXISTS "Users can view issues" ON issues;

CREATE POLICY "Users can view issues"
  ON issues FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND project_id IN (SELECT auth_user_project_ids()))
    OR (deleted_at IS NOT NULL AND reported_by = auth.uid())
  );

-- ============================================
-- Drop and recreate notes policies
-- ============================================

DROP POLICY IF EXISTS "Users can view notes" ON notes;

CREATE POLICY "Users can view notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND (
      created_by = auth.uid()
      OR project_id IN (SELECT auth_user_project_ids())
    ))
    OR (deleted_at IS NOT NULL AND created_by = auth.uid())
  );

-- ============================================
-- Drop and recreate time_logs policies
-- ============================================

DROP POLICY IF EXISTS "Users can view time logs" ON time_logs;

CREATE POLICY "Users can view time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = time_logs.task_id 
      AND (auth_is_project_owner(t.project_id) OR auth_is_project_admin(t.project_id))
    )
  );

-- ============================================
-- Drop and recreate reports policies
-- ============================================

DROP POLICY IF EXISTS "Users can view reports in their projects" ON reports;

CREATE POLICY "Users can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND (
      created_by = auth.uid()
      OR project_id IN (SELECT auth_user_project_ids())
    ))
    OR (deleted_at IS NOT NULL AND created_by = auth.uid())
  );

-- ============================================
-- Drop and recreate task_comments policies
-- ============================================

DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;

CREATE POLICY "Users can view task comments"
  ON task_comments FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t 
      WHERE t.project_id IN (SELECT auth_user_project_ids())
    )
  );

-- ============================================
-- Drop and recreate task_dependencies policies
-- ============================================

DROP POLICY IF EXISTS "Users can view task dependencies" ON task_dependencies;

CREATE POLICY "Users can view task dependencies"
  ON task_dependencies FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t 
      WHERE t.project_id IN (SELECT auth_user_project_ids())
    )
  );

-- ============================================
-- Drop and recreate activity_logs policies
-- ============================================

DROP POLICY IF EXISTS "Users can view activity for their projects" ON activity_logs;

CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (entity_type = 'project' AND entity_id::uuid IN (SELECT auth_user_project_ids()))
    OR (entity_type = 'task' AND entity_id::uuid IN (
        SELECT t.id FROM tasks t WHERE t.project_id IN (SELECT auth_user_project_ids())
    ))
  );

-- ============================================
-- Drop and recreate issue_comments policies
-- ============================================

DROP POLICY IF EXISTS "Users can view issue comments" ON issue_comments;

CREATE POLICY "Users can view issue comments"
  ON issue_comments FOR SELECT
  TO authenticated
  USING (
    issue_id IN (
      SELECT i.id FROM issues i 
      WHERE i.project_id IN (SELECT auth_user_project_ids())
    )
  );

-- ============================================
-- Drop and recreate issue_activity_logs policies
-- ============================================

DROP POLICY IF EXISTS "Users can view issue activity" ON issue_activity_logs;

CREATE POLICY "Users can view issue activity"
  ON issue_activity_logs FOR SELECT
  TO authenticated
  USING (
    issue_id IN (
      SELECT i.id FROM issues i 
      WHERE i.project_id IN (SELECT auth_user_project_ids())
    )
  );