/*
  # Security and Performance Fixes

  1. Missing Index
    - Add index on `task_statuses.created_by` for foreign key performance

  2. RLS Policy Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in 17 policies across 10 tables
      to prevent per-row re-evaluation and improve query performance at scale
    - Tables affected: users, projects, tasks, time_logs, notes, issues, reports,
      activity_logs, task_statuses, calculation_history

  3. Duplicate Policy Consolidation
    - Remove redundant permissive SELECT policies on 6 tables:
      activity_logs, issue_activity_logs, issue_comments, reports,
      task_comments, task_dependencies

  4. Helper Function Optimization
    - Update `auth_user_project_ids`, `auth_is_project_admin`, `auth_is_project_owner`
      to use `(select auth.uid())` internally

  5. Function Search Path
    - Fix mutable search_path on `update_task_statuses_updated_at`

  6. Unused Indexes
    - Drop unused indexes across all tables to reduce write overhead
*/

-- =============================================================================
-- PART 1: Add missing foreign key index
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_task_statuses_created_by
  ON task_statuses(created_by);

-- =============================================================================
-- PART 2: Fix helper functions to use (select auth.uid())
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_user_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT id FROM projects WHERE owner_id = (select auth.uid())
  UNION
  SELECT project_id FROM project_members WHERE user_id = (select auth.uid());
$$;

CREATE OR REPLACE FUNCTION auth_is_project_admin(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = (select auth.uid())
    AND role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION auth_is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND owner_id = (select auth.uid())
  );
$$;

-- =============================================================================
-- PART 3: Fix mutable search_path on trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_task_statuses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PART 4: Optimize RLS policies - replace auth.uid() with (select auth.uid())
-- =============================================================================

-- users: "Users can view users"
ALTER POLICY "Users can view users" ON users
  USING (
    (id = (select auth.uid()))
    OR (id IN (
      SELECT pm.user_id FROM project_members pm
      WHERE pm.project_id IN (SELECT auth_user_project_ids())
    ))
  );

-- projects: "Users can view projects"
ALTER POLICY "Users can view projects" ON projects
  USING (
    ((deleted_at IS NULL) AND (
      (owner_id = (select auth.uid()))
      OR (id IN (SELECT auth_user_project_ids()))
    ))
    OR ((deleted_at IS NOT NULL) AND (owner_id = (select auth.uid())))
  );

-- projects: "Owners and admins can update projects"
ALTER POLICY "Owners and admins can update projects" ON projects
  USING ((owner_id = (select auth.uid())) OR auth_is_project_admin(id))
  WITH CHECK ((owner_id = (select auth.uid())) OR auth_is_project_admin(id));

-- tasks: "Users can view tasks"
ALTER POLICY "Users can view tasks" ON tasks
  USING (
    ((deleted_at IS NULL) AND (project_id IN (SELECT auth_user_project_ids())))
    OR ((deleted_at IS NOT NULL) AND (
      (created_by = (select auth.uid()))
      OR (assignee_id = (select auth.uid()))
    ))
  );

-- tasks: "Assignees and admins can update tasks"
ALTER POLICY "Assignees and admins can update tasks" ON tasks
  USING (
    (assignee_id = (select auth.uid()))
    OR (created_by = (select auth.uid()))
    OR auth_is_project_owner(project_id)
    OR auth_is_project_admin(project_id)
  )
  WITH CHECK (
    (assignee_id = (select auth.uid()))
    OR (created_by = (select auth.uid()))
    OR auth_is_project_owner(project_id)
    OR auth_is_project_admin(project_id)
  );

-- tasks: "Creators and admins can delete tasks"
ALTER POLICY "Creators and admins can delete tasks" ON tasks
  USING (
    (created_by = (select auth.uid()))
    OR auth_is_project_owner(project_id)
    OR auth_is_project_admin(project_id)
  );

-- time_logs: "Users can view time logs"
ALTER POLICY "Users can view time logs" ON time_logs
  USING (
    (user_id = (select auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = time_logs.task_id
      AND (auth_is_project_owner(t.project_id) OR auth_is_project_admin(t.project_id))
    ))
  );

-- notes: "Users can view notes"
ALTER POLICY "Users can view notes" ON notes
  USING (
    ((deleted_at IS NULL) AND (
      (created_by = (select auth.uid()))
      OR (project_id IN (SELECT auth_user_project_ids()))
    ))
    OR ((deleted_at IS NOT NULL) AND (created_by = (select auth.uid())))
  );

