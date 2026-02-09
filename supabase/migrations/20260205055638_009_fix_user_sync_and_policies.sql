/*
  # Fix User Sync and Policies

  This migration fixes the authentication/user mapping issue by:
  1. Creating a database trigger to automatically create user profiles on auth signup
  2. Fixing the recursive SELECT policy on users table
  3. Adding a function to sync existing auth users

  ## Problem:
  - Users could log in but couldn't create data
  - The users table SELECT policy had infinite recursion via project_members
  - No automatic user profile creation on signup

  ## Solution:
  - Create trigger on auth.users to auto-create public.users record
  - Simplify users SELECT policy to avoid recursion
  - Use SECURITY DEFINER function for project member checks
*/

-- ============================================
-- Create function to handle new user signups
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_role_id uuid;
BEGIN
  SELECT id INTO member_role_id FROM roles WHERE name = 'member' LIMIT 1;
  
  INSERT INTO public.users (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    member_role_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- ============================================
-- Create trigger on auth.users
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Fix users table SELECT policy
-- ============================================

DROP POLICY IF EXISTS "Users can view other users in same projects" ON users;

CREATE POLICY "Users can view users"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT pm.user_id 
      FROM project_members pm 
      WHERE pm.project_id IN (SELECT auth_user_project_ids())
    )
  );

-- ============================================
-- Sync existing auth users to public.users
-- ============================================

INSERT INTO public.users (id, email, full_name, role_id)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  (SELECT id FROM roles WHERE name = 'member' LIMIT 1)
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;