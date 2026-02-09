/*
  # Task Comments and Tags

  ## Overview
  Adds support for task comments and tags to enable team collaboration and task categorization.

  ## Changes

  1. Modified Tables
    - `tasks`: Added `tags` column (text array) for categorizing tasks

  2. New Tables
    - `task_comments`: Comments on tasks for team discussion
      - `id` (uuid, primary key)
      - `task_id` (uuid, FK to tasks)
      - `user_id` (uuid, FK to users)
      - `content` (text) - comment content
      - `created_at`, `updated_at` timestamps
      - Soft delete support

  ## Security
    - RLS enabled on task_comments
    - Users can view/create comments on tasks in their projects
    - Users can only edit/delete their own comments
*/

-- Add tags column to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'tags'
  ) THEN
    ALTER TABLE tasks ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN (tags) WHERE deleted_at IS NULL;

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments(created_at);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on tasks in their projects"
  ON task_comments FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_comments.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on tasks in their projects"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON task_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at on task_comments
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
