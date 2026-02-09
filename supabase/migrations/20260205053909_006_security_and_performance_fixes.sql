/*
  # Security and Performance Fixes

  This migration addresses multiple security and performance issues identified in the database.

  ## 1. Unindexed Foreign Keys
  Adding indexes to 22 foreign key columns that were missing indexes, which improves JOIN performance.

  Tables affected:
  - document_attachments (document_id, uploaded_by)
  - document_categories (parent_id)
  - document_comments (deleted_by, parent_id, user_id)
  - documents (deleted_by, issue_id, pinned_by)
  - issue_activity_logs (user_id)
  - issue_comments (deleted_by)
  - issues (deleted_by, reported_by)
  - notes (deleted_by)
  - projects (deleted_by)
  - reports (deleted_by)
  - system_settings (updated_by)
  - task_comments (deleted_by)
  - task_dependencies (created_by)
  - tasks (created_by, deleted_by)
  - users (deleted_by)

  ## 2. RLS Policy Optimization
  All RLS policies are updated to use `(select auth.uid())` instead of `auth.uid()` directly.
  This prevents re-evaluation of the auth function for each row, significantly improving query performance at scale.

  ## 3. Function Search Path Security
  Functions are updated with immutable search_path to prevent search path manipulation attacks.

  ## 4. Overly Permissive RLS Policies
  Fixed INSERT policies that were too permissive (always true WITH CHECK clauses).
*/

-- ============================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_document_attachments_document_id ON document_attachments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_attachments_uploaded_by ON document_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_categories_parent_id ON document_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_deleted_by ON document_comments(deleted_by);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON document_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_by ON documents(deleted_by);
CREATE INDEX IF NOT EXISTS idx_documents_issue_id ON documents(issue_id);
CREATE INDEX IF NOT EXISTS idx_documents_pinned_by ON documents(pinned_by);
CREATE INDEX IF NOT EXISTS idx_issue_activity_logs_user_id ON issue_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_deleted_by ON issue_comments(deleted_by);
CREATE INDEX IF NOT EXISTS idx_issues_deleted_by ON issues(deleted_by);
CREATE INDEX IF NOT EXISTS idx_issues_reported_by ON issues(reported_by);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_by ON notes(deleted_by);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_by ON projects(deleted_by);
CREATE INDEX IF NOT EXISTS idx_reports_deleted_by ON reports(deleted_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_deleted_by ON task_comments(deleted_by);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_created_by ON task_dependencies(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_by ON tasks(deleted_by);
CREATE INDEX IF NOT EXISTS idx_users_deleted_by ON users(deleted_by);

-- ============================================
-- PART 2: FIX FUNCTIONS WITH MUTABLE SEARCH_PATH
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_issue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_issue_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO issue_activity_logs (issue_id, user_id, action, changes)
    VALUES (NEW.id, NEW.reported_by, 'created', jsonb_build_object('issue', row_to_json(NEW)));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO issue_activity_logs (issue_id, user_id, action, changes)
    VALUES (NEW.id, COALESCE(NEW.assigned_to, NEW.reported_by), 'updated', jsonb_build_object(
      'old', row_to_json(OLD),
      'new', row_to_json(NEW)
    ));
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- PART 3: OPTIMIZE RLS POLICIES - USERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view other users in same projects" ON users;
CREATE POLICY "Users can view other users in same projects"
  ON users FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT pm2.user_id FROM project_members pm1
      JOIN project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = (select auth.uid())
    )
    OR id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PART 4: OPTIMIZE RLS POLICIES - PROJECTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view projects they belong to" ON projects;
CREATE POLICY "Users can view projects they belong to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      owner_id = (select auth.uid())
      OR id IN (SELECT project_id FROM project_members WHERE user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Project owners and admins can update projects" ON projects;
CREATE POLICY "Project owners and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    owner_id = (select auth.uid())
    OR id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Project owners can soft delete projects" ON projects;
CREATE POLICY "Project owners can soft delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view deleted projects they own" ON projects;
CREATE POLICY "Users can view deleted projects they own"
  ON projects FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND owner_id = (select auth.uid()));

-- ============================================
-- PART 5: OPTIMIZE RLS POLICIES - PROJECT_MEMBERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Project owners/admins can add members" ON project_members;
CREATE POLICY "Project owners/admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Project owners/admins can update members" ON project_members;
CREATE POLICY "Project owners/admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Project owners/admins can remove members" ON project_members;
CREATE POLICY "Project owners/admins can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ============================================
-- PART 6: OPTIMIZE RLS POLICIES - TASKS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;
CREATE POLICY "Users can view tasks in their projects"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;
CREATE POLICY "Project members can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Task assignees and project admins can update tasks" ON tasks;
CREATE POLICY "Task assignees and project admins can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assignee_id = (select auth.uid())
    OR created_by = (select auth.uid())
    OR project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    assignee_id = (select auth.uid())
    OR created_by = (select auth.uid())
    OR project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Task creators and project admins can delete tasks" ON tasks;
CREATE POLICY "Task creators and project admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view deleted tasks they created or are assigned to" ON tasks;
CREATE POLICY "Users can view deleted tasks they created or are assigned to"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL 
    AND (created_by = (select auth.uid()) OR assignee_id = (select auth.uid()))
  );

