/*
  # Fix Issue Activity Trigger

  ## Problem
  The `log_issue_activity()` trigger function references a non-existent column `changes`.
  The actual column in `issue_activity_logs` table is `metadata`.

  ## Solution
  Update the trigger function to use the correct column name `metadata`.
*/

CREATE OR REPLACE FUNCTION public.log_issue_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO issue_activity_logs (issue_id, user_id, action, metadata)
    VALUES (NEW.id, NEW.reported_by, 'created', jsonb_build_object('issue', row_to_json(NEW)));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO issue_activity_logs (issue_id, user_id, action, old_value, new_value, metadata)
    VALUES (
      NEW.id, 
      COALESCE(NEW.assigned_to, NEW.reported_by), 
      'updated',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;