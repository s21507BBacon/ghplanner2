-- Migration: Add anchor side preferences to connections table
-- Allows users to manually control which side of columns arrows connect to

DO $$
BEGIN
    -- Add source_anchor_side column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' AND column_name = 'source_anchor_side'
    ) THEN
        ALTER TABLE connections ADD COLUMN source_anchor_side TEXT;
    END IF;

    -- Add target_anchor_side column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' AND column_name = 'target_anchor_side'
    ) THEN
        ALTER TABLE connections ADD COLUMN target_anchor_side TEXT;
    END IF;
END $$;
