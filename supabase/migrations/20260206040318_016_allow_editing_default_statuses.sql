/*
  # Allow Editing Default Task Statuses

  1. Changes
    - Drop the existing UPDATE policy on task_statuses that blocks editing default statuses
    - Create a new UPDATE policy that allows:
      - Any authenticated user to edit default statuses (name, color, sort_order, is_completed_state)
      - Custom status creators to edit their own statuses
    - This enables users to rename and recolor default statuses like "To Do" or "Done"

  2. Security
    - Default statuses remain undeletable (DELETE policy unchanged)
    - Custom statuses can still only be edited/deleted by their creator
    - All statuses remain visible to all authenticated users
*/

DROP POLICY IF EXISTS "Users can update their own non-default statuses" ON task_statuses;

CREATE POLICY "Authenticated users can update statuses"
  ON task_statuses FOR UPDATE
  TO authenticated
  USING (
    is_default = true
    OR (auth.uid() = created_by AND is_default = false)
  )
  WITH CHECK (
    is_default = true
    OR (auth.uid() = created_by AND is_default = false)
  );
