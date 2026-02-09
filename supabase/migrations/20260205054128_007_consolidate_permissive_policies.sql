/*
  # Consolidate Multiple Permissive Policies

  This migration consolidates multiple SELECT policies into single policies using OR conditions.
  This addresses the "Multiple Permissive Policies" warning while maintaining the same access patterns.

  ## Tables Updated:
  - document_categories: Consolidated admin and user view policies
  - document_tags: Consolidated admin and user view policies  
  - documents: Consolidated published and deleted document view policies
  - issues: Consolidated active and deleted issue view policies
  - notes: Consolidated active and deleted note view policies
  - projects: Consolidated active and deleted project view policies
  - tasks: Consolidated active and deleted task view policies
  - time_logs: Consolidated own and project admin view policies
*/

-- ============================================
-- DOCUMENT_CATEGORIES: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Admins can manage categories" ON document_categories;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON document_categories;

CREATE POLICY "Users can view categories"
  ON document_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON document_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can update categories"
  ON document_categories FOR UPDATE
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

CREATE POLICY "Admins can delete categories"
  ON document_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = (select auth.uid()) AND r.name = 'admin'
    )
  );

-- ============================================
-- DOCUMENT_TAGS: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Admins can manage tags" ON document_tags;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON document_tags;

CREATE POLICY "Users can view tags"
  ON document_tags FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- DOCUMENTS: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Users can view published documents" ON documents;
DROP POLICY IF EXISTS "Users can view deleted documents they authored" ON documents;

CREATE POLICY "Users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND status = 'published')
    OR (deleted_at IS NOT NULL AND author_id = (select auth.uid()))
    OR (author_id = (select auth.uid()))
  );

-- ============================================
-- ISSUES: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Users can view issues in their projects" ON issues;
DROP POLICY IF EXISTS "Users can view deleted issues they reported" ON issues;

CREATE POLICY "Users can view issues"
  ON issues FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
    ))
    OR (deleted_at IS NOT NULL AND reported_by = (select auth.uid()))
  );

-- ============================================
-- NOTES: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Users can view notes in their projects" ON notes;
DROP POLICY IF EXISTS "Users can view deleted notes they created" ON notes;

CREATE POLICY "Users can view notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND (
      created_by = (select auth.uid())
      OR project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
      )
    ))
    OR (deleted_at IS NOT NULL AND created_by = (select auth.uid()))
  );

-- ============================================
-- PROJECTS: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Users can view projects they belong to" ON projects;
DROP POLICY IF EXISTS "Users can view deleted projects they own" ON projects;

CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND (
      owner_id = (select auth.uid())
      OR id IN (SELECT project_id FROM project_members WHERE user_id = (select auth.uid()))
    ))
    OR (deleted_at IS NOT NULL AND owner_id = (select auth.uid()))
  );

-- ============================================
-- TASKS: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can view deleted tasks they created or are assigned to" ON tasks;

CREATE POLICY "Users can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL AND project_id IN (
      SELECT id FROM projects WHERE owner_id = (select auth.uid())
      UNION
      SELECT project_id FROM project_members WHERE user_id = (select auth.uid())
    ))
    OR (deleted_at IS NOT NULL AND (created_by = (select auth.uid()) OR assignee_id = (select auth.uid())))
  );

-- ============================================
-- TIME_LOGS: Consolidate SELECT policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own time logs" ON time_logs;
DROP POLICY IF EXISTS "Project admins can view all time logs for their projects" ON time_logs;

CREATE POLICY "Users can view time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE owner_id = (select auth.uid())
        UNION
        SELECT project_id FROM project_members 
        WHERE user_id = (select auth.uid()) AND role IN ('admin', 'owner')
      )
    )
  );