-- issues: "Users can view issues"
ALTER POLICY "Users can view issues" ON issues
  USING (
    (deleted_at IS NULL) AND (
      (reported_by = (select auth.uid()))
      OR (assigned_to = (select auth.uid()))
      OR (project_id IN (SELECT auth_user_project_ids()))
    )
  );

-- reports: "Users can view reports"
ALTER POLICY "Users can view reports" ON reports
  USING (
    ((deleted_at IS NULL) AND (
      (created_by = (select auth.uid()))
      OR (project_id IN (SELECT auth_user_project_ids()))
    ))
    OR ((deleted_at IS NOT NULL) AND (created_by = (select auth.uid())))
  );

-- activity_logs: "Users can view activity logs"
ALTER POLICY "Users can view activity logs" ON activity_logs
  USING (
    (user_id = (select auth.uid()))
    OR ((entity_type = 'project') AND (entity_id IN (SELECT auth_user_project_ids())))
    OR ((entity_type = 'task') AND (entity_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (SELECT auth_user_project_ids())
    )))
  );

-- task_statuses: "Authenticated users can create statuses"
ALTER POLICY "Authenticated users can create statuses" ON task_statuses
  WITH CHECK ((select auth.uid()) = created_by);

-- task_statuses: "Users can delete their own non-default statuses"
ALTER POLICY "Users can delete their own non-default statuses" ON task_statuses
  USING (((select auth.uid()) = created_by) AND (is_default = false));

-- task_statuses: "Users can update their own non-default statuses"
ALTER POLICY "Users can update their own non-default statuses" ON task_statuses
  USING (((select auth.uid()) = created_by) AND (is_default = false))
  WITH CHECK (((select auth.uid()) = created_by) AND (is_default = false));

-- calculation_history: "Users can view own calculation history"
ALTER POLICY "Users can view own calculation history" ON calculation_history
  USING ((select auth.uid()) = user_id);

-- calculation_history: "Users can insert own calculation history"
ALTER POLICY "Users can insert own calculation history" ON calculation_history
  WITH CHECK ((select auth.uid()) = user_id);

-- calculation_history: "Users can delete own calculation history"
ALTER POLICY "Users can delete own calculation history" ON calculation_history
  USING ((select auth.uid()) = user_id);

-- =============================================================================
-- PART 5: Consolidate duplicate permissive SELECT policies
-- =============================================================================

-- activity_logs: drop redundant policy, keep the optimized one above
DROP POLICY IF EXISTS "Users can view activity logs for their entities" ON activity_logs;

-- issue_activity_logs: drop overly permissive policy (allows viewing any non-deleted issue activity),
-- keep project-membership based policy
DROP POLICY IF EXISTS "Users can view activity on accessible issues" ON issue_activity_logs;

-- issue_comments: drop overly permissive policy, keep project-membership based policy
DROP POLICY IF EXISTS "Users can view comments on accessible issues" ON issue_comments;

-- reports: drop redundant "own reports" policy (subsumed by "view reports" which includes own + project)
DROP POLICY IF EXISTS "Users can view own reports" ON reports;

-- task_comments: drop redundant policy, keep auth_user_project_ids based policy
DROP POLICY IF EXISTS "Users can view comments on tasks in their projects" ON task_comments;

-- task_dependencies: drop redundant policy, keep auth_user_project_ids based policy
DROP POLICY IF EXISTS "Users can view dependencies in their projects" ON task_dependencies;

-- =============================================================================
-- PART 6: Drop unused indexes
-- =============================================================================

-- users
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_deleted;
DROP INDEX IF EXISTS idx_users_deleted_by;

-- projects
DROP INDEX IF EXISTS idx_projects_owner;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_deleted;
DROP INDEX IF EXISTS idx_projects_deleted_by;

-- project_members
DROP INDEX IF EXISTS idx_project_members_project;
DROP INDEX IF EXISTS idx_project_members_user;

-- tasks
DROP INDEX IF EXISTS idx_tasks_project;
DROP INDEX IF EXISTS idx_tasks_assignee;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_priority;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_deleted;
DROP INDEX IF EXISTS idx_tasks_project_status;
DROP INDEX IF EXISTS idx_tasks_tags;
DROP INDEX IF EXISTS idx_tasks_created_by;
DROP INDEX IF EXISTS idx_tasks_deleted_by;
DROP INDEX IF EXISTS idx_tasks_status_id;

