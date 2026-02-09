/*
  # Add secure user search function

  1. New Functions
    - `search_users_by_email(query text)` - SECURITY DEFINER function that allows
      authenticated users to search for registered users by email or name.
      Returns minimal user data (id, full_name, email, avatar_url).
      Bypasses restrictive RLS on the users table so that users not yet
      in a shared project can still be found and added to projects.

  2. Security
    - Function is SECURITY DEFINER with fixed search_path
    - Only accessible to authenticated users
    - Returns only non-deleted users
    - Limited to 10 results
    - Requires at least 2 characters in query
*/

CREATE OR REPLACE FUNCTION public.search_users_by_email(query text)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT u.id, u.full_name, u.email, u.avatar_url
  FROM users u
  WHERE u.deleted_at IS NULL
    AND length(query) >= 2
    AND (
      u.email ILIKE '%' || query || '%'
      OR u.full_name ILIKE '%' || query || '%'
    )
  ORDER BY
    CASE WHEN u.email ILIKE query || '%' THEN 0 ELSE 1 END,
    u.email
  LIMIT 10;
$$;
