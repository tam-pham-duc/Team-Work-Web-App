/*
  # Trash and Recovery System

  ## Overview
  This migration adds support for a unified trash and recovery system,
  allowing users to restore soft-deleted items and permanently delete them.
  It also adds admin-controlled retention settings.

  ## New Tables

  1. `system_settings`
     - `id` (uuid, primary key)
     - `key` (text, unique) - Setting identifier
     - `value` (jsonb) - Setting value
     - `description` (text) - Human-readable description
     - `updated_by` (uuid) - Last user to update
     - `created_at`, `updated_at` timestamps

  ## Changes to Existing Tables
  - Adds policies to allow users to view their own deleted items
  - Adds policies to allow admins to view all deleted items

  ## Security
  - RLS enabled on system_settings
  - Only admins can modify system settings
  - Users can view and restore their own deleted items
  - Admins can manage all deleted items

  ## Retention
  - Default retention period: 30 days
  - Admins can configure retention period
  - Items older than retention period can be purged by admin

*/

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_settings
CREATE POLICY "Authenticated users can view settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can delete settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Insert default retention setting
INSERT INTO system_settings (key, value, description)
VALUES (
  'trash_retention_days',
  '{"days": 30}',
  'Number of days to retain deleted items before permanent deletion'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- UPDATED RLS POLICIES FOR VIEWING DELETED ITEMS
-- ============================================

-- Tasks: Allow users to view their own deleted tasks
DROP POLICY IF EXISTS "Users can view deleted tasks they created or are assigned to" ON tasks;
CREATE POLICY "Users can view deleted tasks they created or are assigned to"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL AND (
      created_by = auth.uid() OR
      assignee_id = auth.uid() OR
      deleted_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = tasks.project_id 
        AND pm.user_id = auth.uid() 
        AND pm.role IN ('owner', 'admin')
      ) OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'admin'
      )
    )
  );

-- Projects: Allow users to view their own deleted projects
DROP POLICY IF EXISTS "Users can view deleted projects they own" ON projects;
CREATE POLICY "Users can view deleted projects they own"
  ON projects FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL AND (
      owner_id = auth.uid() OR
      deleted_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'admin'
      )
    )
  );

-- Documents: Allow users to view their own deleted documents
DROP POLICY IF EXISTS "Users can view deleted documents they authored" ON documents;
CREATE POLICY "Users can view deleted documents they authored"
  ON documents FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL AND (
      author_id = auth.uid() OR
      deleted_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
      )
    )
  );

-- Issues: Allow users to view their own deleted issues
DROP POLICY IF EXISTS "Users can view deleted issues they reported" ON issues;
CREATE POLICY "Users can view deleted issues they reported"
  ON issues FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL AND (
      reported_by = auth.uid() OR
      assigned_to = auth.uid() OR
      deleted_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'admin'
      )
    )
  );

-- Notes: Allow users to view their own deleted notes
DROP POLICY IF EXISTS "Users can view deleted notes they created" ON notes;
CREATE POLICY "Users can view deleted notes they created"
  ON notes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL AND (
      created_by = auth.uid() OR
      deleted_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'admin'
      )
    )
  );

-- ============================================
-- TRIGGER FOR SYSTEM SETTINGS UPDATED_AT
-- ============================================

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
