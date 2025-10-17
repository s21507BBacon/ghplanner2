-- Migration: Add control points to connections table for custom bezier curve paths
-- Allows users to drag and customize the path of connection arrows

DO $$
BEGIN
    -- Add control_point_1_x column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' AND column_name = 'control_point_1_x'
    ) THEN
        ALTER TABLE connections ADD COLUMN control_point_1_x DOUBLE PRECISION;
    END IF;

    -- Add control_point_1_y column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' AND column_name = 'control_point_1_y'
    ) THEN
        ALTER TABLE connections ADD COLUMN control_point_1_y DOUBLE PRECISION;
    END IF;

    -- Add control_point_2_x column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' AND column_name = 'control_point_2_x'
    ) THEN
        ALTER TABLE connections ADD COLUMN control_point_2_x DOUBLE PRECISION;
    END IF;

    -- Add control_point_2_y column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' AND column_name = 'control_point_2_y'
    ) THEN
        ALTER TABLE connections ADD COLUMN control_point_2_y DOUBLE PRECISION;
    END IF;
END $$;
