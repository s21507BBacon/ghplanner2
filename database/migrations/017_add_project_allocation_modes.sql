-- Migration: Add enterprise-level allocation modes and user allocation status
-- Supports three allocation modes at the enterprise level:
-- 1. 'auto' - users can self-select projects until filled
-- 2. 'manual' - admin manually allocates users to projects
-- 3. 'manual-preference' - users submit preferences, admin allocates based on preferences

DO $$
BEGIN
    -- Add allocation_mode column to enterprises table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enterprises' AND column_name = 'allocation_mode'
    ) THEN
        ALTER TABLE enterprises ADD COLUMN allocation_mode TEXT NOT NULL DEFAULT 'auto'
            CHECK (allocation_mode IN ('auto', 'manual', 'manual-preference'));
        COMMENT ON COLUMN enterprises.allocation_mode IS 'Enterprise allocation mode: auto (self-select), manual (admin allocates), or manual-preference (users submit preferences)';
    END IF;

    -- Add allocation_status column to memberships table
    -- This tracks whether a user has been allocated to a project within a company
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memberships' AND column_name = 'allocation_status'
    ) THEN
        ALTER TABLE memberships ADD COLUMN allocation_status TEXT NOT NULL DEFAULT 'unallocated'
            CHECK (allocation_status IN ('unallocated', 'pending', 'preference-submitted', 'allocated'));
        COMMENT ON COLUMN memberships.allocation_status IS 'User allocation status within company: unallocated, pending (waiting for admin), preference-submitted (preferences entered), or allocated';
    END IF;

    -- Add preference_rank constraint to project_preferences
    -- Ensure rank is between 1 and 3 (for top 3 preferences)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'project_preferences' AND constraint_name = 'project_preferences_rank_check'
    ) THEN
        ALTER TABLE project_preferences ADD CONSTRAINT project_preferences_rank_check 
            CHECK (rank >= 1 AND rank <= 3);
        COMMENT ON COLUMN project_preferences.rank IS 'Preference rank (1-3, where 1 is most preferred)';
    END IF;

    -- Add unique constraint to ensure only one preference per rank per user per company
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'project_preferences' AND constraint_name = 'project_preferences_unique_rank'
    ) THEN
        ALTER TABLE project_preferences ADD CONSTRAINT project_preferences_unique_rank 
            UNIQUE (user_id, company_id, rank);
    END IF;

    -- Add status column to project_preferences to track preference state
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_preferences' AND column_name = 'status'
    ) THEN
        ALTER TABLE project_preferences ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'allocated', 'rejected'));
        COMMENT ON COLUMN project_preferences.status IS 'Preference status: pending (awaiting admin decision), allocated (preference granted), or rejected';
    END IF;

    -- Add updated_at column to project_preferences
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_preferences' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE project_preferences ADD COLUMN updated_at BIGINT;
    END IF;
END $$;

-- Create index for efficient querying of preferences by company and status
CREATE INDEX IF NOT EXISTS idx_project_preferences_company_status 
    ON project_preferences(company_id, status);

-- Create index for efficient querying of allocations by status
CREATE INDEX IF NOT EXISTS idx_memberships_allocation_status 
    ON memberships(company_id, allocation_status);
