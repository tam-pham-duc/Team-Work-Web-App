/*
  # Issue Comments and Activity Tracking

  ## Overview
  This migration adds support for comments on issues and tracking issue lifecycle.

  ## New Tables

  1. `issue_comments`
     - `id` (uuid, primary key)
     - `issue_id` (uuid) - Reference to issue
     - `user_id` (uuid) - Comment author
     - `content` (text) - Comment content
     - `is_resolution_note` (boolean) - Marks if this is a resolution note
     - `created_at`, `updated_at`, `deleted_at` timestamps

  2. `issue_activity_logs`
     - `id` (uuid, primary key)
     - `issue_id` (uuid) - Reference to issue
     - `user_id` (uuid) - User who made the change
     - `action` (text) - Type of action (created, status_changed, assigned, etc.)
     - `old_value` (text) - Previous value
     - `new_value` (text) - New value
     - `created_at` timestamp

  ## Security
  - RLS enabled on all tables
  - Authenticated users can view comments on issues they can access
  - Users can manage their own comments
*/

-- Create issue_comments table
CREATE TABLE IF NOT EXISTS issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_resolution_note boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Create issue_activity_logs table
CREATE TABLE IF NOT EXISTS issue_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_user_id ON issue_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_activity_logs_issue_id ON issue_activity_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_activity_logs_created_at ON issue_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issue_comments
CREATE POLICY "Users can view comments on accessible issues"
  ON issue_comments FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id AND i.deleted_at IS NULL
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON issue_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON issue_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON issue_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for issue_activity_logs
CREATE POLICY "Users can view activity on accessible issues"
  ON issue_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id AND i.deleted_at IS NULL
    )
  );

CREATE POLICY "System can create activity logs"
  ON issue_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to log issue activity
CREATE OR REPLACE FUNCTION log_issue_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO issue_activity_logs (issue_id, user_id, action, new_value)
    VALUES (NEW.id, NEW.reported_by, 'created', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO issue_activity_logs (issue_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
    END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO issue_activity_logs (issue_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'assigned', OLD.assigned_to::text, NEW.assigned_to::text);
    END IF;
    IF OLD.severity IS DISTINCT FROM NEW.severity THEN
      INSERT INTO issue_activity_logs (issue_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'severity_changed', OLD.severity::text, NEW.severity::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for issue activity logging
DROP TRIGGER IF EXISTS issue_activity_trigger ON issues;
CREATE TRIGGER issue_activity_trigger
  AFTER INSERT OR UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION log_issue_activity();

-- Create function to update issue updated_at
CREATE OR REPLACE FUNCTION update_issue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_issue_updated_at();

-- Create trigger for comment updated_at
DROP TRIGGER IF EXISTS update_issue_comments_updated_at ON issue_comments;
CREATE TRIGGER update_issue_comments_updated_at
  BEFORE UPDATE ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_issue_updated_at();
