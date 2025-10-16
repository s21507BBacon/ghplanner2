-- Add style and arrowType columns to connections table for enhanced arrow styling
DO $$
BEGIN
    -- Add style column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' 
        AND column_name = 'style'
    ) THEN
        ALTER TABLE connections ADD COLUMN style TEXT DEFAULT 'solid';
    END IF;

    -- Add arrow_type column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' 
        AND column_name = 'arrow_type'
    ) THEN
        ALTER TABLE connections ADD COLUMN arrow_type TEXT DEFAULT 'single';
    END IF;
END $$;

-- Add check constraints to ensure valid values
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_style_check;
ALTER TABLE connections ADD CONSTRAINT connections_style_check 
    CHECK (style IN ('solid', 'dashed', 'dotted'));

ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_arrow_type_check;
ALTER TABLE connections ADD CONSTRAINT connections_arrow_type_check 
    CHECK (arrow_type IN ('single', 'double', 'none'));
