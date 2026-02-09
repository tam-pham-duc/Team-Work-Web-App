/*
  # Fix Issues RLS SELECT Policy

  ## Problem
  The current SELECT policy only allows viewing issues that belong to a project the user is a member of.
  This causes issues without a project_id to be invisible, and new users without any projects
  cannot see issues they reported.

  ## Solution
  Update the SELECT policy to allow users to view:
  - Issues they reported
  - Issues assigned to them
  - Issues in projects they are members of
*/

DROP POLICY IF EXISTS "Users can view issues" ON issues;

CREATE POLICY "Users can view issues"
  ON issues FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      reported_by = auth.uid() OR
      assigned_to = auth.uid() OR
      project_id IN (SELECT auth_user_project_ids())
    )
  );