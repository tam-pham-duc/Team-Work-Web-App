/*
  # Calculation History Table

  1. New Tables
    - `calculation_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `expression` (text) - the calculation expression
      - `result` (text) - the calculation result
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `calculation_history` table
    - Users can only view and manage their own calculation history
*/

CREATE TABLE IF NOT EXISTS calculation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expression text NOT NULL,
  result text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculation_history_user_id ON calculation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_calculation_history_created_at ON calculation_history(created_at DESC);

ALTER TABLE calculation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calculation history"
  ON calculation_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculation history"
  ON calculation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calculation history"
  ON calculation_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);