-- ============================================
-- PART 7: OPTIMIZE RLS POLICIES - TASK_COMMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view comments on tasks in their projects" ON task_comments;
CREATE POLICY "Users can view comments on tasks in their projects"
  ON task_comments FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can create comments on tasks in their projects" ON task_comments;
CREATE POLICY "Users can create comments on tasks in their projects"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON task_comments;
CREATE POLICY "Users can delete their own comments"
  ON task_comments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 8: OPTIMIZE RLS POLICIES - TASK_DEPENDENCIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view dependencies in their projects" ON task_dependencies;
CREATE POLICY "Users can view dependencies in their projects"
  ON task_dependencies FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Project members can create dependencies" ON task_dependencies;
CREATE POLICY "Project members can create dependencies"
  ON task_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Project members can delete dependencies" ON task_dependencies;
CREATE POLICY "Project members can delete dependencies"
  ON task_dependencies FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
      )
    )
  );

-- ============================================
-- PART 9: OPTIMIZE RLS POLICIES - TIME_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own time logs" ON time_logs;
CREATE POLICY "Users can view own time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Project admins can view all time logs for their projects" ON time_logs;
CREATE POLICY "Project admins can view all time logs for their projects"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members 
        WHERE user_id = (select auth.uid()) AND role IN ('admin', 'owner')
      )
    )
  );

DROP POLICY IF EXISTS "Users can create own time logs" ON time_logs;
CREATE POLICY "Users can create own time logs"
  ON time_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own time logs" ON time_logs;
CREATE POLICY "Users can update own time logs"
  ON time_logs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own time logs" ON time_logs;
CREATE POLICY "Users can delete own time logs"
  ON time_logs FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 10: OPTIMIZE RLS POLICIES - NOTES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view notes in their projects" ON notes;
CREATE POLICY "Users can view notes in their projects"
  ON notes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      created_by = (select auth.uid())
      OR project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can create notes" ON notes;
CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Note creators can update their notes" ON notes;
CREATE POLICY "Note creators can update their notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Note creators can delete their notes" ON notes;
CREATE POLICY "Note creators can delete their notes"
  ON notes FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view deleted notes they created" ON notes;
CREATE POLICY "Users can view deleted notes they created"
  ON notes FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND created_by = (select auth.uid()));

-- ============================================
-- PART 11: OPTIMIZE RLS POLICIES - ISSUES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view issues in their projects" ON issues;
CREATE POLICY "Users can view issues in their projects"
  ON issues FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create issues" ON issues;
CREATE POLICY "Users can create issues"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = (select auth.uid()));

DROP POLICY IF EXISTS "Issue reporters and assignees can update issues" ON issues;
CREATE POLICY "Issue reporters and assignees can update issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (
    reported_by = (select auth.uid()) 
    OR assigned_to = (select auth.uid())
  )
  WITH CHECK (
    reported_by = (select auth.uid()) 
    OR assigned_to = (select auth.uid())
  );

DROP POLICY IF EXISTS "Issue reporters can delete issues" ON issues;
CREATE POLICY "Issue reporters can delete issues"
  ON issues FOR DELETE
  TO authenticated
  USING (reported_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view deleted issues they reported" ON issues;
CREATE POLICY "Users can view deleted issues they reported"
  ON issues FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND reported_by = (select auth.uid()));

