-- Migration: Add view_mode column to boards table
-- This enables different board layouts: free-form, traditional planner, and grid view

-- Add view_mode column to boards table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boards' AND column_name = 'view_mode'
    ) THEN
        ALTER TABLE boards ADD COLUMN view_mode TEXT NOT NULL DEFAULT 'free-form'
            CHECK (view_mode IN ('free-form', 'traditional', 'grid'));
        COMMENT ON COLUMN boards.view_mode IS 'Board layout mode: free-form (drag anywhere), traditional (fixed row), or grid (task grid view)';
    END IF;
END $$;

-- Create index for view_mode queries
CREATE INDEX IF NOT EXISTS idx_boards_view_mode ON boards(view_mode);
