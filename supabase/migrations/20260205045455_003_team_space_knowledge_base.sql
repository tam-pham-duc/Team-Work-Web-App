/*
  # Team Space Knowledge Base Schema

  ## Overview
  This migration creates the schema for an internal knowledge base system
  supporting notes, posts, technical specifications, and discussions.

  ## New Tables

  1. `document_categories`
     - `id` (uuid, primary key)
     - `name` (text, unique) - Category name
     - `slug` (text, unique) - URL-friendly identifier
     - `description` (text) - Category description
     - `color` (text) - Display color for the category
     - `icon` (text) - Icon identifier
     - `parent_id` (uuid, references self) - For nested categories
     - `sort_order` (integer) - Display order
     - `created_at`, `updated_at` timestamps

  2. `documents`
     - `id` (uuid, primary key)
     - `title` (text) - Document title
     - `content` (text) - Rich text content (stored as HTML/JSON)
     - `excerpt` (text) - Short summary
     - `type` (enum) - note, post, spec, discussion
     - `status` (enum) - draft, published, archived
     - `category_id` (uuid) - Reference to category
     - `author_id` (uuid) - Document author
     - `is_pinned` (boolean) - Pin for quick access
     - `pinned_at` (timestamp) - When pinned
     - `pinned_by` (uuid) - Who pinned it
     - `view_count` (integer) - Number of views
     - `project_id` (uuid) - Link to project
     - `task_id` (uuid) - Link to task
     - `issue_id` (uuid) - Link to issue
     - `created_at`, `updated_at`, `deleted_at` timestamps

  3. `document_tags`
     - `id` (uuid, primary key)
     - `name` (text, unique) - Tag name
     - `slug` (text, unique) - URL-friendly identifier
     - `color` (text) - Display color
     - `created_at` timestamp

  4. `document_tag_relations`
     - `id` (uuid, primary key)
     - `document_id` (uuid) - Reference to document
     - `tag_id` (uuid) - Reference to tag
     - Unique constraint on (document_id, tag_id)

  5. `document_comments`
     - `id` (uuid, primary key)
     - `document_id` (uuid) - Reference to document
     - `user_id` (uuid) - Comment author
     - `content` (text) - Comment content
     - `parent_id` (uuid) - For threaded replies
     - `is_resolved` (boolean) - For discussion threads
     - `created_at`, `updated_at`, `deleted_at` timestamps

  6. `document_attachments`
     - `id` (uuid, primary key)
     - `document_id` (uuid) - Reference to document
     - `name` (text) - File name
     - `file_path` (text) - Storage path
     - `file_size` (integer) - Size in bytes
     - `mime_type` (text) - File type
     - `uploaded_by` (uuid) - Uploader
     - `created_at` timestamp

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read published documents
  - Authors can manage their own documents
  - Admins have full access

*/

-- Create document type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('note', 'post', 'spec', 'discussion');
  END IF;
END $$;

-- Create document status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
    CREATE TYPE document_status AS ENUM ('draft', 'published', 'archived');
  END IF;
END $$;

-- Create document_categories table
CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  color text DEFAULT '#6b7280',
  icon text DEFAULT 'folder',
  parent_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT document_categories_name_unique UNIQUE (name),
  CONSTRAINT document_categories_slug_unique UNIQUE (slug)
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  excerpt text,
  type document_type NOT NULL DEFAULT 'note',
  status document_status NOT NULL DEFAULT 'draft',
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_pinned boolean DEFAULT false,
  pinned_at timestamptz,
  pinned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  view_count integer DEFAULT 0,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  issue_id uuid REFERENCES issues(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Create document_tags table
CREATE TABLE IF NOT EXISTS document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  color text DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT document_tags_name_unique UNIQUE (name),
  CONSTRAINT document_tags_slug_unique UNIQUE (slug)
);

-- Create document_tag_relations table
CREATE TABLE IF NOT EXISTS document_tag_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT document_tag_relations_unique UNIQUE (document_id, tag_id)
);

-- Create document_comments table
CREATE TABLE IF NOT EXISTS document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES document_comments(id) ON DELETE CASCADE,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Create document_attachments table
CREATE TABLE IF NOT EXISTS document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_author_id ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_is_pinned ON documents(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_relations_document_id ON document_tag_relations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_relations_tag_id ON document_tag_relations(tag_id);

-- Enable RLS on all tables
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_categories (readable by all authenticated users)
CREATE POLICY "Authenticated users can view categories"
  ON document_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON document_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view published documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      status = 'published' OR
      author_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
      )
    )
  );

CREATE POLICY "Users can create documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update their documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'manager')
    )
  );

CREATE POLICY "Authors can delete their documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for document_tags
CREATE POLICY "Authenticated users can view tags"
  ON document_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON document_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage tags"
  ON document_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can delete tags"
  ON document_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for document_tag_relations
CREATE POLICY "Users can view tag relations"
  ON document_tag_relations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Document authors can manage tag relations"
  ON document_tag_relations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.author_id = auth.uid()
    )
  );

CREATE POLICY "Document authors can remove tag relations"
  ON document_tag_relations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.author_id = auth.uid()
    )
  );

-- RLS Policies for document_comments
CREATE POLICY "Users can view comments on accessible documents"
  ON document_comments FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.deleted_at IS NULL
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON document_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON document_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON document_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for document_attachments
CREATE POLICY "Users can view attachments of accessible documents"
  ON document_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.deleted_at IS NULL
    )
  );

CREATE POLICY "Document authors can add attachments"
  ON document_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.author_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders can delete their attachments"
  ON document_attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Insert default categories
INSERT INTO document_categories (name, slug, description, color, icon, sort_order)
VALUES
  ('General', 'general', 'General knowledge and information', '#6b7280', 'file-text', 0),
  ('Engineering', 'engineering', 'Technical documentation and specs', '#3b82f6', 'code', 1),
  ('Design', 'design', 'Design guidelines and resources', '#8b5cf6', 'palette', 2),
  ('Product', 'product', 'Product decisions and roadmaps', '#10b981', 'package', 3),
  ('Processes', 'processes', 'Team processes and workflows', '#f59e0b', 'git-branch', 4),
  ('Onboarding', 'onboarding', 'New team member resources', '#06b6d4', 'user-plus', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert default tags
INSERT INTO document_tags (name, slug, color)
VALUES
  ('Important', 'important', '#ef4444'),
  ('Reference', 'reference', '#3b82f6'),
  ('How-to', 'how-to', '#10b981'),
  ('Meeting Notes', 'meeting-notes', '#8b5cf6'),
  ('RFC', 'rfc', '#f59e0b'),
  ('Decision', 'decision', '#06b6d4')
ON CONFLICT (slug) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();

DROP TRIGGER IF EXISTS update_document_categories_updated_at ON document_categories;
CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();

DROP TRIGGER IF EXISTS update_document_comments_updated_at ON document_comments;
CREATE TRIGGER update_document_comments_updated_at
  BEFORE UPDATE ON document_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();
