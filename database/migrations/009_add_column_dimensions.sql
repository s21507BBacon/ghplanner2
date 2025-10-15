-- Migration: Add width and height columns for resizable columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'columns'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'columns' AND column_name = 'width'
        ) THEN
            ALTER TABLE columns ADD COLUMN width INTEGER;
            COMMENT ON COLUMN columns.width IS 'Column width in pixels';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'columns' AND column_name = 'height'
        ) THEN
            ALTER TABLE columns ADD COLUMN height INTEGER;
            COMMENT ON COLUMN columns.height IS 'Column height in pixels';
        END IF;
    END IF;
END $$;