-- task_dependencies
DROP INDEX IF EXISTS idx_task_deps_task;
DROP INDEX IF EXISTS idx_task_deps_depends_on;
DROP INDEX IF EXISTS idx_task_dependencies_created_by;

-- task_comments
DROP INDEX IF EXISTS idx_task_comments_task;
DROP INDEX IF EXISTS idx_task_comments_user;
DROP INDEX IF EXISTS idx_task_comments_created;
DROP INDEX IF EXISTS idx_task_comments_deleted_by;

-- task_statuses
DROP INDEX IF EXISTS idx_task_statuses_sort_order;

-- time_logs
DROP INDEX IF EXISTS idx_time_logs_user;
DROP INDEX IF EXISTS idx_time_logs_task;
DROP INDEX IF EXISTS idx_time_logs_started;
DROP INDEX IF EXISTS idx_time_logs_user_date;

-- notes
DROP INDEX IF EXISTS idx_notes_project;
DROP INDEX IF EXISTS idx_notes_task;
DROP INDEX IF EXISTS idx_notes_created_by;
DROP INDEX IF EXISTS idx_notes_deleted;
DROP INDEX IF EXISTS idx_notes_deleted_by;

-- issues
DROP INDEX IF EXISTS idx_issues_project;
DROP INDEX IF EXISTS idx_issues_task;
DROP INDEX IF EXISTS idx_issues_status;
DROP INDEX IF EXISTS idx_issues_severity;
DROP INDEX IF EXISTS idx_issues_assigned;
DROP INDEX IF EXISTS idx_issues_deleted;
DROP INDEX IF EXISTS idx_issues_deleted_by;
DROP INDEX IF EXISTS idx_issues_reported_by;

-- reports
DROP INDEX IF EXISTS idx_reports_project;
DROP INDEX IF EXISTS idx_reports_type;
DROP INDEX IF EXISTS idx_reports_created_by;
DROP INDEX IF EXISTS idx_reports_deleted;
DROP INDEX IF EXISTS idx_reports_deleted_by;

-- activity_logs
DROP INDEX IF EXISTS idx_activity_entity;
DROP INDEX IF EXISTS idx_activity_user;
DROP INDEX IF EXISTS idx_activity_created;
DROP INDEX IF EXISTS idx_activity_action;

-- documents
DROP INDEX IF EXISTS idx_documents_author_id;
DROP INDEX IF EXISTS idx_documents_category_id;
DROP INDEX IF EXISTS idx_documents_type;
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_is_pinned;
DROP INDEX IF EXISTS idx_documents_project_id;
DROP INDEX IF EXISTS idx_documents_task_id;
DROP INDEX IF EXISTS idx_documents_created_at;
DROP INDEX IF EXISTS idx_documents_issue_id;
DROP INDEX IF EXISTS idx_documents_pinned_by;
DROP INDEX IF EXISTS idx_documents_deleted_by;

-- document_comments
DROP INDEX IF EXISTS idx_document_comments_document_id;
DROP INDEX IF EXISTS idx_document_comments_deleted_by;
DROP INDEX IF EXISTS idx_document_comments_parent_id;
DROP INDEX IF EXISTS idx_document_comments_user_id;

-- document_tag_relations
DROP INDEX IF EXISTS idx_document_tag_relations_document_id;
DROP INDEX IF EXISTS idx_document_tag_relations_tag_id;

-- document_attachments
DROP INDEX IF EXISTS idx_document_attachments_document_id;
DROP INDEX IF EXISTS idx_document_attachments_uploaded_by;

-- document_categories
DROP INDEX IF EXISTS idx_document_categories_parent_id;

-- issue_activity_logs
DROP INDEX IF EXISTS idx_issue_activity_logs_user_id;
DROP INDEX IF EXISTS idx_issue_activity_logs_issue_id;
DROP INDEX IF EXISTS idx_issue_activity_logs_created_at;

-- issue_comments
DROP INDEX IF EXISTS idx_issue_comments_deleted_by;
DROP INDEX IF EXISTS idx_issue_comments_issue_id;
DROP INDEX IF EXISTS idx_issue_comments_user_id;

-- system_settings
DROP INDEX IF EXISTS idx_system_settings_key;
DROP INDEX IF EXISTS idx_system_settings_updated_by;

-- calculation_history
DROP INDEX IF EXISTS idx_calculation_history_user_id;
DROP INDEX IF EXISTS idx_calculation_history_created_at;