-- ============================================
-- PART 12: OPTIMIZE RLS POLICIES - REPORTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Report creators can update reports" ON reports;
CREATE POLICY "Report creators can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Report creators can delete reports" ON reports;
CREATE POLICY "Report creators can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- ============================================
-- PART 13: OPTIMIZE RLS POLICIES - ACTIVITY_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view activity logs for their entities" ON activity_logs;
CREATE POLICY "Users can view activity logs for their entities"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR entity_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- PART 14: OPTIMIZE RLS POLICIES - DOCUMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view published documents" ON documents;
CREATE POLICY "Users can view published documents"
  ON documents FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND status = 'published');

DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Authors can update their documents" ON documents;
CREATE POLICY "Authors can update their documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Authors can delete their documents" ON documents;
CREATE POLICY "Authors can delete their documents"
  ON documents FOR DELETE
  TO authenticated
  USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view deleted documents they authored" ON documents;
CREATE POLICY "Users can view deleted documents they authored"
  ON documents FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND author_id = (select auth.uid()));

-- ============================================
-- PART 15: OPTIMIZE RLS POLICIES - DOCUMENT_CATEGORIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can manage categories" ON document_categories;
CREATE POLICY "Admins can manage categories"
  ON document_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  );

-- ============================================
-- PART 16: OPTIMIZE RLS POLICIES - DOCUMENT_TAGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can manage tags" ON document_tags;
CREATE POLICY "Admins can manage tags"
  ON document_tags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tags" ON document_tags;
CREATE POLICY "Authenticated users can create tags"
  ON document_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can delete tags" ON document_tags;
CREATE POLICY "Admins can delete tags"
  ON document_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  );

-- ============================================
-- PART 17: OPTIMIZE RLS POLICIES - DOCUMENT_TAG_RELATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Document authors can manage tag relations" ON document_tag_relations;
CREATE POLICY "Document authors can manage tag relations"
  ON document_tag_relations FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE author_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Document authors can remove tag relations" ON document_tag_relations;
CREATE POLICY "Document authors can remove tag relations"
  ON document_tag_relations FOR DELETE
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE author_id = (select auth.uid())
    )
  );

-- ============================================
-- PART 18: OPTIMIZE RLS POLICIES - DOCUMENT_COMMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create comments" ON document_comments;
CREATE POLICY "Authenticated users can create comments"
  ON document_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own comments" ON document_comments;
CREATE POLICY "Users can update their own comments"
  ON document_comments FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON document_comments;
CREATE POLICY "Users can delete their own comments"
  ON document_comments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 19: OPTIMIZE RLS POLICIES - DOCUMENT_ATTACHMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Document authors can add attachments" ON document_attachments;
CREATE POLICY "Document authors can add attachments"
  ON document_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (select auth.uid())
    AND document_id IN (
      SELECT id FROM documents WHERE author_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Uploaders can delete their attachments" ON document_attachments;
CREATE POLICY "Uploaders can delete their attachments"
  ON document_attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

-- ============================================
-- PART 20: OPTIMIZE RLS POLICIES - ISSUE_COMMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create comments" ON issue_comments;
CREATE POLICY "Authenticated users can create comments"
  ON issue_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own comments" ON issue_comments;
CREATE POLICY "Users can update their own comments"
  ON issue_comments FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON issue_comments;
CREATE POLICY "Users can delete their own comments"
  ON issue_comments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PART 21: OPTIMIZE RLS POLICIES - ISSUE_ACTIVITY_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "System can create activity logs" ON issue_activity_logs;
CREATE POLICY "System can create activity logs"
  ON issue_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    issue_id IN (
      SELECT id FROM issues WHERE reported_by = (select auth.uid())
      UNION
      SELECT id FROM issues WHERE assigned_to = (select auth.uid())
    )
  );

-- ============================================
-- PART 22: OPTIMIZE RLS POLICIES - SYSTEM_SETTINGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can insert settings" ON system_settings;
CREATE POLICY "Admins can insert settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update settings" ON system_settings;
CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete settings" ON system_settings;
CREATE POLICY "Admins can delete settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  );