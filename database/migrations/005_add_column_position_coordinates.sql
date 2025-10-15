-- Migration: Add x and y position coordinates to columns table
-- This enables free-form positioning of columns on the board (like PowerPoint slide editing)
-- Columns can be dragged and placed anywhere on the board canvas

-- Add x coordinate column (horizontal position in pixels)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'columns' AND column_name = 'x'
    ) THEN
        ALTER TABLE columns ADD COLUMN x INTEGER DEFAULT 0;
        COMMENT ON COLUMN columns.x IS 'Horizontal position in pixels for free-form column placement';
    END IF;
END $$;

-- Add y coordinate column (vertical position in pixels)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'columns' AND column_name = 'y'
    ) THEN
        ALTER TABLE columns ADD COLUMN y INTEGER DEFAULT 0;
        COMMENT ON COLUMN columns.y IS 'Vertical position in pixels for free-form column placement';
    END IF;
END $$;

-- Backfill existing columns with default positions based on their order
-- This ensures existing columns are spaced horizontally (320px apart) at y=0
UPDATE columns
SET x = order_num * 320, y = 0
WHERE x IS NULL OR x = 0;
