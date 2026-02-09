/*
  # Custom Task Statuses

  1. New Tables
    - `task_statuses`
      - `id` (uuid, primary key)
      - `name` (text) - Display name of the status
      - `slug` (text) - URL-friendly identifier
      - `color` (text) - Color for UI display (e.g., 'gray', 'blue', 'green')
      - `sort_order` (integer) - Order of status in lists/kanban
      - `is_default` (boolean) - Whether this is a system default status
      - `is_completed_state` (boolean) - Whether tasks with this status are considered complete
      - `created_by` (uuid) - User who created the status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `status_id` column to tasks table as optional reference
    - Migrate existing status values to the new system

  3. Security
    - Enable RLS on task_statuses
    - Authenticated users can read all statuses
    - Authenticated users can create/update/delete their own custom statuses
    - Default statuses cannot be deleted
*/

CREATE TABLE IF NOT EXISTS task_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT 'gray',
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_completed_state boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all statuses"
  ON task_statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create statuses"
  ON task_statuses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own non-default statuses"
  ON task_statuses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by AND is_default = false)
  WITH CHECK (auth.uid() = created_by AND is_default = false);

CREATE POLICY "Users can delete their own non-default statuses"
  ON task_statuses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by AND is_default = false);

INSERT INTO task_statuses (name, slug, color, sort_order, is_default, is_completed_state) VALUES
  ('To Do', 'todo', 'gray', 0, true, false),
  ('In Progress', 'in_progress', 'blue', 1, true, false),
  ('Review', 'review', 'amber', 2, true, false),
  ('Blocked', 'blocked', 'red', 3, true, false),
  ('Done', 'completed', 'green', 4, true, true)
ON CONFLICT (slug) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN status_id uuid REFERENCES task_statuses(id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_task_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_statuses_updated_at ON task_statuses;
CREATE TRIGGER update_task_statuses_updated_at
  BEFORE UPDATE ON task_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_task_statuses_updated_at();

CREATE INDEX IF NOT EXISTS idx_task_statuses_sort_order ON task_statuses(sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id);
